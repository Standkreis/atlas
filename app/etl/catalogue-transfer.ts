/** Stream the reviewed, non-personal catalogue payload as deterministic JSON Lines. */
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, unlink } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { once } from 'node:events'
import { Client } from 'pg'

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
type Page = Array<Record<string, unknown>>

export type TransferTable = { table: string; columns: string[]; rows: number; digest: string }
export type TransferArtifact = { file: string; sha256: string; bytes: number; rows: number }
export type TransferExport = { artifact: TransferArtifact; tables: TransferTable[] }

export type TransferSpec = {
  table: string
  columns: string[]
  sql: string
}

function jsonValue(value: unknown): Json {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('cannot serialize a non-finite transfer number')
    return value
  }
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(jsonValue)
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => [key, jsonValue(item)]))
  throw new Error(`cannot serialize transfer value ${typeof value}`)
}

const canonical = (value: unknown) => JSON.stringify(jsonValue(value))

function checkedRow(spec: TransferSpec, row: Record<string, unknown>) {
  const actual = Object.keys(row).sort()
  const expected = [...spec.columns].sort()
  if (canonical(actual) !== canonical(expected)) {
    throw new Error(`transfer selection for ${spec.table} returned columns ${actual.join(', ')}; expected ${expected.join(', ')}`)
  }
  return Object.fromEntries(spec.columns.map((column) => [column, row[column]]))
}

// Every statement is static and scoped through the selected catalogue. Personal tables and Asset
// are intentionally absent. ORDER BY is a stable primary-key order for incremental hashing.
export const TRANSFER_SPECS: TransferSpec[] = [
  {
    table: 'Region',
    columns: ['id', 'gadmGid', 'canonicalKey', 'countryCode', 'name', 'higher', 'monthTotals', 'status', 'error', 'refreshedAt', 'createdAt', 'pickerSummary'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT r.* FROM "Region" r JOIN "RegionRegistryEntry" e ON e."regionId"=r.id WHERE e."registryVersionId"=(SELECT "registryVersionId" FROM "CatalogueVersion" WHERE id=$1) ORDER BY r.id LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'RegionRegistryVersion',
    columns: ['id', 'countryCode', 'version', 'artifactSha256', 'expectedRegions', 'expectedSourceUnits', 'active', 'importedAt', 'activatedAt'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT r.* FROM "RegionRegistryVersion" r WHERE r.id=(SELECT "registryVersionId" FROM "CatalogueVersion" WHERE id=$1) ORDER BY r.id LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'RegionRegistrySource',
    columns: ['id', 'registryVersionId', 'role', 'name', 'url', 'topicDate', 'downloadedAt', 'sha256', 'licenceId', 'licenceUrl', 'attribution', 'metadata'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT s.* FROM "RegionRegistrySource" s WHERE s."registryVersionId"=(SELECT "registryVersionId" FROM "CatalogueVersion" WHERE id=$1) ORDER BY s.id LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'RegionRegistryEntry',
    columns: ['id', 'registryVersionId', 'sourceId', 'regionId', 'sourceCode', 'sourceName', 'displayName', 'stateCode', 'stateName'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT e.* FROM "RegionRegistryEntry" e WHERE e."registryVersionId"=(SELECT "registryVersionId" FROM "CatalogueVersion" WHERE id=$1) ORDER BY e.id LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'RegionRegistryAlias',
    columns: ['id', 'registryEntryId', 'kind', 'name', 'normalizedName'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT a.* FROM "RegionRegistryAlias" a JOIN "RegionRegistryEntry" e ON e.id=a."registryEntryId" WHERE e."registryVersionId"=(SELECT "registryVersionId" FROM "CatalogueVersion" WHERE id=$1) ORDER BY a.id LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'RegionSourceUnit',
    columns: ['id', 'registryVersionId', 'registryEntryId', 'sourceId', 'canonicalKey', 'sourceCode', 'name', 'kind'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT u.* FROM "RegionSourceUnit" u WHERE u."registryVersionId"=(SELECT "registryVersionId" FROM "CatalogueVersion" WHERE id=$1) ORDER BY u.id LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'RegionQueryUnit',
    columns: ['id', 'registryVersionId', 'sourceUnitId', 'sourceId', 'provider', 'providerVersion', 'providerKey', 'reviewStatus', 'reviewedAt', 'evidence'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT q.* FROM "RegionQueryUnit" q WHERE q."registryVersionId"=(SELECT "registryVersionId" FROM "CatalogueVersion" WHERE id=$1) ORDER BY q.id LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'Taxon',
    columns: ['id', 'gbifKey', 'wikidataId', 'sciName', 'commonNames', 'rank', 'tile', 'class', 'order', 'genus', 'iucn', 'tags', 'intro', 'facts', 'factsAt', 'prose', 'namePath', 'contentAt', 'updatedAt'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT t.* FROM "Taxon" t JOIN "CatalogueTaxon" c ON c."taxonId"=t.id WHERE c."catalogueVersionId"=$1 ORDER BY t.id LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'CatalogueVersion',
    columns: ['id', 'countryCode', 'runKey', 'registryVersionId', 'inputFingerprint', 'sourceFingerprint', 'responseFingerprint', 'unionFingerprint', 'plausibleRulesVersion', 'tileMappingVersion', 'observationWindowVersion', 'yearFrom', 'yearTo', 'occurrencePredicates', 'status', 'expectedRegions', 'completedRegions', 'unionTaxa', 'startedAt', 'generatedAt', 'auditedAt', 'activatedAt', 'executionOwner', 'executionExpiresAt', 'updatedAt'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT c.* FROM "CatalogueVersion" c WHERE c.id=$1 ORDER BY c.id LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'CatalogueRegionBuild',
    columns: ['id', 'catalogueVersionId', 'registryVersionId', 'registryEntryId', 'status', 'attempts', 'leaseOwner', 'leaseExpiresAt', 'startedAt', 'completedAt', 'error', 'totalObservations', 'monthTotals', 'regionSize', 'perTile', 'nowCounts', 'rejectedTaxa', 'requestStats', 'responseFingerprint', 'setFingerprint', 'createdAt', 'updatedAt'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT b.* FROM "CatalogueRegionBuild" b WHERE b."catalogueVersionId"=$1 ORDER BY b.id LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'CataloguePlausibility',
    columns: ['id', 'regionBuildId', 'taxonId', 'obs', 'monthShare', 'peak', 'words'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT p.* FROM "CataloguePlausibility" p JOIN "CatalogueRegionBuild" b ON b.id=p."regionBuildId" WHERE b."catalogueVersionId"=$1 ORDER BY p.id LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'CatalogueLookalike',
    columns: ['id', 'regionBuildId', 'taxonId', 'siblingId'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT l.* FROM "CatalogueLookalike" l JOIN "CatalogueRegionBuild" b ON b.id=l."regionBuildId" WHERE b."catalogueVersionId"=$1 ORDER BY l.id LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'CatalogueTaxon',
    columns: ['catalogueVersionId', 'taxonId', 'createdAt'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT c.* FROM "CatalogueTaxon" c WHERE c."catalogueVersionId"=$1 ORDER BY c."taxonId" LIMIT $2 OFFSET $3) x`,
  },
  {
    table: 'CatalogueTaxonomyResolution',
    columns: ['catalogueVersionId', 'sourceKey', 'record', 'recordFingerprint', 'acceptedKey', 'rejectionReason', 'resolvedAt'],
    sql: `SELECT to_jsonb(x) AS row FROM (SELECT t.* FROM "CatalogueTaxonomyResolution" t WHERE t."catalogueVersionId"=$1 ORDER BY t."sourceKey" LIMIT $2 OFFSET $3) x`,
  },
]

type FetchPage = (spec: TransferSpec, limit: number, offset: number) => Promise<Page>

async function write(stream: ReturnType<typeof createWriteStream>, hash: ReturnType<typeof createHash>, text: string) {
  hash.update(text)
  if (!stream.write(text, 'utf8')) await once(stream, 'drain')
}

/** Paged and incrementally hashed; no table payload or canonical table JSON is retained in memory. */
export async function writeTransferJsonl(options: {
  catalogueId: string
  path: string
  specs?: TransferSpec[]
  pageSize?: number
  fetchPage: FetchPage
}): Promise<TransferExport> {
  const path = resolve(options.path), temporary = `${path}.partial-${process.pid}`
  const pageSize = options.pageSize ?? 1_000
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 5_000) throw new Error('transfer pageSize must be 1 to 5000')
  await mkdir(dirname(path), { recursive: true })
  const stream = createWriteStream(temporary, { encoding: 'utf8' })
  const artifactHash = createHash('sha256')
  let bytes = 0, totalRows = 0
  const tables: TransferTable[] = []
  const output = async (value: unknown) => {
    const line = `${canonical(value)}\n`
    bytes += Buffer.byteLength(line)
    await write(stream, artifactHash, line)
  }
  try {
    await output({ type: 'standkreis-catalogue-transfer', schemaVersion: 1, catalogueId: options.catalogueId })
    for (const spec of options.specs ?? TRANSFER_SPECS) {
      await output({ type: 'table', table: spec.table, columns: spec.columns })
      const tableHash = createHash('sha256')
      tableHash.update('[')
      let rows = 0
      for (let offset = 0; ; offset += pageSize) {
        const page = await options.fetchPage(spec, pageSize, offset)
        for (const fetched of page) {
          const row = checkedRow(spec, fetched)
          const encoded = canonical(row)
          if (rows) tableHash.update(',')
          tableHash.update(encoded)
          await output({ type: 'row', table: spec.table, row })
          rows++; totalRows++
        }
        if (page.length < pageSize) break
      }
      tableHash.update(']')
      tables.push({ table: spec.table, columns: spec.columns, rows, digest: tableHash.digest('hex') })
    }
    stream.end()
    await once(stream, 'finish')
    await rename(temporary, path)
    return { artifact: { file: path.split('/').at(-1)!, sha256: artifactHash.digest('hex'), bytes, rows: totalRows }, tables }
  } catch (error) {
    stream.destroy()
    await unlink(temporary).catch(() => undefined)
    throw error
  }
}

export async function exportLocalCatalogueArtifact(options: { catalogueId: string; path: string; pageSize?: number }): Promise<TransferExport> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('catalogue export requires an explicit local DATABASE_URL')
  const hostname = new URL(connectionString).hostname
  if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) throw new Error(`catalogue export is local-only; database host ${hostname} is not local`)
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const state = await client.query('SELECT status FROM "CatalogueVersion" WHERE id=$1', [options.catalogueId])
    if (state.rows[0]?.status !== 'active') throw new Error('only the active, post-audit catalogue can be exported')
    const result = await writeTransferJsonl({
      catalogueId: options.catalogueId,
      path: options.path,
      pageSize: options.pageSize,
      fetchPage: async (spec, limit, offset) => {
        const page = await client.query<{ row: Record<string, unknown> }>(spec.sql, [options.catalogueId, limit, offset])
        return page.rows.map((item) => item.row)
      },
    })
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    await client.end()
  }
}
