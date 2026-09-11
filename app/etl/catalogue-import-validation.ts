/** Strict, read-only validation for the reviewed catalogue transfer bundle consumed by #63. */
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { ASSET_TRANSFER_COLUMNS, CONTENT_WORK_VERSIONS, WORK_TRANSFER_COLUMNS, canonicalContent, contentDigest } from './catalogue-gallery-transfer'
import { TRANSFER_SPECS, type TransferSpec, type TransferTable } from './catalogue-transfer'

export type ImportEvidenceFile = { path: string; sha256: string; bytes?: number }
export type ImportTransferBundle = { audit: ImportEvidenceFile; manifest: ImportEvidenceFile; artifact: ImportEvidenceFile }
export type CatalogueImportPins = {
  catalogueId: string
  runKey: string
  registryVersionId: string
  unionTaxa: number
  inputFingerprint: string
  responseFingerprint: string
  unionFingerprint: string
  baseAuditFingerprint: string
  contentAuditFingerprint: string
  contentFingerprint: string
  taxonFingerprint: string
}
export type CatalogueImportBundleInput = {
  pins: CatalogueImportPins
  base: ImportTransferBundle
  gallery: ImportTransferBundle
  maxLineBytes?: number
}
export type ValidatedImportFile = { role: string; path: string; sha256: string; bytes: number }
export type ValidatedImportTable = { table: string; columns: readonly string[]; rows: number; digest: string }
export type ValidatedImportEvidence = { files: readonly ValidatedImportFile[]; tables: readonly ValidatedImportTable[]; decodedFingerprint: string }

declare const VALIDATED_IMPORT: unique symbol
export type ValidatedCatalogueImport = {
  readonly [VALIDATED_IMPORT]: true
  readonly pins: Readonly<CatalogueImportPins>
  readonly tables: ReadonlyMap<string, readonly Record<string, unknown>[]>
  readonly evidence: ValidatedImportEvidence
  /** Re-hash the exact six inputs immediately before opening the apply transaction. */
  assertStillValid(): Promise<void>
}

type JsonRecord = Record<string, unknown>
type ParsedArtifact = { tables: Map<string, JsonRecord[]>; evidence: ValidatedImportFile; tableEvidence: TransferTable[] }

const SHA256 = /^[a-f\d]{64}$/
const DEFAULT_MAX_LINE_BYTES = 1024 * 1024
const MAX_JSON_BYTES = 32 * 1024 * 1024
const BASE_EXCLUDES = ['Asset', 'EmailCode', 'Filter', 'Identity', 'Passkey', 'Sighting', 'Study']
const GALLERY_EXCLUDES = ['Identity', 'Filter', 'Sighting', 'Study', 'Passkey', 'EmailCode', 'personal/owned/avatar Asset', 'sound Asset', 'outside-union Asset', 'unrelated/incomplete enrichment work']
const GALLERY_SPECS: TransferSpec[] = [
  { table: 'Asset', columns: ASSET_TRANSFER_COLUMNS, sql: 'validated artifact' },
  { table: 'TaxonEnrichmentWork', columns: WORK_TRANSFER_COLUMNS, sql: 'validated artifact' },
]

const PRIMARY_KEYS: Record<string, readonly string[]> = {
  Region: ['id'], RegionRegistryVersion: ['id'], RegionRegistrySource: ['id'], RegionRegistryEntry: ['id'],
  RegionRegistryAlias: ['id'], RegionSourceUnit: ['id'], RegionQueryUnit: ['id'], Taxon: ['id'],
  CatalogueVersion: ['id'], CatalogueRegionBuild: ['id'], CataloguePlausibility: ['id'], CatalogueLookalike: ['id'],
  CatalogueTaxon: ['catalogueVersionId', 'taxonId'], CatalogueTaxonomyResolution: ['catalogueVersionId', 'sourceKey'],
  Asset: ['id'], TaxonEnrichmentWork: ['taxonId', 'kind', 'version'],
}

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as JsonRecord
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`${label} must be a non-empty string`)
  return value
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${label} must be a non-negative safe integer`)
  return value as number
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value
}

function exactKeys(value: JsonRecord, expected: readonly string[], label: string) {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (canonicalContent(actual) !== canonicalContent(wanted)) throw new Error(`${label} has unexpected fields`)
}

function exactArray(value: unknown, expected: readonly unknown[], label: string) {
  if (canonicalContent(value) !== canonicalContent(expected)) throw new Error(`${label} mismatch`)
}

function equal(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label} mismatch`)
}

function requireSha256(value: unknown, label: string): string {
  const digest = string(value, label).toLowerCase()
  if (!SHA256.test(digest)) throw new Error(`${label} must be a SHA-256 digest`)
  return digest
}

function canonicalPretty(value: unknown) {
  return `${JSON.stringify(JSON.parse(canonicalContent(value)), null, 2)}\n`
}

function decodeUtf8(bytes: Buffer, label: string) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  catch { throw new Error(`${label} is not valid UTF-8`) }
}

async function digestFile(path: string): Promise<{ sha256: string; bytes: number }> {
  const hash = createHash('sha256')
  let bytes = 0
  for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length }
  return { sha256: hash.digest('hex'), bytes }
}

function normalizedFile(file: ImportEvidenceFile, role: string): ImportEvidenceFile {
  if (!file || typeof file !== 'object') throw new Error(`${role} file descriptor is required`)
  const path = resolve(string(file.path, `${role} path`))
  const sha256 = requireSha256(file.sha256, `${role} SHA-256`)
  const bytes = file.bytes === undefined ? undefined : integer(file.bytes, `${role} bytes`)
  return { path, sha256, bytes }
}

async function verifyFile(file: ImportEvidenceFile, role: string): Promise<ValidatedImportFile> {
  const actual = await digestFile(file.path)
  equal(actual.sha256, file.sha256, `${role} file SHA-256`)
  if (file.bytes !== undefined) equal(actual.bytes, file.bytes, `${role} file bytes`)
  return { role, path: file.path, ...actual }
}

async function readCanonicalJson(file: ImportEvidenceFile, role: string, style: 'pretty' | 'compact'): Promise<{ value: JsonRecord; evidence: ValidatedImportFile }> {
  const bytes = await readFile(file.path)
  if (bytes.length > MAX_JSON_BYTES) throw new Error(`${role} exceeds the JSON size limit`)
  const evidence = { role, path: file.path, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }
  equal(evidence.sha256, file.sha256, `${role} file SHA-256`)
  if (file.bytes !== undefined) equal(evidence.bytes, file.bytes, `${role} file bytes`)
  const text = decodeUtf8(bytes, role)
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error(`${role} is not valid JSON`) }
  const canonical = style === 'pretty' ? canonicalPretty(value) : `${canonicalContent(value)}\n`
  if (text !== canonical) throw new Error(`${role} is not canonical ${style} JSON`)
  return { value: record(value, role), evidence }
}

function manifestArtifact(value: unknown, role: string) {
  const artifact = record(value, `${role} artifact descriptor`)
  exactKeys(artifact, ['file', 'sha256', 'bytes', 'rows'], `${role} artifact descriptor`)
  return {
    file: string(artifact.file, `${role} artifact file`),
    sha256: requireSha256(artifact.sha256, `${role} artifact SHA-256`),
    bytes: integer(artifact.bytes, `${role} artifact bytes`),
    rows: integer(artifact.rows, `${role} artifact rows`),
  }
}

function manifestTables(value: unknown, specs: readonly TransferSpec[], role: string): Map<string, TransferTable> {
  const entries = array(value, `${role} tables`).map((item, index) => {
    const entry = record(item, `${role} table ${index}`)
    exactKeys(entry, ['table', 'columns', 'rows', 'digest'], `${role} table ${index}`)
    return { table: string(entry.table, `${role} table name`), columns: array(entry.columns, `${role} table columns`).map((column) => string(column, `${role} column`)),
      rows: integer(entry.rows, `${role} table rows`), digest: requireSha256(entry.digest, `${role} table digest`) }
  })
  const expectedNames = specs.map((spec) => spec.table).sort((a, b) => a.localeCompare(b))
  exactArray(entries.map((entry) => entry.table), expectedNames, `${role} manifest table order`)
  const byName = new Map(entries.map((entry) => [entry.table, entry]))
  if (byName.size !== specs.length) throw new Error(`${role} manifest has duplicate tables`)
  for (const spec of specs) exactArray(byName.get(spec.table)?.columns, spec.columns, `${role} ${spec.table} columns`)
  return byName
}

function rowKey(table: string, row: JsonRecord): string {
  const columns = PRIMARY_KEYS[table]
  if (!columns) throw new Error(`missing primary-key contract for ${table}`)
  return columns.map((column) => {
    const value = row[column]
    if (typeof value === 'string' && value) return `s:${value}`
    if (Number.isSafeInteger(value) && (value as number) >= 0) return `n:${String(value).padStart(20, '0')}`
    throw new Error(`${table}.${column} must be a non-empty string or non-negative safe integer`)
  }).join('\0')
}

async function parseArtifact(file: ImportEvidenceFile, role: string, catalogueId: string, specs: readonly TransferSpec[], expectedTables: Map<string, TransferTable>, maxLineBytes: number): Promise<ParsedArtifact> {
  const tables = new Map<string, JsonRecord[]>()
  const tableEvidence: TransferTable[] = []
  const fileHash = createHash('sha256')
  let fileBytes = 0, pending = Buffer.alloc(0), lineNumber = 0, dataRows = 0, specIndex = -1
  let current: { spec: TransferSpec; rows: JsonRecord[]; hash: ReturnType<typeof createHash>; previousKey: string | null } | null = null

  const finishTable = () => {
    if (!current) return
    current.hash.update(']')
    const expected = expectedTables.get(current.spec.table)!
    const digest = current.hash.digest('hex')
    equal(current.rows.length, expected.rows, `${role} ${current.spec.table} row count`)
    equal(digest, expected.digest, `${role} ${current.spec.table} digest`)
    tables.set(current.spec.table, current.rows)
    tableEvidence.push({ table: current.spec.table, columns: [...current.spec.columns], rows: current.rows.length, digest })
    current = null
  }

  const parseLine = (bytes: Buffer) => {
    lineNumber++
    if (!bytes.length) throw new Error(`${role} has a blank line at ${lineNumber}`)
    if (bytes.length > maxLineBytes) throw new Error(`${role} line ${lineNumber} exceeds the line limit`)
    if (bytes.includes(13)) throw new Error(`${role} line ${lineNumber} contains CR`)
    const line = decodeUtf8(bytes, `${role} line ${lineNumber}`)
    let decoded: unknown
    try { decoded = JSON.parse(line) } catch { throw new Error(`${role} line ${lineNumber} is not valid JSON`) }
    if (line !== canonicalContent(decoded)) throw new Error(`${role} line ${lineNumber} is not canonical JSON`)
    const envelope = record(decoded, `${role} line ${lineNumber}`)
    if (lineNumber === 1) {
      exactKeys(envelope, ['type', 'schemaVersion', 'catalogueId'], `${role} header`)
      equal(envelope.type, 'standkreis-catalogue-transfer', `${role} header type`)
      equal(envelope.schemaVersion, 1, `${role} schema version`)
      equal(envelope.catalogueId, catalogueId, `${role} catalogue id`)
      return
    }
    if (envelope.type === 'table') {
      finishTable()
      specIndex++
      const spec = specs[specIndex]
      if (!spec) throw new Error(`${role} has an unexpected table section`)
      exactKeys(envelope, ['type', 'table', 'columns'], `${role} table envelope`)
      equal(envelope.table, spec.table, `${role} table order`)
      exactArray(envelope.columns, spec.columns, `${role} ${spec.table} columns`)
      const hash = createHash('sha256'); hash.update('[')
      current = { spec, rows: [], hash, previousKey: null }
      return
    }
    if (envelope.type !== 'row' || !current) throw new Error(`${role} line ${lineNumber} is outside a table section`)
    exactKeys(envelope, ['type', 'table', 'row'], `${role} row envelope`)
    equal(envelope.table, current.spec.table, `${role} row table`)
    const row = record(envelope.row, `${role} ${current.spec.table} row`)
    exactKeys(row, current.spec.columns, `${role} ${current.spec.table} row`)
    const key = rowKey(current.spec.table, row)
    if (current.previousKey !== null && key <= current.previousKey) throw new Error(`${role} ${current.spec.table} primary keys are duplicate or out of order`)
    current.previousKey = key
    const encoded = canonicalContent(Object.fromEntries(current.spec.columns.map((column) => [column, row[column]])))
    if (current.rows.length) current.hash.update(',')
    current.hash.update(encoded)
    current.rows.push(row); dataRows++
  }

  for await (const chunk of createReadStream(file.path)) {
    fileHash.update(chunk); fileBytes += chunk.length
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk
    let newline
    while ((newline = pending.indexOf(10)) >= 0) {
      parseLine(pending.subarray(0, newline))
      pending = pending.subarray(newline + 1)
    }
    if (pending.length > maxLineBytes) throw new Error(`${role} line ${lineNumber + 1} exceeds the line limit`)
  }
  if (pending.length) throw new Error(`${role} is missing its final newline`)
  if (!lineNumber) throw new Error(`${role} is empty`)
  finishTable()
  equal(specIndex + 1, specs.length, `${role} table section count`)
  const artifact = { role, path: file.path, sha256: fileHash.digest('hex'), bytes: fileBytes }
  equal(artifact.sha256, file.sha256, `${role} file SHA-256`)
  if (file.bytes !== undefined) equal(artifact.bytes, file.bytes, `${role} file bytes`)
  equal(dataRows, [...expectedTables.values()].reduce((sum, table) => sum + table.rows, 0), `${role} total data rows`)
  return { tables, evidence: artifact, tableEvidence }
}

function validatePins(pins: CatalogueImportPins): CatalogueImportPins {
  for (const field of ['catalogueId', 'runKey', 'registryVersionId'] as const) string(pins[field], `pins.${field}`)
  if (!Number.isSafeInteger(pins.unionTaxa) || pins.unionTaxa < 1) throw new Error('pins.unionTaxa must be a positive safe integer')
  for (const field of ['inputFingerprint', 'responseFingerprint', 'unionFingerprint', 'baseAuditFingerprint', 'contentAuditFingerprint', 'contentFingerprint', 'taxonFingerprint'] as const) {
    requireSha256(pins[field], `pins.${field}`)
  }
  return { ...pins }
}

function validateCatalogueIdentity(value: unknown, pins: CatalogueImportPins, label: string, includesUnionTaxa = false) {
  const catalogue = record(value, `${label} catalogue`)
  for (const field of ['id', 'runKey', 'registryVersionId', 'inputFingerprint', 'responseFingerprint', 'unionFingerprint'] as const) {
    const expected = field === 'id' ? pins.catalogueId : pins[field]
    equal(catalogue[field], expected, `${label} catalogue ${field}`)
  }
  if (includesUnionTaxa) equal(catalogue.unionTaxa, pins.unionTaxa, `${label} catalogue unionTaxa`)
  return catalogue
}

function validateBaseManifest(value: JsonRecord, pins: CatalogueImportPins, artifactFile: ImportEvidenceFile) {
  exactKeys(value, ['schemaVersion', 'catalogue', 'auditFingerprint', 'eligible', 'blockers', 'payload'], 'base manifest')
  equal(value.schemaVersion, 1, 'base manifest schema version')
  validateCatalogueIdentity(value.catalogue, pins, 'base manifest')
  equal(value.auditFingerprint, pins.baseAuditFingerprint, 'base manifest audit fingerprint')
  equal(value.eligible, true, 'base manifest eligibility')
  exactArray(value.blockers, [], 'base manifest blockers')
  const payload = record(value.payload, 'base manifest payload')
  exactKeys(payload, ['format', 'artifact', 'tables', 'excludes', 'containsPersonalRows'], 'base manifest payload')
  equal(payload.format, 'standkreis-jsonl-v1', 'base transfer format')
  equal(payload.containsPersonalRows, false, 'base personal-row declaration')
  exactArray(payload.excludes, BASE_EXCLUDES, 'base excluded tables')
  const artifact = manifestArtifact(payload.artifact, 'base')
  equal(artifact.file, basename(artifactFile.path), 'base artifact filename')
  equal(artifact.sha256, artifactFile.sha256, 'base artifact pinned SHA-256')
  if (artifactFile.bytes !== undefined) equal(artifact.bytes, artifactFile.bytes, 'base artifact pinned bytes')
  const tables = manifestTables(payload.tables, TRANSFER_SPECS, 'base')
  equal(artifact.rows, [...tables.values()].reduce((sum, table) => sum + table.rows, 0), 'base manifest total rows')
  return { artifact, tables }
}

function validateGalleryManifest(value: JsonRecord, pins: CatalogueImportPins, artifactFile: ImportEvidenceFile) {
  exactKeys(value, ['schemaVersion', 'catalogue', 'contentFingerprint', 'taxonFingerprint', 'auditFingerprint', 'eligible', 'blockers', 'payload', 'excludes', 'networkClaim'], 'gallery manifest')
  equal(value.schemaVersion, 1, 'gallery manifest schema version')
  validateCatalogueIdentity(value.catalogue, pins, 'gallery manifest', true)
  equal(value.contentFingerprint, pins.contentFingerprint, 'gallery manifest content fingerprint')
  equal(value.taxonFingerprint, pins.taxonFingerprint, 'gallery manifest taxon fingerprint')
  equal(value.auditFingerprint, pins.contentAuditFingerprint, 'gallery manifest audit fingerprint')
  equal(value.eligible, true, 'gallery manifest eligibility')
  exactArray(value.blockers, [], 'gallery manifest blockers')
  exactArray(value.excludes, GALLERY_EXCLUDES, 'gallery excluded rows')
  string(value.networkClaim, 'gallery manifest network claim')
  const payload = record(value.payload, 'gallery manifest payload')
  exactKeys(payload, ['artifact', 'tables'], 'gallery manifest payload')
  const artifact = manifestArtifact(payload.artifact, 'gallery')
  equal(artifact.file, basename(artifactFile.path), 'gallery artifact filename')
  equal(artifact.sha256, artifactFile.sha256, 'gallery artifact pinned SHA-256')
  if (artifactFile.bytes !== undefined) equal(artifact.bytes, artifactFile.bytes, 'gallery artifact pinned bytes')
  const tables = manifestTables(payload.tables, GALLERY_SPECS, 'gallery')
  equal(artifact.rows, [...tables.values()].reduce((sum, table) => sum + table.rows, 0), 'gallery manifest total rows')
  return { artifact, tables }
}

function validateBaseAudit(value: JsonRecord, pins: CatalogueImportPins) {
  equal(contentDigest(value), pins.baseAuditFingerprint, 'base audit fingerprint')
  equal(value.schemaVersion, 1, 'base audit schema version')
  equal(value.verdict, 'ready-for-transfer', 'base audit verdict')
  exactArray(value.defects, [], 'base audit defects')
  const catalogue = validateCatalogueIdentity(value.catalogue, pins, 'base audit')
  equal(catalogue.countryCode, 'DE', 'base audit countryCode')
  equal(catalogue.status, 'active', 'base audit catalogue status')
  const review = record(value.review, 'base audit review summary')
  const required = integer(review.required, 'base audit required reviews')
  equal(review.failed, 0, 'base audit failed reviews')
  equal(review.missing, 0, 'base audit missing reviews')
  equal(review.passed, required, 'base audit passed reviews')
  equal(array(value.reviewTargets, 'base audit review targets').length, required, 'base audit review target count')
}

function validateGalleryAudit(value: JsonRecord, pins: CatalogueImportPins) {
  equal(contentDigest(value), pins.contentAuditFingerprint, 'content audit fingerprint')
  equal(value.schemaVersion, 1, 'content audit schema version')
  equal(value.verdict, 'ready-for-transfer', 'content audit verdict')
  exactArray(value.defects, [], 'content audit defects')
  exactArray(value.blockers, [], 'content audit blockers')
  exactArray(value.failures, [], 'content audit failures')
  const catalogue = validateCatalogueIdentity(value.catalogue, pins, 'content audit', true)
  equal(catalogue.countryCode, 'DE', 'content audit countryCode')
  equal(catalogue.status, 'active', 'content audit catalogue status')
  equal(value.contentFingerprint, pins.contentFingerprint, 'content audit content fingerprint')
  equal(value.taxonFingerprint, pins.taxonFingerprint, 'content audit taxon fingerprint')
  const versions = record(value.versions, 'content audit versions')
  equal(versions.gallery, CONTENT_WORK_VERSIONS.gallery, 'content audit gallery version')
  equal(versions.names, CONTENT_WORK_VERSIONS.names, 'content audit names version')
  const network = record(value.network, 'content audit network')
  equal(network.status, 'sample-passed', 'content audit sample review')
  equal(network.reviewed, array(network.targets, 'content audit network targets').length, 'content audit reviewed samples')
  const checks = record(network.urlChecks, 'content audit URL checks')
  equal(checks.supplied, true, 'content audit URL report supplied')
  equal(checks.failed, 0, 'content audit failed URLs')
  equal(checks.pending, 0, 'content audit pending URLs')
  equal(checks.passed, checks.urls, 'content audit passed URLs')
}

function table(tables: ReadonlyMap<string, readonly JsonRecord[]>, name: string) {
  const rows = tables.get(name)
  if (!rows) throw new Error(`validated bundle is missing ${name}`)
  return rows
}

function ids(rows: readonly JsonRecord[], field: string, label: string) {
  return new Set(rows.map((row) => string(row[field], `${label}.${field}`)))
}

function requireForeignKey(value: unknown, target: ReadonlySet<string>, label: string) {
  const key = string(value, label)
  if (!target.has(key)) throw new Error(`${label} does not reference the validated bundle`)
}

function validateRelationships(tables: ReadonlyMap<string, readonly JsonRecord[]>, pins: CatalogueImportPins, contentAudit: JsonRecord) {
  const taxa = table(tables, 'Taxon'), membership = table(tables, 'CatalogueTaxon')
  equal(taxa.length, pins.unionTaxa, 'Taxon union row count')
  const taxonIds = ids(taxa, 'id', 'Taxon'), memberIds = ids(membership, 'taxonId', 'CatalogueTaxon')
  equal(taxonIds.size, taxa.length, 'Taxon primary-key cardinality')
  equal(memberIds.size, membership.length, 'CatalogueTaxon membership cardinality')
  exactArray([...memberIds].sort(), [...taxonIds].sort(), 'Taxon/CatalogueTaxon membership')
  for (const row of membership) equal(row.catalogueVersionId, pins.catalogueId, 'CatalogueTaxon catalogue id')

  const catalogueRows = table(tables, 'CatalogueVersion')
  equal(catalogueRows.length, 1, 'CatalogueVersion row count')
  const catalogue = catalogueRows[0]!
  for (const [field, expected] of Object.entries({ id: pins.catalogueId, runKey: pins.runKey, registryVersionId: pins.registryVersionId,
    inputFingerprint: pins.inputFingerprint, responseFingerprint: pins.responseFingerprint, unionFingerprint: pins.unionFingerprint })) {
    equal(catalogue[field], expected, `CatalogueVersion.${field}`)
  }
  equal(catalogue.countryCode, 'DE', 'CatalogueVersion.countryCode')
  equal(catalogue.status, 'active', 'CatalogueVersion.status')
  equal(catalogue.unionTaxa, pins.unionTaxa, 'CatalogueVersion.unionTaxa')

  const registryRows = table(tables, 'RegionRegistryVersion')
  equal(registryRows.length, 1, 'RegionRegistryVersion row count')
  const registry = registryRows[0]!
  equal(registry.id, pins.registryVersionId, 'RegionRegistryVersion.id')
  equal(registry.countryCode, 'DE', 'RegionRegistryVersion.countryCode')
  equal(registry.active, true, 'RegionRegistryVersion.active')
  const registryVersions = ids(registryRows, 'id', 'RegionRegistryVersion')
  const regions = ids(table(tables, 'Region'), 'id', 'Region')
  equal(registry.expectedRegions, regions.size, 'RegionRegistryVersion.expectedRegions')
  const sources = table(tables, 'RegionRegistrySource'), sourceIds = ids(sources, 'id', 'RegionRegistrySource')
  for (const row of sources) requireForeignKey(row.registryVersionId, registryVersions, 'RegionRegistrySource.registryVersionId')
  const entries = table(tables, 'RegionRegistryEntry'), entryIds = ids(entries, 'id', 'RegionRegistryEntry')
  equal(entries.length, regions.size, 'RegionRegistryEntry/Region cardinality')
  for (const row of entries) {
    requireForeignKey(row.registryVersionId, registryVersions, 'RegionRegistryEntry.registryVersionId')
    requireForeignKey(row.sourceId, sourceIds, 'RegionRegistryEntry.sourceId')
    requireForeignKey(row.regionId, regions, 'RegionRegistryEntry.regionId')
    equal(sources.find((source) => source.id === row.sourceId)?.registryVersionId, row.registryVersionId, 'RegionRegistryEntry source registry')
  }
  for (const row of table(tables, 'RegionRegistryAlias')) requireForeignKey(row.registryEntryId, entryIds, 'RegionRegistryAlias.registryEntryId')
  const units = table(tables, 'RegionSourceUnit'), unitIds = ids(units, 'id', 'RegionSourceUnit')
  equal(registry.expectedSourceUnits, units.length, 'RegionRegistryVersion.expectedSourceUnits')
  for (const row of units) {
    requireForeignKey(row.registryVersionId, registryVersions, 'RegionSourceUnit.registryVersionId')
    requireForeignKey(row.registryEntryId, entryIds, 'RegionSourceUnit.registryEntryId')
    requireForeignKey(row.sourceId, sourceIds, 'RegionSourceUnit.sourceId')
    equal(entries.find((entry) => entry.id === row.registryEntryId)?.registryVersionId, row.registryVersionId, 'RegionSourceUnit entry registry')
    equal(sources.find((source) => source.id === row.sourceId)?.registryVersionId, row.registryVersionId, 'RegionSourceUnit source registry')
  }
  for (const row of table(tables, 'RegionQueryUnit')) {
    requireForeignKey(row.registryVersionId, registryVersions, 'RegionQueryUnit.registryVersionId')
    requireForeignKey(row.sourceUnitId, unitIds, 'RegionQueryUnit.sourceUnitId')
    requireForeignKey(row.sourceId, sourceIds, 'RegionQueryUnit.sourceId')
    equal(units.find((unit) => unit.id === row.sourceUnitId)?.registryVersionId, row.registryVersionId, 'RegionQueryUnit unit registry')
    equal(sources.find((source) => source.id === row.sourceId)?.registryVersionId, row.registryVersionId, 'RegionQueryUnit source registry')
  }
  const builds = table(tables, 'CatalogueRegionBuild'), buildIds = ids(builds, 'id', 'CatalogueRegionBuild')
  equal(catalogue.expectedRegions, regions.size, 'CatalogueVersion.expectedRegions')
  equal(builds.length, regions.size, 'CatalogueRegionBuild/Region cardinality')
  equal(catalogue.completedRegions, builds.filter((row) => row.status === 'complete').length, 'CatalogueVersion.completedRegions')
  equal(catalogue.completedRegions, catalogue.expectedRegions, 'CatalogueVersion complete region count')
  for (const row of builds) {
    equal(row.catalogueVersionId, pins.catalogueId, 'CatalogueRegionBuild.catalogueVersionId')
    equal(row.status, 'complete', 'CatalogueRegionBuild.status')
    requireForeignKey(row.registryVersionId, registryVersions, 'CatalogueRegionBuild.registryVersionId')
    requireForeignKey(row.registryEntryId, entryIds, 'CatalogueRegionBuild.registryEntryId')
    equal(entries.find((entry) => entry.id === row.registryEntryId)?.registryVersionId, row.registryVersionId, 'CatalogueRegionBuild entry registry')
  }
  for (const row of table(tables, 'CataloguePlausibility')) { requireForeignKey(row.regionBuildId, buildIds, 'CataloguePlausibility.regionBuildId'); requireForeignKey(row.taxonId, taxonIds, 'CataloguePlausibility.taxonId') }
  for (const row of table(tables, 'CatalogueLookalike')) { requireForeignKey(row.regionBuildId, buildIds, 'CatalogueLookalike.regionBuildId'); requireForeignKey(row.taxonId, taxonIds, 'CatalogueLookalike.taxonId'); requireForeignKey(row.siblingId, taxonIds, 'CatalogueLookalike.siblingId') }
  for (const row of table(tables, 'CatalogueTaxonomyResolution')) equal(row.catalogueVersionId, pins.catalogueId, 'CatalogueTaxonomyResolution.catalogueVersionId')

  const assets = table(tables, 'Asset')
  for (const asset of assets) {
    requireForeignKey(asset.taxonId, memberIds, 'Asset.taxonId')
    if (asset.kind !== 'image' || !['inat', 'commons'].includes(string(asset.origin, 'Asset.origin')) || asset.ownerId !== null || asset.sightingId !== null) {
      throw new Error('gallery artifact contains an unqualified reference Asset')
    }
  }
  const work = table(tables, 'TaxonEnrichmentWork'), workByTaxon = new Map<string, Set<string>>()
  for (const row of work) {
    const taxonId = string(row.taxonId, 'TaxonEnrichmentWork.taxonId')
    requireForeignKey(taxonId, memberIds, 'TaxonEnrichmentWork.taxonId')
    equal(row.status, 'complete', 'TaxonEnrichmentWork.status')
    const key = `${string(row.kind, 'TaxonEnrichmentWork.kind')}|${string(row.version, 'TaxonEnrichmentWork.version')}`
    const expected = new Set([`gallery|${CONTENT_WORK_VERSIONS.gallery}`, `names|${CONTENT_WORK_VERSIONS.names}`])
    if (!expected.has(key)) throw new Error('gallery artifact contains unrelated enrichment work')
    const found = workByTaxon.get(taxonId) ?? new Set<string>()
    if (found.has(key)) throw new Error('gallery artifact contains duplicate enrichment work')
    found.add(key); workByTaxon.set(taxonId, found)
  }
  for (const taxonId of memberIds) if (workByTaxon.get(taxonId)?.size !== 2) throw new Error(`gallery artifact lacks complete work for Taxon ${taxonId}`)

  equal(contentDigest(taxa), pins.taxonFingerprint, 'decoded Taxon fingerprint')
  const galleryCatalogue = record(contentAudit.catalogue, 'content audit catalogue')
  const contentAssets = assets.map((asset) => ({ ...asset, avatarOf: false }))
  equal(contentDigest({ catalogue: galleryCatalogue, taxa, assets: contentAssets, work }), pins.contentFingerprint, 'decoded content fingerprint')
}

function deepFreeze(value: unknown, seen = new Set<object>()): unknown {
  if (!value || typeof value !== 'object' || seen.has(value as object)) return value
  seen.add(value as object)
  for (const child of Object.values(value as JsonRecord)) deepFreeze(child, seen)
  return Object.freeze(value)
}

function readonlyMap<K, V>(source: Map<K, V>): ReadonlyMap<K, V> {
  const view: ReadonlyMap<K, V> = Object.freeze({
    get size() { return source.size },
    has: (key: K) => source.has(key),
    get: (key: K) => source.get(key),
    keys: () => source.keys(),
    values: () => source.values(),
    entries: () => source.entries(),
    [Symbol.iterator]: () => source[Symbol.iterator](),
    forEach: (callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: unknown) =>
      source.forEach((value, key) => callback.call(thisArg, value, key, view)),
  })
  return view
}

function sameEvidence(actual: ValidatedImportFile, expected: ValidatedImportFile) {
  equal(actual.path, expected.path, `${expected.role} path`)
  equal(actual.sha256, expected.sha256, `${expected.role} SHA-256 changed during validation`)
  equal(actual.bytes, expected.bytes, `${expected.role} bytes changed during validation`)
}

/**
 * Validates and decodes the immutable source bundle. It performs no database or provider access.
 * Call `assertStillValid` immediately before the apply transaction; mutation of returned rows is
 * prevented by recursively freezing the decoded JSON graph.
 */
export async function validateCatalogueImportBundle(input: CatalogueImportBundleInput): Promise<ValidatedCatalogueImport> {
  if (!input || typeof input !== 'object') throw new Error('catalogue import bundle input is required')
  const pins = validatePins(input.pins)
  const maxLineBytes = input.maxLineBytes ?? DEFAULT_MAX_LINE_BYTES
  if (!Number.isSafeInteger(maxLineBytes) || maxLineBytes < 1024 || maxLineBytes > 16 * 1024 * 1024) throw new Error('maxLineBytes must be between 1 KiB and 16 MiB')
  const files = {
    baseAudit: normalizedFile(input.base?.audit, 'base audit'),
    baseManifest: normalizedFile(input.base?.manifest, 'base manifest'),
    baseArtifact: normalizedFile(input.base?.artifact, 'base artifact'),
    galleryAudit: normalizedFile(input.gallery?.audit, 'content audit'),
    galleryManifest: normalizedFile(input.gallery?.manifest, 'gallery manifest'),
    galleryArtifact: normalizedFile(input.gallery?.artifact, 'gallery artifact'),
  }
  const expectedNames = { baseAudit: 'audit.json', baseManifest: 'transfer-manifest.json', baseArtifact: 'transfer-artifact.jsonl',
    galleryAudit: 'content-audit.json', galleryManifest: 'gallery-transfer-manifest.json', galleryArtifact: 'gallery-artifact.jsonl' }
  for (const [key, expected] of Object.entries(expectedNames)) equal(basename(files[key as keyof typeof files].path), expected, `${key} filename`)
  if (new Set(Object.values(files).map((file) => file.path)).size !== 6) throw new Error('catalogue import bundle paths must be distinct')

  // Establish the trust anchor before parsing any attacker-controlled bytes.
  const firstPass = await Promise.all([
    verifyFile(files.baseAudit, 'base audit'), verifyFile(files.baseManifest, 'base manifest'), verifyFile(files.baseArtifact, 'base artifact'),
    verifyFile(files.galleryAudit, 'content audit'), verifyFile(files.galleryManifest, 'gallery manifest'), verifyFile(files.galleryArtifact, 'gallery artifact'),
  ])
  const [baseAudit, baseManifest, galleryAudit, galleryManifest] = await Promise.all([
    readCanonicalJson(files.baseAudit, 'base audit', 'pretty'), readCanonicalJson(files.baseManifest, 'base manifest', 'pretty'),
    readCanonicalJson(files.galleryAudit, 'content audit', 'compact'), readCanonicalJson(files.galleryManifest, 'gallery manifest', 'compact'),
  ])
  ;[baseAudit.evidence, baseManifest.evidence, galleryAudit.evidence, galleryManifest.evidence].forEach((evidence) => {
    const expected = firstPass.find((file) => file.role === evidence.role)!
    sameEvidence(evidence, expected)
  })

  validateBaseAudit(baseAudit.value, pins)
  validateGalleryAudit(galleryAudit.value, pins)
  const baseContract = validateBaseManifest(baseManifest.value, pins, files.baseArtifact)
  const galleryContract = validateGalleryManifest(galleryManifest.value, pins, files.galleryArtifact)
  const base = await parseArtifact(files.baseArtifact, 'base artifact', pins.catalogueId, TRANSFER_SPECS, baseContract.tables, maxLineBytes)
  const gallery = await parseArtifact(files.galleryArtifact, 'gallery artifact', pins.catalogueId, GALLERY_SPECS, galleryContract.tables, maxLineBytes)
  sameEvidence(base.evidence, firstPass.find((file) => file.role === 'base artifact')!)
  sameEvidence(gallery.evidence, firstPass.find((file) => file.role === 'gallery artifact')!)
  equal(base.evidence.bytes, baseContract.artifact.bytes, 'base artifact manifest bytes')
  equal(gallery.evidence.bytes, galleryContract.artifact.bytes, 'gallery artifact manifest bytes')

  const combined = new Map<string, JsonRecord[]>()
  for (const source of [base.tables, gallery.tables]) for (const [name, rows] of source) {
    if (combined.has(name)) throw new Error(`duplicate table across transfer artifacts: ${name}`)
    combined.set(name, rows)
  }
  validateRelationships(combined, pins, galleryAudit.value)
  for (const rows of combined.values()) deepFreeze(rows)
  const decodedFingerprint = contentDigest([...combined].map(([table, rows]) => ({ table, rows })))
  const exposedTables = readonlyMap(combined) as ReadonlyMap<string, readonly JsonRecord[]>

  const evidenceFiles = [baseAudit.evidence, baseManifest.evidence, base.evidence, galleryAudit.evidence, galleryManifest.evidence, gallery.evidence]
  const evidence: ValidatedImportEvidence = Object.freeze({ files: Object.freeze(evidenceFiles.map((file) => Object.freeze({ ...file }))),
    tables: Object.freeze([...base.tableEvidence, ...gallery.tableEvidence].map((entry) => Object.freeze({ ...entry, columns: Object.freeze([...entry.columns]) }))),
    decodedFingerprint })
  const frozenPins = Object.freeze({ ...pins })
  const assertStillValid = async () => {
    equal(contentDigest([...combined].map(([table, rows]) => ({ table, rows }))), evidence.decodedFingerprint, 'decoded source graph changed after validation')
    const current = await Promise.all(evidence.files.map((file) => digestFile(file.path)))
    current.forEach((file, index) => {
      const expected = evidence.files[index]!
      equal(file.sha256, expected.sha256, `${expected.role} changed after validation`)
      equal(file.bytes, expected.bytes, `${expected.role} changed after validation`)
    })
  }
  return Object.freeze({ pins: frozenPins, tables: exposedTables, evidence, assertStillValid }) as ValidatedCatalogueImport
}
