import { randomUUID } from 'node:crypto'
import { db } from './db'
import type { Prisma } from '../src/generated/prisma/client'

export type TaxonWorkKey = { taxonId: string; kind: string; version: string }
export type TaxonWorkOutcome = {
  resultSummary?: Prisma.InputJsonValue
  sourceFingerprint?: string
  /** Runs under the live work-row lock, in the same transaction as completion. */
  publish?: (tx: Prisma.TransactionClient) => Promise<void>
}
export type TaxonWorkWorker = (key: TaxonWorkKey, signal: AbortSignal) => Promise<TaxonWorkOutcome | void>

export type TaxonWorkStore = {
  taxonIds(catalogueVersionId: string): Promise<string[]>
  seed(keys: TaxonWorkKey[]): Promise<void>
  claim(catalogueVersionId: string, kind: string, version: string, owner: string, now: Date, leaseUntil: Date, exclude: Set<string>, allowList?: string[]): Promise<string | null>
  renew(key: TaxonWorkKey, owner: string, now: Date, leaseUntil: Date): Promise<boolean>
  complete(key: TaxonWorkKey, owner: string, at: Date, outcome: TaxonWorkOutcome): Promise<boolean>
  fail(key: TaxonWorkKey, owner: string, at: Date, error: string): Promise<boolean>
  counts(catalogueVersionId: string, kind: string, version: string, allowList?: string[]): Promise<Record<string, number>>
}

const prismaStore: TaxonWorkStore = {
  async taxonIds(catalogueVersionId) {
    const catalogue = await db.catalogueVersion.findUnique({ where: { id: catalogueVersionId }, select: { status: true } })
    if (!catalogue || !['complete', 'audited', 'active'].includes(catalogue.status)) {
      throw new Error(`catalogue ${catalogueVersionId} must be complete before global taxon work`)
    }
    const rows = await db.catalogueTaxon.findMany({ where: { catalogueVersionId }, select: { taxonId: true } })
    return rows.map((row) => row.taxonId)
  },
  async seed(keys) {
    if (keys.length === 0) return
    await db.taxonEnrichmentWork.createMany({ data: keys, skipDuplicates: true })
  },
  async claim(catalogueVersionId, kind, version, owner, now, leaseUntil, exclude, allowList) {
    // The CTE locks one eligible row before changing it. This is safe when several
    // CLI processes resume the same work set concurrently.
    const blocked = [...exclude]
    const placeholders = blocked.map((_, i) => `$${i + 8}`).join(', ')
    const notIn = blocked.length ? `AND w."taxonId" NOT IN (${placeholders})` : ''
    const rows = await db.$queryRawUnsafe<{ taxonId: string }[]>(
      `WITH next AS (
         SELECT w."taxonId" FROM "TaxonEnrichmentWork" w
         JOIN "CatalogueTaxon" c ON c."taxonId" = w."taxonId" AND c."catalogueVersionId" = $1
         WHERE w."kind" = $2 AND w."version" = $3
           AND ($7::text[] IS NULL OR w."taxonId" = ANY($7::text[]))
           AND (w."status" IN ('pending', 'failed') OR (w."status" = 'running' AND w."leaseExpiresAt" <= $4))
           ${notIn}
         ORDER BY w."updatedAt", w."taxonId"
         FOR UPDATE OF w SKIP LOCKED LIMIT 1
       )
       UPDATE "TaxonEnrichmentWork" w
       SET "status" = 'running', "leaseOwner" = $5, "leaseExpiresAt" = $6,
           "startedAt" = COALESCE("startedAt", CURRENT_TIMESTAMP), "attempts" = "attempts" + 1,
           "error" = NULL, "updatedAt" = CURRENT_TIMESTAMP
       FROM next WHERE w."taxonId" = next."taxonId" AND w."kind" = $2 AND w."version" = $3
       RETURNING w."taxonId"`, catalogueVersionId, kind, version, now, owner, leaseUntil, allowList ?? null, ...blocked,
    )
    // Parameters are deliberately passed in the order used by the SQL above.
    // (The adapter accepts Date values; leaseUntil is the expiry stored in the row.)
    return rows[0]?.taxonId ?? null
  },
  async renew(key, owner, now, leaseUntil) {
    const result = await db.taxonEnrichmentWork.updateMany({
      where: { ...key, status: 'running', leaseOwner: owner, leaseExpiresAt: { gt: now } },
      data: { leaseExpiresAt: leaseUntil },
    })
    return result.count === 1
  },
  async complete(key, owner, at, outcome) {
    return db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ taxonId: string }[]>`
        SELECT "taxonId" FROM "TaxonEnrichmentWork"
        WHERE "taxonId" = ${key.taxonId} AND "kind" = ${key.kind} AND "version" = ${key.version}
          AND "status" = 'running' AND "leaseOwner" = ${owner} AND "leaseExpiresAt" > GREATEST(${at}, clock_timestamp())
        FOR UPDATE
      `
      if (!locked.length) return false
      await outcome.publish?.(tx)
      const r = await tx.taxonEnrichmentWork.updateMany({
        where: { ...key, status: 'running', leaseOwner: owner, leaseExpiresAt: { gt: at } },
        data: {
          status: 'complete', completedAt: at, leaseOwner: null, leaseExpiresAt: null, error: null,
          ...(outcome.resultSummary !== undefined ? { resultSummary: outcome.resultSummary } : {}),
          ...(outcome.sourceFingerprint !== undefined ? { sourceFingerprint: outcome.sourceFingerprint } : {}),
        },
      })
      return r.count === 1
    })
  },
  async fail(key, owner, at, error) {
    const r = await db.taxonEnrichmentWork.updateMany({ where: { ...key, status: 'running', leaseOwner: owner, leaseExpiresAt: { gt: at } }, data: { status: 'failed', completedAt: null, leaseOwner: null, leaseExpiresAt: null, error: error.slice(0, 2000) } })
    return r.count === 1
  },
  async counts(catalogueVersionId, kind, version, allowList) {
    const members = await db.catalogueTaxon.findMany({ where: { catalogueVersionId, ...(allowList ? { taxonId: { in: allowList } } : {}) }, select: { taxonId: true } })
    const rows = await db.taxonEnrichmentWork.groupBy({ by: ['status'], where: { kind, version, taxonId: { in: members.map((row) => row.taxonId) } }, _count: { _all: true } })
    return Object.fromEntries(rows.map((row) => [row.status, row._count._all]))
  },
}

export type TaxonWorkOptions = {
  catalogueVersionId: string
  kind: string
  version: string
  worker: TaxonWorkWorker
  store?: TaxonWorkStore
  owner?: string
  now?: () => Date
  leaseMs?: number
  concurrency?: number
  /** Explicit subset validated against the completed union, also enforced by SQL claim. */
  taxonIds?: string[]
  /** Maximum new attempts, so repeated limited runs advance past completed work. */
  limit?: number
  onComplete?: (key: TaxonWorkKey, outcome: TaxonWorkOutcome) => void
}

export type TaxonWorkResult = {
  seeded: number
  attempted: number
  completed: number
  failed: number
  lost: number
  counts: Record<string, number>
  owner: string
  kind: string
  version: string
}

/** Seed and run one bounded, global enrichment phase over a finalized catalogue union. */
export async function runTaxonWork(options: TaxonWorkOptions): Promise<TaxonWorkResult> {
  if (!options.kind || !options.version) throw new Error('taxon work kind and version are required')
  const concurrency = options.concurrency ?? 2
  const leaseMs = options.leaseMs ?? 15 * 60_000
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error('taxon work concurrency must be an integer from 1 to 8')
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 1_000) throw new Error('taxon work leaseMs must be at least 1000 ms')
  if (options.limit !== undefined && (!Number.isSafeInteger(options.limit) || options.limit < 1)) throw new Error('taxon work limit must be a positive integer')
  const now = options.now ?? (() => new Date())
  const owner = options.owner ?? randomUUID()
  const store = options.store ?? prismaStore
  const members = new Set(await store.taxonIds(options.catalogueVersionId))
  const taxonIds = [...new Set(options.taxonIds ?? members)]
  if (taxonIds.some((id) => !members.has(id))) throw new Error('taxon work scope contains taxa outside the completed catalogue')
  const keys = taxonIds.map((taxonId) => ({ taxonId, kind: options.kind, version: options.version }))
  await store.seed(keys)
  const attempted = new Set<string>()
  let completed = 0, failed = 0, lost = 0
  let remaining = options.limit ?? Infinity
  const take = async () => {
    while (true) {
      if (remaining <= 0) return
      remaining--
      const at = now()
      const taxonId = await store.claim(options.catalogueVersionId, options.kind, options.version, owner, at, new Date(at.getTime() + leaseMs), attempted, taxonIds)
      if (!taxonId) return
      attempted.add(taxonId)
      const key = { taxonId, kind: options.kind, version: options.version }
      const controller = new AbortController()
      let leaseLost = false
      let heartbeatBusy = false
      const heartbeatEvery = Math.max(250, Math.floor(leaseMs / 3))
      const heartbeat = setInterval(() => {
        if (heartbeatBusy || leaseLost) return
        heartbeatBusy = true
        const heartbeatAt = now()
        void store.renew(key, owner, heartbeatAt, new Date(heartbeatAt.getTime() + leaseMs))
          .then((ok) => {
            if (!ok) { leaseLost = true; controller.abort(new Error(`taxon work lease lost for ${taxonId}`)) }
          })
          .catch((error) => { leaseLost = true; controller.abort(error) })
          .finally(() => { heartbeatBusy = false })
      }, heartbeatEvery)
      heartbeat.unref?.()
      try {
        const outcome = (await options.worker(key, controller.signal)) ?? {}
        if (leaseLost || controller.signal.aborted) lost++
        else if (await store.complete(key, owner, now(), outcome)) { completed++; options.onComplete?.(key, outcome) }
        else lost++
      } catch (error) {
        if (leaseLost || controller.signal.aborted) lost++
        else {
          const message = error instanceof Error ? error.message : String(error)
          if (await store.fail(key, owner, now(), message)) failed++
          else lost++
        }
      } finally {
        clearInterval(heartbeat)
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, take))
  return { seeded: keys.length, attempted: attempted.size, completed, failed, lost, counts: await store.counts(options.catalogueVersionId, options.kind, options.version, taxonIds), owner, kind: options.kind, version: options.version }
}

export { prismaStore }
