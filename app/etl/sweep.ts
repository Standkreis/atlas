import pg from 'pg'
import { db } from './db'
import { runRegion } from './region'
import { runContent } from './content'
import { sweep as cleanup } from '../src/server/sweep'

/** CLI-only backlog repair. Session lock avoids keeping a database transaction open during HTTP work. */
export async function sweep(log: (s: string) => void = console.log) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex' })
  await client.connect()
  try {
    const { rows: [{ locked }] } = await client.query('SELECT pg_try_advisory_lock(233135852) AS locked')
    if (!locked) return null
    const started = Date.now()
    const queued = await db.region.findMany({ where: { status: 'queued', createdAt: { lt: new Date(Date.now() - 300_000) } }, select: { gadmGid: true } })
    const regions: string[] = []
    for (const region of queued) {
      await runRegion(region.gadmGid, log)
      regions.push(region.gadmGid)
    }
    const missing = await db.taxon.findMany({ where: { contentAt: null, OR: [{ plausibility: { some: { region: { status: 'ready' } } } }, { sightings: { some: {} } }] }, select: { gbifKey: true }, orderBy: { gbifKey: 'asc' } })
    let contentDone = 0, contentFailed = 0
    for (let i = 0; i < missing.length; i += 20) {
      const result = await runContent({ keys: missing.slice(i, i + 20).map((t) => t.gbifKey), log })
      contentDone += result.done; contentFailed += result.failed
    }
    return { ...await cleanup(log), regions, content: missing.length, contentDone, contentFailed, seconds: (Date.now() - started) / 1000 }
  } finally { await client.end() }
}
