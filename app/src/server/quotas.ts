import { createHmac, createHash, randomUUID } from 'node:crypto'
import { TRPCError } from '@trpc/server'
import type { Prisma } from '../generated/prisma/client'
import { db } from './db'
import { env } from './env'

type Tx = Prisma.TransactionClient
const limit = (name: string, fallback: number) => {
  const n = Number(process.env[name] ?? fallback)
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`${name} must be a nonnegative integer`)
  return n
}
export const limits = {
  scansIdentity: limit('SCAN_IDENTITY_DAILY', 20), scansNetwork: limit('SCAN_NETWORK_DAILY', 100), scansGlobal: limit('SCAN_GLOBAL_DAILY', 500),
  scanConcurrency: limit('SCAN_GLOBAL_CONCURRENCY', 4), scanDailyCents: limit('SCAN_DAILY_BUDGET_CENTS', 1000), scanMonthlyCents: limit('SCAN_MONTHLY_BUDGET_CENTS', 30000),
  uploadsIdentity: limit('UPLOAD_IDENTITY_DAILY', 50), uploadsNetwork: limit('UPLOAD_NETWORK_DAILY', 200), uploadsGlobal: limit('UPLOAD_GLOBAL_DAILY', 2000),
  storageIdentity: limit('UPLOAD_IDENTITY_STORAGE_BYTES', 256 * 1024 * 1024), storageGlobal: limit('UPLOAD_GLOBAL_STORAGE_BYTES', 10 * 1024 * 1024 * 1024),
}
/** Only a platform-overwritten header is trusted. Self-hosts share a conservative fallback bucket until explicitly configured. */
export function networkKey(headers: Headers) {
  const address = process.env.VERCEL === '1' ? headers.get('x-vercel-forwarded-for') : process.env.TRUST_PROXY_IP_HEADER ? headers.get(process.env.TRUST_PROXY_IP_HEADER) : null
  return createHmac('sha256', env.WEBAUTHN_SECRET).update(address?.split(',')[0]?.trim() || 'unattributed').digest('hex')
}
export async function lock(tx: Tx, key: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`
}
export async function consume(tx: Tx, key: string, amount: number, maximum: number, expiresAt: Date) {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "QuotaBucket" ("key", "value", "expiresAt") VALUES (${key}, ${amount}, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET "value" = "QuotaBucket"."value" + EXCLUDED."value"
    WHERE "QuotaBucket"."value" + EXCLUDED."value" <= ${maximum}
    RETURNING "value"`
  if (amount > maximum || !rows.length) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Application allowance reached. Try again later.' })
}
export async function dailyAllowance(tx: Tx, kind: 'scan' | 'upload', identity: string, network: string) {
  const day = new Date().toISOString().slice(0, 10), expiry = new Date(Date.now() + 32 * 86400000)
  const caps = kind === 'scan' ? [limits.scansIdentity, limits.scansNetwork, limits.scansGlobal] : [limits.uploadsIdentity, limits.uploadsNetwork, limits.uploadsGlobal]
  for (const [scope, cap] of [[`identity:${identity}`, caps[0]], [`network:${network}`, caps[1]], ['global', caps[2]]] as const) await consume(tx, `${kind}:${day}:${scope}`, 1, cap, expiry)
}

/** A durable lease coalesces across instances. Failed/ambiguous calls retain their conservative budget reservation. */
export async function boundedScan<T>({ photoId, version, identity, network, reserveCents, run }: { photoId: string; version: string; identity: string; network: string; reserveCents: number; run: () => Promise<T> }): Promise<T> {
  const key = createHash('sha256').update(`${photoId}:${version}`).digest('hex'), token = randomUUID()
  const activeKey = `scan-active:${identity}:${token}`
  const cached = await db.$transaction(async (tx) => {
    await lock(tx, 'scan-admission')
    const existing = await tx.scanWork.findUnique({ where: { key } })
    if (existing?.result !== null && existing?.result !== undefined) return { result: existing.result as T }
    if (existing && existing.leaseUntil > new Date()) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'This photo is already being identified. Retry shortly.' })
    // Keep admission leases outside the asset cascade: deleting a photo cannot free a running slot.
    const active = await tx.quotaBucket.count({ where: { key: { startsWith: 'scan-active:' }, expiresAt: { gt: new Date() } } })
    const ownActive = await tx.quotaBucket.count({ where: { key: { startsWith: `scan-active:${identity}:` }, expiresAt: { gt: new Date() } } })
    if (active >= limits.scanConcurrency || ownActive >= 1) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Identification is busy. Retry shortly.' })
    await dailyAllowance(tx, 'scan', identity, network)
    const now = new Date().toISOString(), expiry = new Date(Date.now() + 62 * 86400000)
    await consume(tx, `scan-budget:day:${now.slice(0, 10)}`, reserveCents, limits.scanDailyCents, expiry)
    await consume(tx, `scan-budget:month:${now.slice(0, 7)}`, reserveCents, limits.scanMonthlyCents, expiry)
    await tx.quotaBucket.create({ data: { key: activeKey, value: 1, expiresAt: new Date(Date.now() + 120000) } })
    await tx.scanWork.upsert({ where: { key }, create: { key, photoId, identityId: identity, token, leaseUntil: new Date(Date.now() + 120000) }, update: { token, leaseUntil: new Date(Date.now() + 120000), identityId: identity } })
    return null
  })
  if (cached) return cached.result
  try {
    const result = await run()
    await db.scanWork.updateMany({ where: { key, token }, data: { result: result as Prisma.InputJsonValue, leaseUntil: new Date(0) } })
    return result
  } catch (error) {
    await db.scanWork.updateMany({ where: { key, token }, data: { leaseUntil: new Date(0) } })
    throw error
  } finally {
    await db.quotaBucket.deleteMany({ where: { key: activeKey } })
  }
}

export async function cleanupQuotas() {
  await db.quotaBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } })
}
