/** Checked target snapshot, atomic catalogue apply, and guarded recovery for issue #63. */
import { contentDigest } from './catalogue-gallery-transfer'
import { catalogueImportDigest } from './catalogue-import-json'
import {
  CATALOGUE_APPLY_ORDER,
  CATALOGUE_TARGET_SNAPSHOT_TABLES,
  CATALOGUE_TARGET_PRIMARY_KEYS,
  assertCatalogueTargetPlan,
  catalogueTargetRowsFingerprint,
  type CatalogueTargetPlan,
  type CatalogueMutationKey,
  type PlannedCatalogueRowMutation,
  type CatalogueProtectionScope,
  type TargetCatalogueSnapshot,
  type CatalogueTargetRow,
  type CatalogueTargetTable,
} from './catalogue-import-plan'
import type { ValidatedCatalogueImport, ValidatedCatalogueReleaseImport } from './catalogue-import-validation'
import {
  GERMANY_CATALOGUE_COUNTRY,
  catalogueWriteDrain,
  closeCatalogueGate,
  openCatalogueGate,
  requireDrainedCatalogueMaintenance,
} from '../src/server/catalogueCutoverGate'
import type { Prisma, PrismaClient } from '../src/generated/prisma/client'

type Db = PrismaClient
type Tx = Prisma.TransactionClient

type TableContract = Readonly<{ keys: readonly string[]; columns: readonly string[] }>

/**
 * Complete fixed target surface. Gate/admission rows are deliberately excluded: their state is
 * controlled and checked through catalogueCutoverGate's advisory-lock protocol, not evidence.
 */
export const CATALOGUE_TARGET_TABLES = CATALOGUE_TARGET_SNAPSHOT_TABLES

const TABLES = {
  Identity: { keys: ['id'], columns: ['id', 'createdAt', 'email', 'emailVerifiedAt', 'displayName', 'avatarAssetId'] },
  EmailCode: { keys: ['id'], columns: ['id', 'identityId', 'email', 'codeHash', 'attempts', 'expiresAt', 'usedAt', 'createdAt', 'locale'] },
  Passkey: { keys: ['id'], columns: ['id', 'identityId', 'credentialId', 'publicKey', 'counter', 'transports', 'deviceName', 'createdAt', 'lastUsedAt'] },
  Filter: { keys: ['id'], columns: ['id', 'identityId', 'regionId', 'regionIds', 'tiles', 'nowOnly', 'updatedAt'] },
  Region: { keys: ['id'], columns: ['id', 'gadmGid', 'canonicalKey', 'countryCode', 'name', 'higher', 'monthTotals', 'pickerSummary', 'status', 'error', 'refreshedAt', 'createdAt'] },
  RegionRegistryVersion: { keys: ['id'], columns: ['id', 'countryCode', 'version', 'artifactSha256', 'expectedRegions', 'expectedSourceUnits', 'active', 'importedAt', 'activatedAt'] },
  RegionRegistrySource: { keys: ['id'], columns: ['id', 'registryVersionId', 'role', 'name', 'url', 'topicDate', 'downloadedAt', 'sha256', 'licenceId', 'licenceUrl', 'attribution', 'metadata'] },
  RegionRegistryEntry: { keys: ['id'], columns: ['id', 'registryVersionId', 'sourceId', 'regionId', 'sourceCode', 'sourceName', 'displayName', 'stateCode', 'stateName'] },
  RegionRegistryAlias: { keys: ['id'], columns: ['id', 'registryEntryId', 'kind', 'name', 'normalizedName'] },
  RegionSourceUnit: { keys: ['id'], columns: ['id', 'registryVersionId', 'registryEntryId', 'sourceId', 'canonicalKey', 'sourceCode', 'name', 'kind'] },
  RegionQueryUnit: { keys: ['id'], columns: ['id', 'registryVersionId', 'sourceUnitId', 'sourceId', 'provider', 'providerVersion', 'providerKey', 'reviewStatus', 'reviewedAt', 'evidence'] },
  CatalogueVersion: { keys: ['id'], columns: ['id', 'countryCode', 'runKey', 'registryVersionId', 'inputFingerprint', 'sourceFingerprint', 'responseFingerprint', 'unionFingerprint', 'plausibleRulesVersion', 'tileMappingVersion', 'habitatRulesVersion', 'habitatSource', 'observationWindowVersion', 'yearFrom', 'yearTo', 'occurrencePredicates', 'status', 'expectedRegions', 'completedRegions', 'unionTaxa', 'startedAt', 'generatedAt', 'auditedAt', 'activatedAt', 'executionOwner', 'executionExpiresAt', 'updatedAt'] },
  CatalogueRegionBuild: { keys: ['id'], columns: ['id', 'catalogueVersionId', 'registryVersionId', 'registryEntryId', 'status', 'attempts', 'leaseOwner', 'leaseExpiresAt', 'startedAt', 'completedAt', 'error', 'totalObservations', 'monthTotals', 'regionSize', 'nowCounts', 'perTile', 'rejectedTaxa', 'habitatSummary', 'requestStats', 'responseFingerprint', 'setFingerprint', 'createdAt', 'updatedAt'] },
  CataloguePlausibility: { keys: ['id'], columns: ['id', 'regionBuildId', 'taxonId', 'obs', 'monthShare', 'peak', 'words'] },
  CatalogueLookalike: { keys: ['id'], columns: ['id', 'regionBuildId', 'taxonId', 'siblingId'] },
  CatalogueTaxon: { keys: ['catalogueVersionId', 'taxonId'], columns: ['catalogueVersionId', 'taxonId', 'createdAt'] },
  CatalogueTaxonomyResolution: { keys: ['catalogueVersionId', 'sourceKey'], columns: ['catalogueVersionId', 'sourceKey', 'record', 'recordFingerprint', 'acceptedKey', 'rejectionReason', 'resolvedAt'] },
  CatalogueHabitatBatch: { keys: ['catalogueVersionId', 'requestFingerprint'], columns: ['catalogueVersionId', 'requestFingerprint', 'names', 'record', 'recordFingerprint', 'resolvedAt'] },
  TaxonEnrichmentWork: { keys: ['taxonId', 'kind', 'version'], columns: ['taxonId', 'kind', 'version', 'status', 'attempts', 'leaseOwner', 'leaseExpiresAt', 'startedAt', 'completedAt', 'error', 'resultSummary', 'sourceFingerprint', 'createdAt', 'updatedAt'] },
  Taxon: { keys: ['id'], columns: ['id', 'gbifKey', 'wikidataId', 'sciName', 'commonNames', 'rank', 'tile', 'class', 'order', 'genus', 'iucn', 'tags', 'intro', 'facts', 'factsAt', 'prose', 'namePath', 'contentAt', 'updatedAt'] },
  Plausibility: { keys: ['id'], columns: ['id', 'taxonId', 'regionId', 'obs', 'monthShare', 'peak', 'words'] },
  Lookalike: { keys: ['taxonId', 'regionId', 'siblingId'], columns: ['taxonId', 'regionId', 'siblingId'] },
  Interaction: { keys: ['id'], columns: ['id', 'sourceId', 'targetId', 'kind', 'origin', 'studies', 'real', 'prose'] },
  Asset: { keys: ['id'], columns: ['id', 'kind', 'url', 'author', 'licence', 'licenceUrl', 'sourceUrl', 'origin', 'caption', 'meta', 'position', 'createdAt', 'taxonId', 'sightingId', 'ownerId', 'byteSize'] },
  ReferenceAssetVisibility: { keys: ['assetId'], columns: ['assetId', 'catalogueVersionId', 'taxonId', 'eligible', 'targetPosition', 'hiddenReason', 'correctedLicenceUrl', 'sourceAssetFingerprint', 'evidence', 'evidenceFingerprint', 'reviewer', 'reviewedAt', 'createdAt'] },
  ReferenceGalleryReceipt: { keys: ['catalogueVersionId', 'taxonId'], columns: ['catalogueVersionId', 'taxonId', 'sourceSnapshot', 'sourceFingerprint', 'evidence', 'evidenceFingerprint', 'resultSnapshot', 'resultFingerprint', 'reviewer', 'reviewedAt', 'createdAt'] },
  Sighting: { keys: ['id'], columns: ['id', 'identityId', 'taxonId', 'at', 'lat', 'lng', 'place', 'note', 'evidence', 'wildness', 'createdAt'] },
  Study: { keys: ['id'], columns: ['id', 'identityId', 'taxonId', 'at', 'recapPassed'] },
  QuotaBucket: { keys: ['key'], columns: ['key', 'value', 'expiresAt'] },
  ScanWork: { keys: ['key'], columns: ['key', 'photoId', 'identityId', 'token', 'leaseUntil', 'result'] },
  PhotoDeletion: { keys: ['assetId'], columns: ['assetId', 'createdAt'] },
} as const satisfies Record<(typeof CATALOGUE_TARGET_TABLES)[number], TableContract>

const WRITE_TABLES = new Set<string>(Object.keys(CATALOGUE_TARGET_PRIMARY_KEYS))
const SHA256 = /^[a-f\d]{64}$/
const BATCH_SIZE = 1_000
const CATALOGUE_TRANSACTION_OPTIONS = { timeout: 120_000, maxWait: 30_000 } as const

function quote(identifier: string) { return `"${identifier}"` }
function tableContract(table: string): TableContract {
  const contract = TABLES[table as keyof typeof TABLES]
  if (!contract) throw new Error(`catalogue store does not allow table ${table}`)
  return contract
}
function writeContract(table: string): TableContract {
  if (!WRITE_TABLES.has(table)) throw new Error(`catalogue plan cannot write table ${table}`)
  return tableContract(table)
}
function jsonRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as Record<string, unknown>
}
function exactFields(value: Record<string, unknown>, fields: readonly string[], label: string) {
  const actual = Object.keys(value).sort(), expected = [...fields].sort()
  if (contentDigest(actual) !== contentDigest(expected)) throw new Error(`${label} fields do not match the fixed table contract`)
}
function keyText(value: Readonly<Record<string, unknown>>) { return JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) }
function readonlyMap<K, V>(source: Map<K, V>): ReadonlyMap<K, V> {
  const view: ReadonlyMap<K, V> = Object.freeze({
    get size() { return source.size }, has: (key: K) => source.has(key), get: (key: K) => source.get(key),
    keys: () => source.keys(), values: () => source.values(), entries: () => source.entries(),
    [Symbol.iterator]: () => source[Symbol.iterator](),
    forEach: (callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: unknown) =>
      source.forEach((value, key) => callback.call(thisArg, value, key, view)),
  })
  return view
}
function deepFreeze<T>(value: T, seen = new Set<object>()): T {
  if (!value || typeof value !== 'object' || seen.has(value as object)) return value
  seen.add(value as object)
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child, seen)
  return Object.freeze(value)
}

async function readAllRows(db: Pick<Tx, '$queryRawUnsafe'>, table: string): Promise<CatalogueTargetRow[]> {
  const contract = tableContract(table)
  const order = contract.keys.map((key) => `t.${quote(key)}`).join(', ')
  const result = await db.$queryRawUnsafe<{ row: CatalogueTargetRow }[]>(`SELECT to_jsonb(t) AS row FROM ${quote(table)} t ORDER BY ${order}`)
  return result.map(({ row }) => row)
}

/** One repeatable target snapshot; to_jsonb keeps database timestamp/date values as exact strings. */
export async function snapshotCatalogueTarget(db: Db): Promise<TargetCatalogueSnapshot> {
  return db.$transaction(async (tx) => {
    await boundCatalogueTransaction(tx)
    const tables = new Map<string, readonly CatalogueTargetRow[]>()
    for (const table of CATALOGUE_TARGET_TABLES) tables.set(table, deepFreeze(await readAllRows(tx, table)))
    return Object.freeze({ tables: readonlyMap(tables) }) as TargetCatalogueSnapshot
  }, { isolationLevel: 'RepeatableRead', ...CATALOGUE_TRANSACTION_OPTIONS })
}

export function catalogueTargetSnapshotFingerprint(snapshot: TargetCatalogueSnapshot) {
  return contentDigest(CATALOGUE_TARGET_TABLES.map((table) => ({
    table,
    rows: catalogueTargetRowsFingerprint(table, snapshot.tables.get(table) ?? []),
  })))
}

function validateKey(table: string, value: CatalogueMutationKey, label: string, write = true) {
  const contract = write ? writeContract(table) : tableContract(table)
  const key = jsonRecord(value, label)
  exactFields(key, contract.keys, label)
  for (const field of contract.keys) {
    const part = key[field]
    if ((typeof part !== 'string' || !part) && !Number.isSafeInteger(part)) throw new Error(`${label}.${field} is invalid`)
  }
  return key
}

function validateRow(table: string, value: CatalogueTargetRow, key: Record<string, unknown>, label: string) {
  const contract = writeContract(table)
  const row = jsonRecord(value, label)
  exactFields(row, contract.columns, label)
  for (const field of contract.keys) if (row[field] !== key[field]) throw new Error(`${label}.${field} does not match its key`)
  return row
}

function mutationRank(mutation: PlannedCatalogueRowMutation) {
  return CATALOGUE_APPLY_ORDER.findIndex((entry) => entry.phase === mutation.phase && entry.table === mutation.table)
}

function validateMutations(mutations: readonly PlannedCatalogueRowMutation[]) {
  let previousRank = -1
  const seen = new Set<string>()
  for (const [index, mutation] of mutations.entries()) {
    const label = `catalogue mutation ${index}`
    const rank = mutationRank(mutation)
    if (rank < 0 || rank < previousRank) throw new Error(`${label} is outside the fixed apply order`)
    previousRank = rank
    const key = validateKey(mutation.table, mutation.key, `${label} key`)
    if (!mutation.before && !mutation.after) throw new Error(`${label} has neither a before nor after image`)
    if (mutation.before) validateRow(mutation.table, mutation.before, key, `${label} before`)
    if (mutation.after) validateRow(mutation.table, mutation.after, key, `${label} after`)
    if (!mutation.after && !['Plausibility', 'Lookalike'].includes(mutation.table)) throw new Error(`${label} attempts a forbidden historical/global delete`)
    const identity = `${mutation.phase}:${mutation.table}:${keyText(mutation.key)}`
    if (seen.has(identity)) throw new Error(`${label} duplicates a write key in one phase`)
    seen.add(identity)
  }
}

function validateScope(scope: CatalogueProtectionScope, index: number) {
  const contract = tableContract(scope.table)
  const columns = [...scope.columns]
  if (new Set(columns).size !== columns.length || columns.some((column) => !contract.columns.includes(column as never))) {
    throw new Error(`protected scope ${index} contains a column outside the fixed table contract`)
  }
  if (!Number.isSafeInteger(scope.beforeRows) || scope.beforeRows < 0 || !SHA256.test(scope.beforeFingerprint)) throw new Error(`protected scope ${index} evidence is invalid`)
  if (scope.selector.kind === 'keys') {
    const keys = scope.selector.keys.map((key, keyIndex) => validateKey(scope.table, key, `protected scope ${index} key ${keyIndex}`, false))
    if (new Set(keys.map((key) => keyText(key))).size !== keys.length) throw new Error(`protected scope ${index} has duplicate keys`)
  } else if (scope.selector.kind !== 'all') throw new Error(`protected scope ${index} selector is invalid`)
}

function validatePlan(plan: CatalogueTargetPlan) {
  if (plan.schemaVersion !== 1 || !plan.catalogueVersionId || !plan.registryVersionId || !SHA256.test(plan.targetSnapshotFingerprint) || !SHA256.test(plan.fingerprint)) {
    throw new Error('catalogue target plan envelope is invalid')
  }
  validateMutations(plan.mutations)
  plan.protectedScopes.forEach(validateScope)
  assertCatalogueTargetPlan(plan)
}

async function readKeyedRows(db: Pick<Tx, '$queryRawUnsafe'>, table: string, keys: readonly Record<string, unknown>[]): Promise<CatalogueTargetRow[]> {
  if (!keys.length) return []
  const contract = tableContract(table)
  const join = contract.keys.map((key) => `t.${quote(key)} = k.${quote(key)}`).join(' AND ')
  const order = contract.keys.map((key) => `t.${quote(key)}`).join(', ')
  const sql = `SELECT to_jsonb(t) AS row FROM ${quote(table)} t JOIN jsonb_populate_recordset(NULL::${quote(table)}, $1::jsonb) k ON ${join} ORDER BY ${order}`
  return db.$queryRawUnsafe<{ row: CatalogueTargetRow }[]>(sql, JSON.stringify(keys)).then((rows) => rows.map(({ row }) => row))
}

async function currentMutationRows(db: Pick<Tx, '$queryRawUnsafe'>, mutations: readonly PlannedCatalogueRowMutation[]) {
  const found = new Map<string, CatalogueTargetRow>()
  const groups = Map.groupBy(mutations, (mutation) => mutation.table)
  for (const [table, group] of groups) {
    const unique = new Map(group.map((mutation) => [keyText(mutation.key), mutation.key]))
    const rows = await readKeyedRows(db, table, [...unique.values()])
    for (const row of rows) found.set(`${table}:${keyText(Object.fromEntries(tableContract(table).keys.map((field) => [field, row[field]])))}`, row)
  }
  return found
}

function assertMutationImages(mutations: readonly PlannedCatalogueRowMutation[], rows: ReadonlyMap<string, CatalogueTargetRow>, side: 'before' | 'after') {
  for (const mutation of mutations) {
    const current = rows.get(`${mutation.table}:${keyText(mutation.key)}`) ?? null
    const expected = mutation[side]
    if (contentDigest(current) !== contentDigest(expected)) throw new Error(`${mutation.table} ${keyText(mutation.key)} ${side}-image mismatch`)
  }
}

async function scopeRows(db: Pick<Tx, '$queryRawUnsafe'>, scope: CatalogueProtectionScope): Promise<CatalogueTargetRow[]> {
  const contract = tableContract(scope.table)
  const projected = scope.columns.length
    ? `jsonb_build_object(${scope.columns.flatMap((column) => [`'${column}'`, `to_jsonb(t)->'${column}'`]).join(', ')})`
    : `'{}'::jsonb`
  const order = contract.keys.map((key) => `t.${quote(key)}`).join(', ')
  if (scope.selector.kind === 'all') {
    const rows = await db.$queryRawUnsafe<{ row: CatalogueTargetRow }[]>(`SELECT ${projected} AS row FROM ${quote(scope.table)} t ORDER BY ${order}`)
    return rows.map(({ row }) => row)
  }
  const keys = scope.selector.keys as readonly Record<string, unknown>[]
  if (!keys.length) return []
  const join = contract.keys.map((key) => `t.${quote(key)} = k.${quote(key)}`).join(' AND ')
  const rows = await db.$queryRawUnsafe<{ row: CatalogueTargetRow }[]>(`SELECT ${projected} AS row FROM ${quote(scope.table)} t JOIN jsonb_populate_recordset(NULL::${quote(scope.table)}, $1::jsonb) k ON ${join} ORDER BY ${order}`, JSON.stringify(keys))
  return rows.map(({ row }) => row)
}

async function assertProtectedScopes(db: Pick<Tx, '$queryRawUnsafe'>, scopes: readonly CatalogueProtectionScope[]) {
  for (const [index, scope] of scopes.entries()) {
    const rows = await scopeRows(db, scope)
    if (rows.length !== scope.beforeRows || catalogueTargetRowsFingerprint(scope.table, rows) !== scope.beforeFingerprint) {
      throw new Error(`protected scope ${index} changed after target planning`)
    }
  }
}

function currentKey(table: string, row: CatalogueTargetRow) {
  return Object.fromEntries(tableContract(table).keys.map((field) => [field, row[field]]))
}

function assertSequentialBeforeImages(mutations: readonly PlannedCatalogueRowMutation[], rows: ReadonlyMap<string, CatalogueTargetRow>) {
  const state = new Map<string, CatalogueTargetRow | null>()
  for (const mutation of mutations) {
    const id = `${mutation.table}:${keyText(mutation.key)}`
    if (!state.has(id)) state.set(id, rows.get(id) ?? null)
    if (contentDigest(state.get(id)) !== contentDigest(mutation.before)) {
      throw new Error(`${mutation.table} ${keyText(mutation.key)} before-image mismatch`)
    }
    state.set(id, mutation.after)
  }
  return state
}

function finalImages(mutations: readonly PlannedCatalogueRowMutation[]) {
  const state = new Map<string, PlannedCatalogueRowMutation>()
  for (const mutation of mutations) state.set(`${mutation.table}:${keyText(mutation.key)}`, mutation)
  return [...state.values()]
}

function initialImages(mutations: readonly PlannedCatalogueRowMutation[]) {
  const state = new Map<string, PlannedCatalogueRowMutation>()
  for (const mutation of mutations) {
    const id = `${mutation.table}:${keyText(mutation.key)}`
    if (!state.has(id)) state.set(id, mutation)
  }
  return [...state.values()]
}

async function lockTargetTables(tx: Tx) {
  for (const table of CATALOGUE_TARGET_TABLES) await tx.$executeRawUnsafe(`LOCK TABLE ${quote(table)} IN SHARE ROW EXCLUSIVE MODE`)
}

async function boundCatalogueTransaction(tx: Tx) {
  await tx.$executeRawUnsafe('SET LOCAL statement_timeout = 120000')
  await tx.$executeRawUnsafe('SET LOCAL lock_timeout = 30000')
}

async function assertTargetSnapshot(tx: Tx, expected: string) {
  const actual = await currentTargetFingerprint(tx)
  if (actual !== expected) throw new Error('complete target snapshot changed after planning')
}

async function currentTargetFingerprint(db: Pick<Tx, '$queryRawUnsafe'>) {
  const tables = new Map<string, readonly CatalogueTargetRow[]>()
  for (const table of CATALOGUE_TARGET_TABLES) tables.set(table, await readAllRows(db, table))
  const snapshot = { tables: readonlyMap(tables) } as TargetCatalogueSnapshot
  return catalogueTargetSnapshotFingerprint(snapshot)
}

function chunks<T>(rows: readonly T[]) {
  const batches: T[][] = []
  for (let index = 0; index < rows.length; index += BATCH_SIZE) batches.push(rows.slice(index, index + BATCH_SIZE))
  return batches
}

async function upsertRows(tx: Tx, table: string, rows: readonly CatalogueTargetRow[]) {
  if (!rows.length) return
  const contract = writeContract(table)
  const columns = contract.columns.map(quote).join(', ')
  const selected = contract.columns.map((column) => `r.${quote(column)}`).join(', ')
  const conflict = contract.keys.map(quote).join(', ')
  const updates = contract.columns.filter((column) => !contract.keys.includes(column))
  const action = updates.length
    ? `DO UPDATE SET ${updates.map((column) => `${quote(column)} = EXCLUDED.${quote(column)}`).join(', ')}`
    : 'DO NOTHING'
  const sql = `INSERT INTO ${quote(table)} (${columns}) SELECT ${selected} FROM jsonb_populate_recordset(NULL::${quote(table)}, $1::jsonb) r ON CONFLICT (${conflict}) ${action}`
  for (const batch of chunks(rows)) await tx.$executeRawUnsafe(sql, JSON.stringify(batch))
}

async function deleteRows(tx: Tx, table: string, keys: readonly Record<string, unknown>[]) {
  if (!keys.length) return
  const contract = writeContract(table)
  const match = contract.keys.map((key) => `t.${quote(key)} = k.${quote(key)}`).join(' AND ')
  const sql = `DELETE FROM ${quote(table)} t USING jsonb_populate_recordset(NULL::${quote(table)}, $1::jsonb) k WHERE ${match}`
  for (const batch of chunks(keys)) await tx.$executeRawUnsafe(sql, JSON.stringify(batch))
}

function matching(mutations: readonly PlannedCatalogueRowMutation[], phase: 'materialize' | 'publish', table: CatalogueTargetTable) {
  return mutations.filter((mutation) => mutation.phase === phase && mutation.table === table)
}

async function applyMutationBatch(tx: Tx, mutations: readonly PlannedCatalogueRowMutation[], table: CatalogueTargetTable) {
  await deleteRows(tx, table, mutations.filter((mutation) => !mutation.after).map((mutation) => mutation.key))
  await upsertRows(tx, table, mutations.map((mutation) => mutation.after).filter((row): row is CatalogueTargetRow => row !== null))
}

function activates(table: 'RegionRegistryVersion' | 'CatalogueVersion', row: CatalogueTargetRow) {
  return table === 'RegionRegistryVersion' ? row.active === true : row.status === 'active'
}

/** The old active row must retire before its partial-unique-index successor activates. */
async function publishActiveSwap(tx: Tx, mutations: readonly PlannedCatalogueRowMutation[], table: 'RegionRegistryVersion' | 'CatalogueVersion', side: 'before' | 'after') {
  const rows = mutations.map((mutation) => mutation[side]).filter((row): row is CatalogueTargetRow => row !== null)
  await upsertRows(tx, table, rows.filter((row) => !activates(table, row)))
  await upsertRows(tx, table, rows.filter((row) => activates(table, row)))
}

async function applyMutations(tx: Tx, mutations: readonly PlannedCatalogueRowMutation[]) {
  for (const entry of CATALOGUE_APPLY_ORDER.filter((entry) => entry.phase === 'materialize')) {
    await applyMutationBatch(tx, matching(mutations, entry.phase, entry.table), entry.table)
  }
  // The live tables have opposing dependency orders for removal and insertion. Removing old
  // lookalikes first avoids relying on Plausibility's cascade; new membership precedes relations.
  const plausibility = matching(mutations, 'publish', 'Plausibility')
  const lookalikes = matching(mutations, 'publish', 'Lookalike')
  await deleteRows(tx, 'Lookalike', lookalikes.filter((mutation) => !mutation.after).map((mutation) => mutation.key))
  await deleteRows(tx, 'Plausibility', plausibility.filter((mutation) => !mutation.after).map((mutation) => mutation.key))
  await upsertRows(tx, 'Plausibility', plausibility.map((mutation) => mutation.after).filter((row): row is CatalogueTargetRow => row !== null))
  await upsertRows(tx, 'Lookalike', lookalikes.map((mutation) => mutation.after).filter((row): row is CatalogueTargetRow => row !== null))
  for (const entry of CATALOGUE_APPLY_ORDER.filter((entry) => entry.phase === 'publish' && !['Plausibility', 'Lookalike'].includes(entry.table))) {
    const rows = matching(mutations, entry.phase, entry.table)
    if (entry.table === 'RegionRegistryVersion' || entry.table === 'CatalogueVersion') await publishActiveSwap(tx, rows, entry.table, 'after')
    else await applyMutationBatch(tx, rows, entry.table)
  }
}

export type CatalogueApplyReceipt = Readonly<{
  schemaVersion: 1
  operationId: string
  countryCode: typeof GERMANY_CATALOGUE_COUNTRY
  catalogueVersionId: string
  registryVersionId: string
  sourceEvidence: ValidatedCatalogueImport['evidence']
  sourceEvidenceFingerprint: string
  targetSnapshotFingerprint: string
  planFingerprint: string
  createdAt: string
  protectedScopes: readonly CatalogueProtectionScope[]
  mutations: readonly PlannedCatalogueRowMutation[]
  fingerprint: string
}>

function receiptPayload(receipt: Omit<CatalogueApplyReceipt, 'fingerprint'>) {
  return {
    ...receipt,
    protectedScopes: receipt.protectedScopes,
    mutations: receipt.mutations,
  }
}

/** Create and durably persist this exact receipt before calling apply. */
export function createCatalogueApplyReceipt(options: {
  operationId: string
  plan: CatalogueTargetPlan
  validated: ValidatedCatalogueImport
  createdAt?: string
}): CatalogueApplyReceipt {
  validatePlan(options.plan)
  if (!options.operationId.trim()) throw new Error('catalogue operationId is required')
  if (contentDigest(options.plan.sourceEvidence) !== contentDigest(options.validated.evidence)) throw new Error('catalogue plan is not bound to the validated source evidence')
  const createdAt = options.createdAt ?? new Date().toISOString()
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error('catalogue receipt createdAt is invalid')
  const payload: Omit<CatalogueApplyReceipt, 'fingerprint'> = {
    schemaVersion: 1 as const,
    operationId: options.operationId,
    countryCode: GERMANY_CATALOGUE_COUNTRY,
    catalogueVersionId: options.plan.catalogueVersionId,
    registryVersionId: options.plan.registryVersionId,
    sourceEvidence: options.validated.evidence,
    sourceEvidenceFingerprint: contentDigest(options.validated.evidence),
    targetSnapshotFingerprint: options.plan.targetSnapshotFingerprint,
    planFingerprint: options.plan.fingerprint,
    createdAt,
    protectedScopes: options.plan.protectedScopes,
    mutations: options.plan.mutations,
  }
  return deepFreeze({ ...payload, fingerprint: catalogueImportDigest(payload) })
}

function assertReceipt(receipt: CatalogueApplyReceipt, plan?: CatalogueTargetPlan) {
  const { fingerprint, ...payload } = receipt
  if (receipt.schemaVersion !== 1 || receipt.countryCode !== GERMANY_CATALOGUE_COUNTRY || !receipt.operationId ||
    receipt.sourceEvidenceFingerprint !== contentDigest(receipt.sourceEvidence) || !SHA256.test(fingerprint) || catalogueImportDigest(receiptPayload(payload)) !== fingerprint) {
    throw new Error('catalogue apply receipt is invalid')
  }
  validateMutations(receipt.mutations)
  receipt.protectedScopes.forEach(validateScope)
  if (plan && (receipt.planFingerprint !== plan.fingerprint || receipt.catalogueVersionId !== plan.catalogueVersionId ||
    receipt.registryVersionId !== plan.registryVersionId || receipt.targetSnapshotFingerprint !== plan.targetSnapshotFingerprint ||
    catalogueImportDigest(receipt.mutations) !== catalogueImportDigest(plan.mutations) ||
    catalogueImportDigest(receipt.protectedScopes) !== catalogueImportDigest(plan.protectedScopes))) {
    throw new Error('catalogue apply receipt does not bind the supplied target plan')
  }
}

export type CatalogueStoreFaultInjection = Readonly<{
  afterWrites?: (tx: Tx) => Promise<void>
  afterCommit?: () => Promise<void>
}>

async function verifyApplied(db: Db, receipt: CatalogueApplyReceipt, committedFingerprint: string) {
  await db.$transaction(async (tx) => {
    await boundCatalogueTransaction(tx)
    const rows = await currentMutationRows(tx, finalImages(receipt.mutations))
    assertMutationImages(finalImages(receipt.mutations), rows, 'after')
    await assertProtectedScopes(tx, receipt.protectedScopes)
    if (await currentTargetFingerprint(tx) !== committedFingerprint) throw new Error('complete post-commit target verification mismatch')
  }, { isolationLevel: 'RepeatableRead', ...CATALOGUE_TRANSACTION_OPTIONS })
}

async function assertCurrentReleaseEvidence(validated: ValidatedCatalogueReleaseImport) {
  if (typeof validated?.assertReleaseEvidenceStillValid !== 'function') {
    throw new Error('catalogue apply requires validated current release evidence')
  }
  await validated.assertReleaseEvidenceStillValid()
}

/**
 * Close/drain the shared gate, apply under one serializable transaction, verify after commit, and
 * only then reopen. A drain or post-commit failure intentionally leaves maintenance closed.
 */
export async function applyCatalogueTargetPlan(db: Db, options: {
  validated: ValidatedCatalogueReleaseImport
  plan: CatalogueTargetPlan
  receipt: CatalogueApplyReceipt
  faultInjection?: CatalogueStoreFaultInjection
}) {
  validatePlan(options.plan)
  assertReceipt(options.receipt, options.plan)
  await assertCurrentReleaseEvidence(options.validated)
  if (options.receipt.sourceEvidenceFingerprint !== contentDigest(options.validated.evidence) ||
    contentDigest(options.receipt.sourceEvidence) !== contentDigest(options.validated.evidence)) throw new Error('catalogue receipt source evidence drifted')
  await db.$transaction((tx) => closeCatalogueGate(tx, {
    operationId: options.receipt.operationId,
    targetCatalogueId: options.receipt.catalogueVersionId,
  }))
  const drain = await catalogueWriteDrain(db)
  if (drain.count) throw new Error(`catalogue write drain is not empty (${drain.count})`)
  // The drain may be operator-paced; re-hash the six frozen inputs at the actual transaction edge.
  await assertCurrentReleaseEvidence(options.validated)

  const committedFingerprint = await db.$transaction(async (tx) => {
    await boundCatalogueTransaction(tx)
    await requireDrainedCatalogueMaintenance(tx, {
      operationId: options.receipt.operationId,
      targetCatalogueId: options.receipt.catalogueVersionId,
    })
    await lockTargetTables(tx)
    await assertTargetSnapshot(tx, options.receipt.targetSnapshotFingerprint)
    await assertProtectedScopes(tx, options.receipt.protectedScopes)
    const before = await currentMutationRows(tx, options.receipt.mutations)
    assertSequentialBeforeImages(options.receipt.mutations, before)
    await applyMutations(tx, options.receipt.mutations)
    await options.faultInjection?.afterWrites?.(tx)
    const after = await currentMutationRows(tx, finalImages(options.receipt.mutations))
    assertMutationImages(finalImages(options.receipt.mutations), after, 'after')
    await assertProtectedScopes(tx, options.receipt.protectedScopes)
    return currentTargetFingerprint(tx)
  }, { isolationLevel: 'Serializable', ...CATALOGUE_TRANSACTION_OPTIONS })

  await options.faultInjection?.afterCommit?.()
  await verifyApplied(db, options.receipt, committedFingerprint)
  await db.$transaction((tx) => openCatalogueGate(tx, { operationId: options.receipt.operationId }))
  return options.receipt
}

type InboundReference = Readonly<{
  targetTable: CatalogueTargetTable
  sourceTable: (typeof CATALOGUE_TARGET_TABLES)[number]
  sourceColumns: readonly string[]
  targetColumns: readonly string[]
  label?: string
}>

const INBOUND_REFERENCES: readonly InboundReference[] = [
  { targetTable: 'Region', sourceTable: 'Filter', sourceColumns: ['regionId'], targetColumns: ['id'] },
  { targetTable: 'Region', sourceTable: 'RegionRegistryEntry', sourceColumns: ['regionId'], targetColumns: ['id'] },
  { targetTable: 'Region', sourceTable: 'Plausibility', sourceColumns: ['regionId'], targetColumns: ['id'] },
  { targetTable: 'Region', sourceTable: 'Lookalike', sourceColumns: ['regionId'], targetColumns: ['id'] },
  { targetTable: 'RegionRegistryVersion', sourceTable: 'RegionRegistrySource', sourceColumns: ['registryVersionId'], targetColumns: ['id'] },
  { targetTable: 'RegionRegistryVersion', sourceTable: 'RegionRegistryEntry', sourceColumns: ['registryVersionId'], targetColumns: ['id'] },
  { targetTable: 'RegionRegistryVersion', sourceTable: 'RegionSourceUnit', sourceColumns: ['registryVersionId'], targetColumns: ['id'] },
  { targetTable: 'RegionRegistryVersion', sourceTable: 'RegionQueryUnit', sourceColumns: ['registryVersionId'], targetColumns: ['id'] },
  { targetTable: 'RegionRegistryVersion', sourceTable: 'CatalogueVersion', sourceColumns: ['registryVersionId'], targetColumns: ['id'] },
  { targetTable: 'RegionRegistryVersion', sourceTable: 'CatalogueRegionBuild', sourceColumns: ['registryVersionId'], targetColumns: ['id'] },
  { targetTable: 'RegionRegistrySource', sourceTable: 'RegionRegistryEntry', sourceColumns: ['sourceId'], targetColumns: ['id'] },
  { targetTable: 'RegionRegistrySource', sourceTable: 'RegionSourceUnit', sourceColumns: ['sourceId'], targetColumns: ['id'] },
  { targetTable: 'RegionRegistrySource', sourceTable: 'RegionQueryUnit', sourceColumns: ['sourceId'], targetColumns: ['id'] },
  { targetTable: 'RegionRegistryEntry', sourceTable: 'RegionRegistryAlias', sourceColumns: ['registryEntryId'], targetColumns: ['id'] },
  { targetTable: 'RegionRegistryEntry', sourceTable: 'RegionSourceUnit', sourceColumns: ['registryEntryId'], targetColumns: ['id'] },
  { targetTable: 'RegionRegistryEntry', sourceTable: 'CatalogueRegionBuild', sourceColumns: ['registryEntryId'], targetColumns: ['id'] },
  { targetTable: 'RegionSourceUnit', sourceTable: 'RegionQueryUnit', sourceColumns: ['sourceUnitId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'Asset', sourceColumns: ['taxonId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'Sighting', sourceColumns: ['taxonId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'Study', sourceColumns: ['taxonId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'Plausibility', sourceColumns: ['taxonId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'Lookalike', sourceColumns: ['taxonId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'Lookalike', sourceColumns: ['siblingId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'Interaction', sourceColumns: ['sourceId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'Interaction', sourceColumns: ['targetId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'CataloguePlausibility', sourceColumns: ['taxonId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'CatalogueLookalike', sourceColumns: ['taxonId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'CatalogueLookalike', sourceColumns: ['siblingId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'CatalogueTaxon', sourceColumns: ['taxonId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'TaxonEnrichmentWork', sourceColumns: ['taxonId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'ReferenceGalleryReceipt', sourceColumns: ['taxonId'], targetColumns: ['id'] },
  { targetTable: 'Taxon', sourceTable: 'ReferenceAssetVisibility', sourceColumns: ['taxonId'], targetColumns: ['id'] },
  { targetTable: 'CatalogueVersion', sourceTable: 'CatalogueRegionBuild', sourceColumns: ['catalogueVersionId'], targetColumns: ['id'] },
  { targetTable: 'CatalogueVersion', sourceTable: 'CatalogueTaxon', sourceColumns: ['catalogueVersionId'], targetColumns: ['id'] },
  { targetTable: 'CatalogueVersion', sourceTable: 'CatalogueTaxonomyResolution', sourceColumns: ['catalogueVersionId'], targetColumns: ['id'] },
  { targetTable: 'CatalogueVersion', sourceTable: 'CatalogueHabitatBatch', sourceColumns: ['catalogueVersionId'], targetColumns: ['id'] },
  { targetTable: 'CatalogueVersion', sourceTable: 'ReferenceGalleryReceipt', sourceColumns: ['catalogueVersionId'], targetColumns: ['id'] },
  { targetTable: 'CatalogueRegionBuild', sourceTable: 'CataloguePlausibility', sourceColumns: ['regionBuildId'], targetColumns: ['id'] },
  { targetTable: 'CatalogueRegionBuild', sourceTable: 'CatalogueLookalike', sourceColumns: ['regionBuildId'], targetColumns: ['id'] },
  { targetTable: 'CataloguePlausibility', sourceTable: 'CatalogueLookalike', sourceColumns: ['regionBuildId', 'taxonId'], targetColumns: ['regionBuildId', 'taxonId'], label: 'member' },
  { targetTable: 'CataloguePlausibility', sourceTable: 'CatalogueLookalike', sourceColumns: ['regionBuildId', 'siblingId'], targetColumns: ['regionBuildId', 'taxonId'], label: 'sibling-member' },
  { targetTable: 'Asset', sourceTable: 'Identity', sourceColumns: ['avatarAssetId'], targetColumns: ['id'] },
  { targetTable: 'Asset', sourceTable: 'ScanWork', sourceColumns: ['photoId'], targetColumns: ['id'] },
  { targetTable: 'Asset', sourceTable: 'PhotoDeletion', sourceColumns: ['assetId'], targetColumns: ['id'] },
  { targetTable: 'Asset', sourceTable: 'ReferenceAssetVisibility', sourceColumns: ['assetId'], targetColumns: ['id'] },
  { targetTable: 'ReferenceGalleryReceipt', sourceTable: 'ReferenceAssetVisibility', sourceColumns: ['catalogueVersionId', 'taxonId'], targetColumns: ['catalogueVersionId', 'taxonId'] },
]

type CatalogueRecoveryIndex = Readonly<{
  initial: readonly PlannedCatalogueRowMutation[]
  final: readonly PlannedCatalogueRowMutation[]
  insertedByTable: ReadonlyMap<CatalogueTargetTable, readonly CatalogueTargetRow[]>
  ownedFinalKeys: ReadonlySet<string>
}>

function catalogueRecoveryIndex(mutations: readonly PlannedCatalogueRowMutation[]): CatalogueRecoveryIndex {
  const initial = initialImages(mutations), final = finalImages(mutations)
  const finalByKey = new Map(final.map((mutation) => [`${mutation.table}:${keyText(mutation.key)}`, mutation]))
  const inserted = new Map<CatalogueTargetTable, CatalogueTargetRow[]>()
  for (const mutation of initial) {
    if (mutation.before !== null) continue
    const after = finalByKey.get(`${mutation.table}:${keyText(mutation.key)}`)?.after
    if (!after) continue
    const rows = inserted.get(mutation.table) ?? []
    rows.push(after)
    inserted.set(mutation.table, rows)
  }
  return {
    initial,
    final,
    insertedByTable: inserted,
    ownedFinalKeys: new Set(final.filter((mutation) => mutation.after)
      .map((mutation) => `${mutation.table}:${keyText(mutation.key)}`)),
  }
}

async function inboundRows(tx: Tx, reference: InboundReference, targets: readonly CatalogueTargetRow[]) {
  if (!targets.length) return []
  const source = tableContract(reference.sourceTable), target = writeContract(reference.targetTable)
  if (reference.sourceColumns.length !== reference.targetColumns.length ||
    reference.sourceColumns.some((column) => !source.columns.includes(column)) ||
    reference.targetColumns.some((column) => !target.columns.includes(column))) throw new Error('catalogue recovery inbound-reference contract is invalid')
  const join = reference.sourceColumns.map((column, index) => `s.${quote(column)} = t.${quote(reference.targetColumns[index]!)}`).join(' AND ')
  const order = source.keys.map((key) => `s.${quote(key)}`).join(', ')
  return tx.$queryRawUnsafe<{ row: CatalogueTargetRow }[]>(
    `SELECT to_jsonb(s) AS row FROM ${quote(reference.sourceTable)} s JOIN jsonb_populate_recordset(NULL::${quote(reference.targetTable)}, $1::jsonb) t ON ${join} ORDER BY ${order}`,
    JSON.stringify(targets),
  ).then((rows) => rows.map(({ row }) => row))
}

async function assertNoNewInboundReferences(tx: Tx, index: CatalogueRecoveryIndex) {
  const blockers: string[] = []
  for (const reference of INBOUND_REFERENCES) {
    const inserted = index.insertedByTable.get(reference.targetTable) ?? []
    for (const row of await inboundRows(tx, reference, inserted)) {
      const id = `${reference.sourceTable}:${keyText(currentKey(reference.sourceTable, row))}`
      if (!index.ownedFinalKeys.has(id)) blockers.push(`${reference.sourceTable}.${reference.label ?? reference.sourceColumns.join('+')}:${keyText(currentKey(reference.sourceTable, row))}`)
    }
  }

  const regionIds = (index.insertedByTable.get('Region') ?? []).flatMap((row) => typeof row.id === 'string' ? [row.id] : [])
  if (regionIds.length) {
    const filters = await tx.$queryRawUnsafe<{ row: CatalogueTargetRow }[]>(
      `SELECT to_jsonb(f) AS row FROM "Filter" f WHERE f."regionIds" && $1::text[] ORDER BY f.id`, regionIds)
    for (const { row } of filters) if (!index.ownedFinalKeys.has(`Filter:${keyText(currentKey('Filter', row))}`)) blockers.push(`Filter.regionIds:${keyText(currentKey('Filter', row))}`)
    const prose = await tx.$queryRawUnsafe<{ row: CatalogueTargetRow }[]>(
      `SELECT to_jsonb(t) AS row FROM "Taxon" t WHERE t.prose->>'version' = '1' AND t.prose->'regions' ?| $1::text[] ORDER BY t.id`, regionIds)
    for (const { row } of prose) if (!index.ownedFinalKeys.has(`Taxon:${keyText(currentKey('Taxon', row))}`)) blockers.push(`Taxon.prose.regions:${keyText(currentKey('Taxon', row))}`)
    const scans = await tx.$queryRawUnsafe<{ row: CatalogueTargetRow }[]>(
      `SELECT to_jsonb(s) AS row FROM "ScanWork" s WHERE EXISTS (
        SELECT 1 FROM jsonb_path_query(s.result, 'strict $.**.regionId') value
        WHERE value #>> '{}' = ANY($1::text[])
      ) ORDER BY s.key`, regionIds)
    for (const { row } of scans) blockers.push(`ScanWork.result.regionId:${keyText(currentKey('ScanWork', row))}`)
  }
  if (blockers.length) throw new Error(`catalogue recovery found newer inbound references: ${[...new Set(blockers)].slice(0, 20).join(', ')}`)
}

async function recoverMutations(tx: Tx, mutations: readonly PlannedCatalogueRowMutation[]) {
  for (const entry of [...CATALOGUE_APPLY_ORDER].reverse().filter((entry) => entry.phase === 'publish' && !['Plausibility', 'Lookalike'].includes(entry.table))) {
    const rows = matching(mutations, entry.phase, entry.table)
    await deleteRows(tx, entry.table, rows.filter((mutation) => !mutation.before).map((mutation) => mutation.key))
    if (entry.table === 'RegionRegistryVersion' || entry.table === 'CatalogueVersion') await publishActiveSwap(tx, rows, entry.table, 'before')
    else await upsertRows(tx, entry.table, rows.map((mutation) => mutation.before).filter((row): row is CatalogueTargetRow => row !== null))
  }
  const plausibility = matching(mutations, 'publish', 'Plausibility')
  const lookalikes = matching(mutations, 'publish', 'Lookalike')
  await deleteRows(tx, 'Lookalike', lookalikes.filter((mutation) => !mutation.before).map((mutation) => mutation.key))
  await deleteRows(tx, 'Plausibility', plausibility.filter((mutation) => !mutation.before).map((mutation) => mutation.key))
  await upsertRows(tx, 'Plausibility', plausibility.map((mutation) => mutation.before).filter((row): row is CatalogueTargetRow => row !== null))
  await upsertRows(tx, 'Lookalike', lookalikes.map((mutation) => mutation.before).filter((row): row is CatalogueTargetRow => row !== null))

  for (const entry of [...CATALOGUE_APPLY_ORDER].reverse().filter((entry) => entry.phase === 'materialize')) {
    const rows = matching(mutations, entry.phase, entry.table)
    await deleteRows(tx, entry.table, rows.filter((mutation) => !mutation.before).map((mutation) => mutation.key))
    await upsertRows(tx, entry.table, rows.map((mutation) => mutation.before).filter((row): row is CatalogueTargetRow => row !== null))
  }
}

async function verifyRecovered(db: Db, receipt: CatalogueApplyReceipt, committedFingerprint: string, index: CatalogueRecoveryIndex) {
  await db.$transaction(async (tx) => {
    await boundCatalogueTransaction(tx)
    const rows = await currentMutationRows(tx, index.initial)
    assertMutationImages(index.initial, rows, 'before')
    await assertProtectedScopes(tx, receipt.protectedScopes)
    if (await currentTargetFingerprint(tx) !== committedFingerprint) throw new Error('complete post-recovery target verification mismatch')
  }, { isolationLevel: 'RepeatableRead', ...CATALOGUE_TRANSACTION_OPTIONS })
}

/** Exact-CAS recovery. Any changed after-image or new reference fails before the first inverse. */
export async function recoverCatalogueTarget(db: Db, options: {
  receipt: CatalogueApplyReceipt
  faultInjection?: CatalogueStoreFaultInjection
}) {
  assertReceipt(options.receipt)
  const recovery = catalogueRecoveryIndex(options.receipt.mutations)
  await db.$transaction((tx) => closeCatalogueGate(tx, {
    operationId: options.receipt.operationId,
    targetCatalogueId: options.receipt.catalogueVersionId,
  }))
  const drain = await catalogueWriteDrain(db)
  if (drain.count) throw new Error(`catalogue write drain is not empty (${drain.count})`)

  const committedFingerprint = await db.$transaction(async (tx) => {
    await boundCatalogueTransaction(tx)
    await requireDrainedCatalogueMaintenance(tx, {
      operationId: options.receipt.operationId,
      targetCatalogueId: options.receipt.catalogueVersionId,
    })
    await lockTargetTables(tx)
    const after = await currentMutationRows(tx, recovery.final)
    assertMutationImages(recovery.final, after, 'after')
    await assertProtectedScopes(tx, options.receipt.protectedScopes)
    await assertNoNewInboundReferences(tx, recovery)
    await recoverMutations(tx, options.receipt.mutations)
    await options.faultInjection?.afterWrites?.(tx)
    const before = await currentMutationRows(tx, recovery.initial)
    assertMutationImages(recovery.initial, before, 'before')
    await assertProtectedScopes(tx, options.receipt.protectedScopes)
    return currentTargetFingerprint(tx)
  }, { isolationLevel: 'Serializable', ...CATALOGUE_TRANSACTION_OPTIONS })

  await options.faultInjection?.afterCommit?.()
  await verifyRecovered(db, options.receipt, committedFingerprint, recovery)
  await db.$transaction((tx) => openCatalogueGate(tx, { operationId: options.receipt.operationId }))
  return options.receipt
}
