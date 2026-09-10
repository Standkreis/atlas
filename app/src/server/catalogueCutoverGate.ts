import { randomUUID } from 'node:crypto'
import { TRPCError } from '@trpc/server'
import type { Prisma, PrismaClient } from '../generated/prisma/client'

export const GERMANY_CATALOGUE_COUNTRY = 'DE'
export const CATALOGUE_GATE_OPEN = 'open'
export const CATALOGUE_GATE_MAINTENANCE = 'maintenance'
const LOCK_PREFIX = 'catalogue-cutover:'

type Db = PrismaClient
type Tx = Prisma.TransactionClient
type AdmissionKind = string

export const catalogueMaintenanceError = () => new TRPCError({
  code: 'SERVICE_UNAVAILABLE',
  message: 'The catalogue is being updated. Your saved work is safe; try again shortly.',
})

const sharedLock = (tx: Tx, countryCode: string) =>
  tx.$queryRaw`SELECT pg_advisory_xact_lock_shared(hashtextextended(${LOCK_PREFIX + countryCode}, 0))::text`
const exclusiveLock = (tx: Tx, countryCode: string) =>
  tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${LOCK_PREFIX + countryCode}, 0))::text`

/** Missing state is deliberately open for old databases immediately after the additive migration. */
export async function readCatalogueCutoverState(db: Pick<Db, 'catalogueCutoverGate' | 'catalogueWriteAdmission'>, countryCode = GERMANY_CATALOGUE_COUNTRY) {
  const [gate, activeWrites] = await Promise.all([
    db.catalogueCutoverGate.findUnique({ where: { countryCode } }),
    db.catalogueWriteAdmission.count({ where: { countryCode } }),
  ])
  return {
    countryCode,
    state: gate?.state === CATALOGUE_GATE_MAINTENANCE ? CATALOGUE_GATE_MAINTENANCE : CATALOGUE_GATE_OPEN,
    targetCatalogueId: gate?.targetCatalogueId ?? null,
    operationId: gate?.operationId ?? null,
    maintenanceSince: gate?.maintenanceSince ?? null,
    activeWrites,
  }
}

/**
 * Admit work under the same distributed advisory-lock boundary used by cutover. The durable
 * row remains until the complete external operation (including result publication/cleanup)
 * finishes. There is intentionally no timeout that could let cutover overtake live work.
 */
export async function admitCatalogueWrite(
  db: Db,
  kind: AdmissionKind,
  options: { countryCode?: string; identityId?: string; detail?: Prisma.InputJsonValue } = {},
) {
  const countryCode = options.countryCode ?? GERMANY_CATALOGUE_COUNTRY
  const id = randomUUID()
  await db.$transaction(async (tx) => {
    await sharedLock(tx, countryCode)
    const gate = await tx.catalogueCutoverGate.upsert({
      where: { countryCode },
      create: { countryCode },
      update: {},
      select: { state: true },
    })
    if (gate.state !== CATALOGUE_GATE_OPEN) throw catalogueMaintenanceError()
    await tx.catalogueWriteAdmission.create({
      data: { id, countryCode, kind, identityId: options.identityId, detail: options.detail },
    })
  })
  return { id, countryCode, kind }
}

export async function releaseCatalogueWrite(db: Db, id: string) {
  await db.catalogueWriteAdmission.deleteMany({ where: { id } })
}

export async function withCatalogueWriteAdmission<T>(
  db: Db,
  kind: AdmissionKind,
  options: { countryCode?: string; identityId?: string; detail?: Prisma.InputJsonValue },
  run: (admissionId: string) => Promise<T>,
): Promise<T> {
  const admission = await admitCatalogueWrite(db, kind, options)
  try {
    return await run(admission.id)
  } finally {
    await releaseCatalogueWrite(db, admission.id)
  }
}

/**
 * #63 maintenance primitive. Commit this in its own short transaction, then wait for the
 * durable admission rows to drain before beginning the serializable live-cutover transaction.
 * The exclusive lock orders this transition after every admission transaction; work admitted
 * earlier is represented by a row and must be drained before the live cutover commits.
 */
export async function closeCatalogueGate(
  tx: Tx,
  input: { countryCode?: string; operationId: string; targetCatalogueId: string },
) {
  const countryCode = input.countryCode ?? GERMANY_CATALOGUE_COUNTRY
  await exclusiveLock(tx, countryCode)
  const current = await tx.catalogueCutoverGate.findUnique({ where: { countryCode } })
  if (current?.state === CATALOGUE_GATE_MAINTENANCE) {
    if (current.operationId !== input.operationId || current.targetCatalogueId !== input.targetCatalogueId) {
      throw new Error(`catalogue maintenance already owned by ${current.operationId ?? 'unknown'}`)
    }
    return current
  }
  return tx.catalogueCutoverGate.upsert({
    where: { countryCode },
    create: {
      countryCode,
      state: CATALOGUE_GATE_MAINTENANCE,
      operationId: input.operationId,
      targetCatalogueId: input.targetCatalogueId,
      maintenanceSince: new Date(),
    },
    update: {
      state: CATALOGUE_GATE_MAINTENANCE,
      operationId: input.operationId,
      targetCatalogueId: input.targetCatalogueId,
      maintenanceSince: new Date(),
    },
  })
}

/** Bounded evidence for the operator drain loop; rows are never silently expired. */
export async function catalogueWriteDrain(db: Db, countryCode = GERMANY_CATALOGUE_COUNTRY) {
  const [count, oldest] = await Promise.all([
    db.catalogueWriteAdmission.count({ where: { countryCode } }),
    db.catalogueWriteAdmission.findMany({
      where: { countryCode },
      orderBy: [{ admittedAt: 'asc' }, { id: 'asc' }],
      take: 20,
      select: { id: true, kind: true, identityId: true, detail: true, admittedAt: true },
    }),
  ])
  return { count, oldest }
}

/**
 * #63 calls this at the start of its serializable live-cutover transaction, after the
 * maintenance transaction has committed and the drain loop reports zero. Rechecking under the
 * exclusive lock closes the final race and binds the transaction to the reviewed owner/target.
 */
export async function requireDrainedCatalogueMaintenance(
  tx: Tx,
  input: { countryCode?: string; operationId: string; targetCatalogueId: string },
) {
  const countryCode = input.countryCode ?? GERMANY_CATALOGUE_COUNTRY
  await exclusiveLock(tx, countryCode)
  const gate = await tx.catalogueCutoverGate.findUnique({ where: { countryCode } })
  if (!gate || gate.state !== CATALOGUE_GATE_MAINTENANCE || gate.operationId !== input.operationId || gate.targetCatalogueId !== input.targetCatalogueId) {
    throw new Error('catalogue maintenance ownership or target changed')
  }
  const active = await tx.catalogueWriteAdmission.count({ where: { countryCode } })
  if (active) throw new Error(`catalogue write drain is not empty (${active})`)
  return gate
}

/**
 * #63 reopening primitive. A different owner or any admitted work fails closed. Call in the
 * same reviewed transaction that finalizes/rolls back the cutover state.
 */
export async function openCatalogueGate(tx: Tx, input: { countryCode?: string; operationId: string }) {
  const countryCode = input.countryCode ?? GERMANY_CATALOGUE_COUNTRY
  await exclusiveLock(tx, countryCode)
  const gate = await tx.catalogueCutoverGate.findUnique({ where: { countryCode } })
  if (!gate || gate.state === CATALOGUE_GATE_OPEN) return gate
  if (gate.operationId !== input.operationId) throw new Error(`catalogue maintenance owned by ${gate.operationId ?? 'unknown'}`)
  const active = await tx.catalogueWriteAdmission.count({ where: { countryCode } })
  if (active) throw new Error(`cannot open catalogue gate with ${active} admitted write(s)`)
  return tx.catalogueCutoverGate.update({
    where: { countryCode },
    data: { state: CATALOGUE_GATE_OPEN, targetCatalogueId: null, operationId: null, maintenanceSince: null },
  })
}
