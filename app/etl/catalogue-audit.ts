/**
 * Reproducible Germany-catalogue audit for issue #19.
 *
 * Run directly instead of through the general ETL CLI so an audit can be reviewed before its
 * command is made part of the routine production-transfer workflow:
 *
 *   npx tsx etl/catalogue-audit.ts --catalogue <id-or-run-key> --output /tmp/germany-audit
 *   npx tsx etl/catalogue-audit.ts --catalogue <id-or-run-key> --output /tmp/germany-audit \
 *     --review /absolute/path/to/review.json
 *
 * The output contains no personal rows. A blocked audit emits only metadata, findings and stable
 * digests; a reviewed, activated audit additionally emits a checked catalogue-only JSONL payload
 * for the separately gated production migration.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { z } from 'zod'
import { Prisma } from '../src/generated/prisma/client'
import { db } from './db'
import { TILES, isNow, tileOf, words } from './rules'
import { GERMANY_REGISTRY_SHA256, loadGermanyRegistry } from './registry/registry'
import { normalizeRegionAlias } from './registry-import'
import { exportLocalCatalogueArtifact, type TransferExport } from './catalogue-transfer'

const REQUIRED_SAMPLE_REGIONS = [
  { key: 'de-krg-11000000', category: 'urban' },
  { key: 'de-krg-07232000', category: 'rural' },
  { key: 'de-krg-09180000', category: 'alpine' },
  { key: 'de-krg-01054000', category: 'coastal' },
  { key: 'de-krg-14626000', category: 'eastern' },
  { key: 'de-krg-07340000', category: 'western' },
] as const

const PERSONAL_TABLES = ['Asset', 'EmailCode', 'Filter', 'Identity', 'Passkey', 'Sighting', 'Study'] as const
const REVIEW_CHECKS = ['species', 'naming', 'seasonality', 'boundary'] as const
type ReviewCheck = typeof REVIEW_CHECKS[number]

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

function importedAliases(values: readonly string[]) {
  const aliases = new Map<string, string>()
  for (const value of values) if (!aliases.has(normalizeRegionAlias(value))) aliases.set(normalizeRegionAlias(value), value)
  return [...aliases.values()].sort()
}

const reviewSchema = z.object({
  schemaVersion: z.literal(1),
  catalogueId: z.string().trim().min(1),
  inputFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  responseFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  unionFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  evidenceFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  regionExclusions: z.array(z.object({
    key: z.string().regex(/^de-krg-\d{8}$/),
    reason: z.string().trim().min(1),
    reviewer: z.string().trim().min(1),
    reviewedAt: z.string().datetime({ offset: true }),
  }).strict()),
  reviews: z.array(z.object({
    targetId: z.string().regex(/^region:de-krg-\d{8}$/),
    reviewer: z.string().trim().min(1),
    reviewedAt: z.string().datetime({ offset: true }),
    notes: z.string().trim().min(1),
    checks: z.object({
      species: z.enum(['pass', 'fail']),
      naming: z.enum(['pass', 'fail']),
      seasonality: z.enum(['pass', 'fail']),
      boundary: z.enum(['pass', 'fail']),
    }).strict(),
  }).strict()),
}).strict()

export type AuditTaxon = {
  id: string
  gbifKey: number
  sciName: string
  commonNames: unknown
  rank: string
  tile: string
  class: string | null
  order: string | null
  genus: string | null
}

export type AuditPlausibility = {
  taxon: AuditTaxon
  obs: number
  monthShare: number[]
  peak: number
  words: string
}

export type AuditRegion = {
  regionId: string
  key: string
  regionStatus: string
  sourceCode: string
  name: string
  sourceName: string
  stateCode: string
  state: string
  aliases: string[]
  sourceUnits: Array<{
    sourceCode: string
    name: string
    kind: string
    queryUnits: Array<{ provider: string; providerVersion: string; providerKey: string; reviewStatus: string; reviewedAt: string | null; evidence: unknown }>
  }>
  build: {
    id: string
    registryEntryId: string
    status: string
    attempts: number
    error: string | null
    totalObservations: number | null
    monthTotals: number[]
    regionSize: number | null
    nowCounts: number[]
    perTile: unknown
    rejectedTaxa: unknown
    responseFingerprint: string | null
    setFingerprint: string | null
    plausibility: AuditPlausibility[]
    lookalikes: Array<[number, number]>
  } | null
}

export type AuditSnapshot = {
  catalogue: {
    id: string
    countryCode: string
    runKey: string
    status: string
    registryVersionId: string
    registryVersion: string
    registryArtifactSha256: string
    inputFingerprint: string
    sourceFingerprint: string
    responseFingerprint: string | null
    unionFingerprint: string | null
    plausibleRulesVersion: number
    tileMappingVersion: number
    observationWindowVersion: number
    yearFrom: number
    yearTo: number
    occurrencePredicates: unknown
    expectedRegions: number
    completedRegions: number
    unionTaxa: number
    generatedAt: string | null
    sourceTopicDates: string[]
    sourceRecords: Array<{ role: string; sha256: string; topicDate: string }>
    sourceDetails: Array<{ role: string; name: string; url: string; topicDate: string; downloadedAt: string; sha256: string; licenceId: string; licenceUrl: string | null; attribution: string; metadata: unknown }>
    registryExpectedSourceUnits: number
    mappingMetadata: unknown
    mappingSource: { name: string; url: string; sha256: string } | null
  }
  regions: AuditRegion[]
  union: AuditTaxon[]
  taxonomy: Array<{
    sourceKey: number
    acceptedKey: number | null
    rejectionReason: string | null
    record: unknown
    recordFingerprint: string
  }>
}

export type Finding = {
  code: string
  severity: 'defect' | 'coverage-limit' | 'review'
  scope: string
  message: string
}

export type ReviewFile = {
  schemaVersion: 1
  catalogueId: string
  inputFingerprint: string
  responseFingerprint: string
  unionFingerprint: string
  evidenceFingerprint: string
  regionExclusions: Array<{ key: string; reason: string; reviewer: string; reviewedAt: string }>
  reviews: Array<{
    targetId: string
    reviewer: string
    reviewedAt: string
    notes: string
    checks: Record<ReviewCheck, 'pass' | 'fail'>
  }>
}

export function parseReviewFile(value: unknown): ReviewFile {
  return reviewSchema.parse(value)
}

export type ReviewTarget = {
  id: string
  key: string
  name: string
  state: string
  reasons: string[]
  evidence: {
    size: number | null
    observations: number | null
    perTile: Record<string, number>
    missingGermanNames: number
    rejectedTaxa: number
    sourceUnits: string[]
    queryUnits: string[]
    boundaryEvidence: Array<{ query: string; evidence: unknown }>
    topTaxa: Array<{ gbifKey: number; sciName: string; germanName: string | null; tile: string; obs: number; words: string }>
  }
  review: ReviewFile['reviews'][number] | null
}

export type CatalogueAudit = {
  schemaVersion: 1
  catalogue: AuditSnapshot['catalogue']
  completion: {
    intended: number
    complete: number
    ready: number
    failed: number
    pending: number
    running: number
    exclusions: ReviewFile['regionExclusions']
  }
  national: {
    uniqueTaxa: number
    computedUnionFingerprint: string
    perTile: Record<string, number>
  }
  taxonomy: {
    resolutions: number
    accepted: number
    rejected: number
    rejectionReasons: Record<string, number>
  }
  queryMapping: {
    sourceUnits: number
    mappedQueryUnits: number
    verifiedQueryUnits: number
    excludedQueryUnits: Array<{ providerKey: string; name: string; type: string; reason: string }>
  }
  distribution: {
    minimum: number | null
    q1: number | null
    median: number | null
    q3: number | null
    maximum: number | null
    lowerFence: number | null
    upperFence: number | null
    smallest: Array<{ key: string; name: string; size: number }>
    largest: Array<{ key: string; name: string; size: number }>
    belowFence: Array<{ key: string; name: string; size: number }>
    aboveFence: Array<{ key: string; name: string; size: number }>
  }
  southwestPalatinate: {
    key: string
    present: boolean
    sourceUnits: string[]
    queryUnits: string[]
    validComposition: boolean
  }
  anomalies: {
    taxonomy: Finding[]
    naming: Finding[]
    seasonality: Finding[]
    boundary: Finding[]
  }
  coverageLimits: Finding[]
  defects: Finding[]
  reviewTargets: ReviewTarget[]
  review: { required: number; passed: number; failed: number; missing: number }
  verdict: 'blocked' | 'ready-for-transfer'
}

export type TransferManifest = {
  schemaVersion: 1
  catalogue: {
    id: string
    runKey: string
    inputFingerprint: string
    responseFingerprint: string
    unionFingerprint: string
    registryVersionId: string
  }
  auditFingerprint: string
  eligible: boolean
  blockers: string[]
  payload: {
    format: 'standkreis-jsonl-v1'
    artifact: TransferExport['artifact'] | null
    tables: Array<{ table: string; columns: string[]; rows: number; digest: string }>
    excludes: readonly string[]
    containsPersonalRows: false
  }
}

export type AuditRegistryContract = {
  artifactSha256: string
  regions: number
  sourceUnits: number
  mappedQueryUnits: number
  provider: string
  providerVersion: string
  excludedQueryKeys: string[]
  excludedQueryUnits?: Array<{ providerKey: string; name: string; type: string; reason: string }>
  registrySources?: unknown
  registryRows?: unknown
  sampleRegions?: ReadonlyArray<{ key: string; category: string }>
  southwest?: { key: string; sourceUnits: string[] }
}

const CURRENT_REGISTRY_CONTRACT: AuditRegistryContract = {
  artifactSha256: GERMANY_REGISTRY_SHA256,
  regions: loadGermanyRegistry().registry.counts.regions,
  sourceUnits: loadGermanyRegistry().registry.counts.kreisUnits,
  mappedQueryUnits: 402,
  provider: 'gbifGadm',
  providerVersion: '4.1',
  excludedQueryKeys: ['DEU.1.5_1'],
  excludedQueryUnits: [{ providerKey: 'DEU.1.5_1', name: 'Bodensee', type: 'Water body', reason: 'not an official Kreis unit; marine/standalone water regions are out of scope' }],
  registrySources: loadGermanyRegistry().registry.sources.map((source) => ({
    role: source.role,
    name: `${source.product} ${source.layer}`,
    url: source.archiveUrl,
    topicDate: source.topicDate,
    downloadedAt: `${source.downloadedOn}T00:00:00.000Z`,
    sha256: source.archiveSha256,
    licenceId: source.licence.id,
    licenceUrl: source.licence.url,
    attribution: source.attribution,
    metadata: { authority: source.authority, product: source.product, layer: source.layer, productUrl: source.productUrl, dataSourcesUrl: source.dataSourcesUrl, licenceName: source.licence.name, changeNotice: source.changeNotice },
  })),
  sampleRegions: REQUIRED_SAMPLE_REGIONS,
  southwest: { key: 'de-krg-07340000', sourceUnits: ['07317', '07320', '07340'] },
  registryRows: loadGermanyRegistry().regions.map((region) => ({
    key: region.key,
    sourceCode: region.sourceKey,
    name: region.displayName,
    sourceName: region.sourceName,
    stateCode: region.stateCode,
    state: region.stateName,
    aliases: importedAliases(region.aliases),
    sourceUnits: region.kreisUnits.map((unit) => ({ sourceCode: unit.ags, name: unit.name, kind: unit.type })),
  })),
}

function jsonValue(value: unknown): Json {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('cannot canonicalize a non-finite number')
    return value
  }
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(jsonValue)
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, jsonValue(item)]))
  }
  throw new Error(`cannot canonicalize ${typeof value}`)
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(jsonValue(value))
}

export function sha256(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex')
}

export function deterministicJson(value: unknown): string {
  return `${JSON.stringify(jsonValue(value), null, 2)}\n`
}

function objectCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, number> = {}
  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0) result[key] = count
  }
  return result
}

function commonNames(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0))
}

function rejectedCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

function quantile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const position = (sorted.length - 1) * p
  const lo = Math.floor(position), hi = Math.ceil(position)
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (position - lo)
}

function regionDistribution(regions: AuditRegion[]): CatalogueAudit['distribution'] {
  const rows = regions.flatMap((region) => region.build?.status === 'complete' && region.build.regionSize !== null
    ? [{ key: region.key, name: region.name, size: region.build.regionSize }]
    : []).sort((a, b) => a.size - b.size || a.key.localeCompare(b.key))
  const values = rows.map((row) => row.size)
  const q1 = quantile(values, 0.25), q3 = quantile(values, 0.75)
  const lowerFence = q1 === null || q3 === null ? null : q1 - 1.5 * (q3 - q1)
  const upperFence = q1 === null || q3 === null ? null : q3 + 1.5 * (q3 - q1)
  return {
    minimum: values[0] ?? null,
    q1,
    median: quantile(values, 0.5),
    q3,
    maximum: values.at(-1) ?? null,
    lowerFence,
    upperFence,
    smallest: rows.slice(0, 5),
    largest: rows.slice(-5).reverse(),
    belowFence: lowerFence === null ? [] : rows.filter((row) => row.size < lowerFence),
    aboveFence: upperFence === null ? [] : rows.filter((row) => row.size > upperFence),
  }
}

function exactTileCounts(rows: AuditPlausibility[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const row of rows) counts[row.taxon.tile] = (counts[row.taxon.tile] ?? 0) + 1
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
}

function sameCounts(a: Record<string, number>, b: Record<string, number>): boolean {
  return canonicalJson(a) === canonicalJson(b)
}

function validateReviewFile(snapshot: AuditSnapshot, review: ReviewFile | null): Finding[] {
  if (!review) return []
  const findings: Finding[] = []
  if (review.schemaVersion !== 1) findings.push({ code: 'review-schema', severity: 'defect', scope: 'review', message: 'review schemaVersion must be 1' })
  if (review.catalogueId !== snapshot.catalogue.id) findings.push({ code: 'review-catalogue', severity: 'defect', scope: 'review', message: 'review catalogueId does not match the audited catalogue' })
  if (review.inputFingerprint !== snapshot.catalogue.inputFingerprint) findings.push({ code: 'review-input', severity: 'defect', scope: 'review', message: 'review inputFingerprint does not match the audited catalogue' })
  if (review.responseFingerprint !== snapshot.catalogue.responseFingerprint) findings.push({ code: 'review-response', severity: 'defect', scope: 'review', message: 'review responseFingerprint does not match the audited catalogue' })
  if (review.unionFingerprint !== snapshot.catalogue.unionFingerprint) findings.push({ code: 'review-union', severity: 'defect', scope: 'review', message: 'review unionFingerprint does not match the audited catalogue' })
  const ids = new Set<string>()
  const exclusionKeys = new Set<string>()
  for (const exclusion of review.regionExclusions) {
    if (exclusionKeys.has(exclusion.key)) findings.push({ code: 'region-exclusion-duplicate', severity: 'defect', scope: exclusion.key, message: 'region exclusion occurs more than once' })
    exclusionKeys.add(exclusion.key)
    if (!snapshot.regions.some((region) => region.key === exclusion.key)) findings.push({ code: 'region-exclusion-unknown', severity: 'defect', scope: exclusion.key, message: 'reviewed exclusion does not identify a registry region' })
  }
  for (const row of review.reviews) {
    if (ids.has(row.targetId)) findings.push({ code: 'review-duplicate', severity: 'defect', scope: row.targetId, message: 'review target occurs more than once' })
    ids.add(row.targetId)
    if (!row.reviewer.trim() || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(row.reviewedAt) || !row.notes.trim()) {
      findings.push({ code: 'review-evidence', severity: 'defect', scope: row.targetId, message: 'reviewer, UTC reviewedAt and non-empty notes are required' })
    }
    if (!row.checks || REVIEW_CHECKS.some((check) => row.checks[check] !== 'pass' && row.checks[check] !== 'fail')) {
      findings.push({ code: 'review-checks', severity: 'defect', scope: row.targetId, message: `review must decide ${REVIEW_CHECKS.join(', ')}` })
    }
  }
  return findings
}

function reviewTargets(snapshot: AuditSnapshot, distribution: CatalogueAudit['distribution'], review: ReviewFile | null, sampleRegions: ReadonlyArray<{ key: string; category: string }> = REQUIRED_SAMPLE_REGIONS): ReviewTarget[] {
  const reasons = new Map<string, Set<string>>()
  const add = (key: string, reason: string) => (reasons.get(key) ?? reasons.set(key, new Set()).get(key)!).add(reason)
  for (const sample of sampleRegions) add(sample.key, `representative:${sample.category}`)
  for (const exclusion of review?.regionExclusions ?? []) add(exclusion.key, 'reviewed-region-exclusion')
  for (const row of distribution.smallest) add(row.key, 'smallest')
  for (const row of distribution.largest) add(row.key, 'largest')
  for (const row of distribution.belowFence) add(row.key, 'below-tukey-fence')
  for (const row of distribution.aboveFence) add(row.key, 'above-tukey-fence')
  const completed = snapshot.regions.filter((region) => region.build?.status === 'complete')
  for (const region of [...completed].filter((region) => rejectedCount(region.build?.rejectedTaxa) > 0)
    .sort((a, b) => rejectedCount(b.build?.rejectedTaxa) - rejectedCount(a.build?.rejectedTaxa) || a.key.localeCompare(b.key)).slice(0, 5)) add(region.key, 'taxonomy-rejections')
  for (const region of [...completed].filter((region) => (region.build?.plausibility.some((item) => !commonNames(item.taxon.commonNames).de) ?? false))
    .sort((a, b) => {
      const missing = (row: AuditRegion) => row.build!.plausibility.filter((item) => !commonNames(item.taxon.commonNames).de).length / row.build!.plausibility.length
      return missing(b) - missing(a) || a.key.localeCompare(b.key)
    }).slice(0, 5)) add(region.key, 'missing-german-names')
  const reviews = new Map((review?.reviews ?? []).map((row) => [row.targetId, row]))

  return [...reasons].sort(([a], [b]) => a.localeCompare(b)).flatMap(([key, why]) => {
    const region = snapshot.regions.find((candidate) => candidate.key === key)
    if (!region) return []
    const rows = region.build?.plausibility ?? []
    const topTaxa = (TILES as readonly string[]).flatMap((tile) => [...rows]
      .filter((row) => row.taxon.tile === tile)
      .sort((a, b) => b.obs - a.obs || a.taxon.gbifKey - b.taxon.gbifKey)
      .slice(0, 3))
      .map((row) => ({
        gbifKey: row.taxon.gbifKey,
        sciName: row.taxon.sciName,
        germanName: commonNames(row.taxon.commonNames).de ?? null,
        tile: row.taxon.tile,
        obs: row.obs,
        words: row.words,
      }))
    return [{
      id: `region:${key}`,
      key,
      name: region.name,
      state: region.state,
      reasons: [...why].sort(),
      evidence: {
        size: region.build?.regionSize ?? null,
        observations: region.build?.totalObservations ?? null,
        perTile: objectCounts(region.build?.perTile),
        missingGermanNames: rows.filter((row) => !commonNames(row.taxon.commonNames).de).length,
        rejectedTaxa: rejectedCount(region.build?.rejectedTaxa),
        sourceUnits: region.sourceUnits.map((unit) => `${unit.sourceCode}:${unit.name}`).sort(),
        queryUnits: region.sourceUnits.flatMap((unit) => unit.queryUnits.map((query) => `${query.provider}@${query.providerVersion}:${query.providerKey}:${query.reviewStatus}`)).sort(),
        boundaryEvidence: region.sourceUnits.flatMap((unit) => unit.queryUnits.map((query) => ({ query: query.providerKey, evidence: query.evidence }))).sort((a, b) => a.query.localeCompare(b.query)),
        topTaxa,
      },
      review: reviews.get(`region:${key}`) ?? null,
    }]
  })
}

function reviewTargetEvidence(target: ReviewTarget) {
  return { id: target.id, key: target.key, name: target.name, state: target.state, reasons: target.reasons, evidence: target.evidence }
}

export function buildCatalogueAudit(
  snapshot: AuditSnapshot,
  review: ReviewFile | null = null,
  registryContract: AuditRegistryContract = CURRENT_REGISTRY_CONTRACT,
): CatalogueAudit {
  const defects: Finding[] = validateReviewFile(snapshot, review)
  const coverageLimits: Finding[] = []
  const taxonomy: Finding[] = []
  const naming: Finding[] = []
  const seasonality: Finding[] = []
  const boundary: Finding[] = []
  const finding = (bucket: Finding[], value: Finding) => {
    bucket.push(value)
    if (value.severity === 'defect') defects.push(value)
    if (value.severity === 'coverage-limit') coverageLimits.push(value)
  }

  const complete = snapshot.regions.filter((region) => region.build?.status === 'complete').length
  const statusCount = (status: string) => snapshot.regions.filter((region) => region.build?.status === status).length
  if (snapshot.catalogue.countryCode !== 'DE') finding(boundary, { code: 'country', severity: 'defect', scope: 'catalogue', message: 'catalogue countryCode is not DE' })
  if (review?.regionExclusions.length) defects.push({ code: 'region-exclusion-regeneration', severity: 'defect', scope: 'catalogue', message: 'reviewed region exclusions require regenerating the staged union/expected count; they cannot be applied as a paper-only audit exception' })
  if (snapshot.catalogue.registryArtifactSha256 !== registryContract.artifactSha256) finding(boundary, { code: 'registry-artifact', severity: 'defect', scope: 'registry', message: 'imported registry artifact does not match the source-controlled Germany registry' })
  if (snapshot.catalogue.expectedRegions !== registryContract.regions || snapshot.catalogue.registryExpectedSourceUnits !== registryContract.sourceUnits) finding(boundary, { code: 'registry-counts', severity: 'defect', scope: 'registry', message: `catalogue registry does not match the checked ${registryContract.regions}-region/${registryContract.sourceUnits}-Kreis snapshot` })
  if (registryContract.registryRows) {
    const loadedRegistryRows = snapshot.regions.map((region) => ({
      key: region.key,
      sourceCode: region.sourceCode,
      name: region.name,
      sourceName: region.sourceName,
      stateCode: region.stateCode,
      state: region.state,
      aliases: [...region.aliases].sort(),
      sourceUnits: region.sourceUnits.map((unit) => ({ sourceCode: unit.sourceCode, name: unit.name, kind: unit.kind })),
    }))
    if (canonicalJson(loadedRegistryRows) !== canonicalJson(registryContract.registryRows)) finding(boundary, { code: 'registry-membership', severity: 'defect', scope: 'registry', message: 'database names, states, aliases or constituent-Kreis assignments differ from the source-controlled registry' })
  }
  if (registryContract.registrySources) {
    const sourceRoles = new Set((registryContract.registrySources as Array<{ role: string }>).map((source) => source.role))
    const loadedSources = snapshot.catalogue.sourceDetails.filter((source) => sourceRoles.has(source.role))
    if (canonicalJson(loadedSources) !== canonicalJson(registryContract.registrySources)) finding(boundary, { code: 'registry-source-provenance', severity: 'defect', scope: 'registry', message: 'database source provenance or licence metadata differs from the source-controlled registry' })
  }

  const recomputedSourceFingerprint = sha256({
    artifact: snapshot.catalogue.registryArtifactSha256,
    sources: snapshot.catalogue.sourceRecords,
  })
  if (recomputedSourceFingerprint !== snapshot.catalogue.sourceFingerprint) defects.push({ code: 'source-fingerprint', severity: 'defect', scope: 'catalogue', message: 'stored source fingerprint does not match registry source records' })
  const recomputedInputFingerprint = sha256({
    registryVersionId: snapshot.catalogue.registryVersionId,
    registryVersion: snapshot.catalogue.registryVersion,
    sourceFingerprint: recomputedSourceFingerprint,
    rules: { plausible: snapshot.catalogue.plausibleRulesVersion, tile: snapshot.catalogue.tileMappingVersion },
    observation: { version: snapshot.catalogue.observationWindowVersion, yearFrom: snapshot.catalogue.yearFrom, yearTo: snapshot.catalogue.yearTo },
    occurrencePredicates: snapshot.catalogue.occurrencePredicates,
  })
  if (recomputedInputFingerprint !== snapshot.catalogue.inputFingerprint) defects.push({ code: 'input-fingerprint', severity: 'defect', scope: 'catalogue', message: 'stored input fingerprint does not match pinned catalogue inputs' })
  if (!['complete', 'active'].includes(snapshot.catalogue.status)) defects.push({ code: 'catalogue-incomplete', severity: 'defect', scope: 'catalogue', message: `catalogue status is ${snapshot.catalogue.status}` })
  if (snapshot.catalogue.status !== 'active') defects.push({ code: 'activation-required', severity: 'defect', scope: 'catalogue', message: 'reviewed catalogue has not been atomically activated' })
  if (snapshot.catalogue.expectedRegions !== snapshot.regions.length) defects.push({ code: 'region-count', severity: 'defect', scope: 'catalogue', message: `expected ${snapshot.catalogue.expectedRegions} regions but loaded ${snapshot.regions.length}` })
  if (snapshot.catalogue.completedRegions !== complete) defects.push({ code: 'completed-count', severity: 'defect', scope: 'catalogue', message: `stored completedRegions ${snapshot.catalogue.completedRegions} differs from ${complete}` })
  if (!snapshot.catalogue.generatedAt || !snapshot.catalogue.responseFingerprint || !snapshot.catalogue.unionFingerprint) defects.push({ code: 'catalogue-fingerprints', severity: 'defect', scope: 'catalogue', message: 'complete catalogue requires generatedAt and response/union fingerprints' })

  const unionByKey = new Map<number, AuditTaxon>()
  const missingGermanNames: number[] = []
  for (const taxon of snapshot.union) {
    if (unionByKey.has(taxon.gbifKey)) finding(taxonomy, { code: 'duplicate-gbif-key', severity: 'defect', scope: `taxon:${taxon.gbifKey}`, message: 'accepted GBIF key occurs twice in the national union' })
    unionByKey.set(taxon.gbifKey, taxon)
    if (taxon.rank !== 'species') finding(taxonomy, { code: 'rank', severity: 'defect', scope: `taxon:${taxon.gbifKey}`, message: `rank is ${taxon.rank}, expected species` })
    if (!taxon.sciName.trim() || taxon.sciName !== taxon.sciName.trim()) finding(naming, { code: 'scientific-name', severity: 'defect', scope: `taxon:${taxon.gbifKey}`, message: 'scientific name is empty or not trimmed' })
    if (!(TILES as readonly string[]).includes(taxon.tile)) finding(taxonomy, { code: 'tile', severity: 'defect', scope: `taxon:${taxon.gbifKey}`, message: `unknown tile ${taxon.tile}` })
    if (!taxon.commonNames || typeof taxon.commonNames !== 'object' || Array.isArray(taxon.commonNames) || Object.values(taxon.commonNames as Record<string, unknown>).some((name) => typeof name !== 'string' || !name.trim())) {
      finding(naming, { code: 'common-name-shape', severity: 'defect', scope: `taxon:${taxon.gbifKey}`, message: 'commonNames must be an object containing only non-empty strings' })
    }
    if (!commonNames(taxon.commonNames).de) missingGermanNames.push(taxon.gbifKey)
  }
  if (missingGermanNames.length) finding(naming, {
    code: 'missing-german-name',
    severity: 'coverage-limit',
    scope: 'catalogue',
    message: `${missingGermanNames.length} taxa lack a German common name; scientific-name fallback remains index-ready (first keys: ${missingGermanNames.slice(0, 20).join(', ')})`,
  })
  const names = new Map<string, number[]>()
  for (const taxon of snapshot.union) {
    const normalized = taxon.sciName.normalize('NFKC').toLocaleLowerCase('en')
    const keys = names.get(normalized) ?? []
    keys.push(taxon.gbifKey); names.set(normalized, keys)
  }
  for (const [name, keys] of names) if (keys.length > 1) finding(taxonomy, { code: 'duplicate-scientific-name', severity: 'defect', scope: `name:${name}`, message: `scientific name maps to accepted keys ${keys.sort((a, b) => a - b).join(', ')}` })

  const stagedKeys = new Set<number>()
  const notReady = snapshot.regions.filter((region) => region.regionStatus !== 'ready')
  if (notReady.length) defects.push({ code: 'regions-not-ready', severity: 'defect', scope: 'catalogue', message: `${notReady.length} intended German Region rows are not ready` })
  for (const region of snapshot.regions) {
    const build = region.build
    if (!build) {
      defects.push({ code: 'missing-build', severity: 'defect', scope: region.key, message: 'intended region has no catalogue build' })
      continue
    }
    if (build.status !== 'complete') defects.push({ code: 'unfinished-region', severity: 'defect', scope: region.key, message: `${build.status}${build.error ? `: ${build.error}` : ''}` })
    if (build.status === 'complete' && (!build.responseFingerprint || !build.setFingerprint)) defects.push({ code: 'region-fingerprints', severity: 'defect', scope: region.key, message: 'complete region lacks response or set fingerprint' })
    if (build.status === 'complete' && (build.regionSize === null || build.totalObservations === null)) defects.push({ code: 'region-summary', severity: 'defect', scope: region.key, message: 'complete region lacks its observation or set-size summary' })
    if (build.regionSize !== null && build.regionSize !== build.plausibility.length) defects.push({ code: 'region-size', severity: 'defect', scope: region.key, message: `stored size ${build.regionSize} differs from ${build.plausibility.length} rows` })
    if (!sameCounts(objectCounts(build.perTile), exactTileCounts(build.plausibility))) defects.push({ code: 'regional-tile-counts', severity: 'defect', scope: region.key, message: 'stored per-tile summary differs from staged membership' })
    const computedSetFingerprint = sha256({
      regionKey: region.key,
      total: build.totalObservations,
      monthTotals: build.monthTotals,
      perTile: objectCounts(build.perTile),
      taxa: build.plausibility.map((row) => ({ gbifKey: row.taxon.gbifKey, sciName: row.taxon.sciName, rank: row.taxon.rank, tile: row.taxon.tile, class: row.taxon.class, order: row.taxon.order, genus: row.taxon.genus })),
      plausibility: build.plausibility.map((row) => ({ gbifKey: row.taxon.gbifKey, obs: row.obs, monthShare: row.monthShare, peak: row.peak, words: row.words })),
      lookalikes: build.lookalikes,
      rejectedTaxa: build.rejectedTaxa,
    })
    if (build.setFingerprint && computedSetFingerprint !== build.setFingerprint) defects.push({ code: 'region-set-fingerprint', severity: 'defect', scope: region.key, message: 'stored set fingerprint does not match staged region rows' })
    if (build.status === 'complete' && (build.monthTotals.length !== 12 || build.monthTotals.some((value) => !Number.isSafeInteger(value) || value < 0))) finding(seasonality, { code: 'region-months', severity: 'defect', scope: region.key, message: 'regional month totals must contain 12 non-negative integers' })
    const computedNowCounts = Array.from({ length: 12 }, (_, month) => build.plausibility.filter((row) => isNow(row.monthShare, row.peak, month + 1)).length)
    if (build.status === 'complete' && build.nowCounts.length === 0) defects.push({ code: 'region-now-counts-missing', severity: 'defect', scope: region.key, message: 'derived monthly current-membership counts require activation-time backfill' })
    else if (build.status === 'complete' && canonicalJson(build.nowCounts) !== canonicalJson(computedNowCounts)) finding(seasonality, { code: 'region-now-counts', severity: 'defect', scope: region.key, message: 'stored monthly current-membership counts differ from staged seasonality' })

    for (const row of build.plausibility) {
      stagedKeys.add(row.taxon.gbifKey)
      const scope = `${region.key}/taxon:${row.taxon.gbifKey}`
      if (row.obs < 10 || !Number.isSafeInteger(row.obs)) defects.push({ code: 'observation-floor', severity: 'defect', scope, message: `membership observation count ${row.obs} violates the floor` })
      if (row.monthShare.length !== 12 || row.monthShare.some((value) => !Number.isSafeInteger(value) || value < 0)) finding(seasonality, { code: 'month-shares', severity: 'defect', scope, message: 'monthShare must contain 12 non-negative integers' })
      else {
        const computedPeak = Math.max(...row.monthShare)
        if (row.peak !== computedPeak) finding(seasonality, { code: 'peak', severity: 'defect', scope, message: `stored peak ${row.peak} differs from ${computedPeak}` })
        const computedWords = words(row.monthShare)
        if (row.words !== computedWords) finding(seasonality, { code: 'season-words', severity: 'defect', scope, message: `stored season words ${JSON.stringify(row.words)} differ from ${JSON.stringify(computedWords)}` })
      }
    }

    for (const unit of region.sourceUnits) {
      if (unit.queryUnits.length === 0) finding(boundary, { code: 'unmapped-source-unit', severity: 'defect', scope: `${region.key}/${unit.sourceCode}`, message: 'constituent Kreis has no occurrence query unit' })
      for (const query of unit.queryUnits) if (query.reviewStatus !== 'verified') finding(boundary, { code: 'unreviewed-query-unit', severity: 'defect', scope: `${region.key}/${query.providerKey}`, message: `query mapping status is ${query.reviewStatus}` })
    }
  }
  if (canonicalJson([...stagedKeys].sort((a, b) => a - b)) !== canonicalJson([...unionByKey.keys()].sort((a, b) => a - b))) defects.push({ code: 'union-membership', severity: 'defect', scope: 'catalogue', message: 'national union differs from distinct staged regional membership' })
  const computedUnionFingerprint = sha256([...unionByKey.keys()].sort((a, b) => a - b))
  if (snapshot.catalogue.unionFingerprint && snapshot.catalogue.unionFingerprint !== computedUnionFingerprint) defects.push({ code: 'union-fingerprint', severity: 'defect', scope: 'catalogue', message: 'stored union fingerprint does not match accepted keys' })
  if (snapshot.catalogue.unionTaxa !== unionByKey.size) defects.push({ code: 'union-count', severity: 'defect', scope: 'catalogue', message: `stored unionTaxa ${snapshot.catalogue.unionTaxa} differs from ${unionByKey.size}` })
  const computedResponseFingerprint = sha256(snapshot.regions
    .map((region) => ({ entry: region.build?.registryEntryId ?? '', response: region.build?.responseFingerprint ?? null }))
    .sort((a, b) => a.entry.localeCompare(b.entry)))
  if (snapshot.catalogue.responseFingerprint && computedResponseFingerprint !== snapshot.catalogue.responseFingerprint) defects.push({ code: 'response-fingerprint', severity: 'defect', scope: 'catalogue', message: 'stored response fingerprint does not match ordered regional response checkpoints' })

  const resolvedAcceptedKeys = new Set<number>()
  const rejectionReasons: Record<string, number> = {}
  for (const resolution of snapshot.taxonomy) {
    if (sha256(resolution.record) !== resolution.recordFingerprint) finding(taxonomy, { code: 'taxonomy-fingerprint', severity: 'defect', scope: `taxonomy:${resolution.sourceKey}`, message: 'taxonomy record fingerprint does not match its envelope' })
    if ((resolution.acceptedKey === null) === (resolution.rejectionReason === null)) finding(taxonomy, { code: 'taxonomy-envelope', severity: 'defect', scope: `taxonomy:${resolution.sourceKey}`, message: 'resolution must contain exactly one of acceptedKey and rejectionReason' })
    const record = resolution.record && typeof resolution.record === 'object' && !Array.isArray(resolution.record) ? resolution.record as Record<string, unknown> : null
    if (resolution.acceptedKey !== null) {
      resolvedAcceptedKeys.add(resolution.acceptedKey)
      const species = record?.species && typeof record.species === 'object' && !Array.isArray(record.species) ? record.species as Record<string, unknown> : null
      if (record?.status !== 'accepted' || record.acceptedKey !== resolution.acceptedKey || species?.key !== resolution.acceptedKey || species.rank !== 'SPECIES') {
        finding(taxonomy, { code: 'accepted-taxonomy-envelope', severity: 'defect', scope: `taxonomy:${resolution.sourceKey}`, message: 'accepted checkpoint does not contain its terminal accepted GBIF species' })
      } else {
        const taxon = unionByKey.get(resolution.acceptedKey)
        if (taxon) {
          const rank = (key: 'kingdom' | 'phylum' | 'class') => typeof species[key] === 'string' ? species[key] as string : undefined
          const expectedTile = tileOf({ kingdom: rank('kingdom'), phylum: rank('phylum'), class: rank('class') })
          const expectedName = typeof species.canonicalName === 'string' ? species.canonicalName : typeof species.scientificName === 'string' ? species.scientificName : null
          const nullable = (value: unknown) => typeof value === 'string' ? value : null
          if (expectedName !== taxon.sciName || expectedTile !== taxon.tile || nullable(species.class) !== taxon.class || nullable(species.order) !== taxon.order || nullable(species.genus) !== taxon.genus) {
            finding(taxonomy, { code: 'taxon-identity', severity: 'defect', scope: `taxon:${taxon.gbifKey}`, message: 'stored name, ranks or tile differ from the terminal accepted taxonomy checkpoint' })
          }
        }
      }
    } else if (resolution.rejectionReason !== null) {
      rejectionReasons[resolution.rejectionReason] = (rejectionReasons[resolution.rejectionReason] ?? 0) + 1
      if (record?.status !== 'rejected' || record.reason !== resolution.rejectionReason) finding(taxonomy, { code: 'rejected-taxonomy-envelope', severity: 'defect', scope: `taxonomy:${resolution.sourceKey}`, message: 'rejected checkpoint does not agree with its recorded reason' })
    }
  }
  for (const gbifKey of unionByKey.keys()) if (!resolvedAcceptedKeys.has(gbifKey)) finding(taxonomy, { code: 'union-taxonomy-provenance', severity: 'defect', scope: `taxon:${gbifKey}`, message: 'national-union taxon has no accepted taxonomy checkpoint in this catalogue' })

  const allQueryUnits = snapshot.regions.flatMap((region) => region.sourceUnits.flatMap((unit) => unit.queryUnits.map((query) => query.providerKey)))
  const allSourceUnits = snapshot.regions.flatMap((region) => region.sourceUnits)
  if (allSourceUnits.length !== snapshot.catalogue.registryExpectedSourceUnits) finding(boundary, { code: 'source-unit-count', severity: 'defect', scope: 'registry', message: `loaded ${allSourceUnits.length} source units, expected ${snapshot.catalogue.registryExpectedSourceUnits}` })
  const metadata = snapshot.catalogue.mappingMetadata && typeof snapshot.catalogue.mappingMetadata === 'object' && !Array.isArray(snapshot.catalogue.mappingMetadata)
    ? snapshot.catalogue.mappingMetadata as Record<string, unknown>
    : null
  const mappingCounts = metadata?.counts && typeof metadata.counts === 'object' && !Array.isArray(metadata.counts)
    ? metadata.counts as Record<string, unknown>
    : null
  const mappingReview = metadata?.review && typeof metadata.review === 'object' && !Array.isArray(metadata.review)
    ? metadata.review as Record<string, unknown>
    : null
  if (
    mappingCounts?.sourceUnits !== allSourceUnits.length ||
    mappingCounts?.mappedQueryUnits !== allQueryUnits.length ||
    mappingCounts?.excludedQueryUnits !== registryContract.excludedQueryKeys.length ||
    mappingCounts?.providerInventory !== allQueryUnits.length + registryContract.excludedQueryKeys.length ||
    allSourceUnits.length !== registryContract.sourceUnits ||
    allQueryUnits.length !== registryContract.mappedQueryUnits
  ) finding(boundary, { code: 'query-unit-count', severity: 'defect', scope: 'registry', message: `loaded ${allQueryUnits.length} query units; expected ${registryContract.mappedQueryUnits} plus exact source/exclusion/inventory counts in immutable metadata` })
  const rawExcluded = mappingReview?.excluded
  const excludedQueryUnits = Array.isArray(rawExcluded) ? rawExcluded.flatMap((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return []
    const value = row as Record<string, unknown>
    return typeof value.providerKey === 'string' && typeof value.name === 'string' && typeof value.type === 'string' && typeof value.reason === 'string'
      ? [{ providerKey: value.providerKey, name: value.name, type: value.type, reason: value.reason }]
      : []
  }).sort((a, b) => a.providerKey.localeCompare(b.providerKey)) : []
  const expectedExcluded = snapshot.catalogue.mappingMetadata && typeof snapshot.catalogue.mappingMetadata === 'object' && !Array.isArray(snapshot.catalogue.mappingMetadata)
    ? (snapshot.catalogue.mappingMetadata as { counts?: { excludedQueryUnits?: unknown } }).counts?.excludedQueryUnits
    : undefined
  if (typeof expectedExcluded !== 'number' || expectedExcluded !== excludedQueryUnits.length) finding(boundary, { code: 'query-exclusion-count', severity: 'defect', scope: 'registry', message: 'reviewed query exclusions do not agree with immutable mapping metadata' })
  if (canonicalJson(excludedQueryUnits.map((row) => row.providerKey)) !== canonicalJson(registryContract.excludedQueryKeys)) finding(boundary, { code: 'query-exclusions', severity: 'defect', scope: 'registry', message: `reviewed exclusions must be exactly ${registryContract.excludedQueryKeys.join(', ') || 'none'}` })
  if (registryContract.excludedQueryUnits && canonicalJson(excludedQueryUnits) !== canonicalJson(registryContract.excludedQueryUnits)) finding(boundary, { code: 'query-exclusion-evidence', severity: 'defect', scope: 'registry', message: 'reviewed open-water exclusion evidence differs from the Germany contract' })
  if (new Set(allQueryUnits).size !== allQueryUnits.length) finding(boundary, { code: 'duplicate-query-unit', severity: 'defect', scope: 'registry', message: 'an occurrence query unit is assigned more than once' })
  const mappingSha256 = typeof metadata?.mappingSha256 === 'string' ? metadata.mappingSha256 : null
  const mappingMethod = typeof mappingReview?.method === 'string' ? mappingReview.method : null
  const mappingOverlap = typeof mappingReview?.minimumLargestOverlap === 'number' ? mappingReview.minimumLargestOverlap : null
  const mappingReviewedAt = typeof metadata?.reviewedAt === 'string' ? metadata.reviewedAt : null
  const mappingResolvedAt = typeof metadata?.resolvedAt === 'string' ? metadata.resolvedAt : null
  const sameInstant = (a: string | null, b: string | null) => Boolean(a && b && new Date(a).getTime() === new Date(b).getTime())
  for (const region of snapshot.regions) for (const unit of region.sourceUnits) for (const query of unit.queryUnits) {
    const evidence = query.evidence && typeof query.evidence === 'object' && !Array.isArray(query.evidence) ? query.evidence as Record<string, unknown> : null
    if (query.provider !== registryContract.provider || query.providerVersion !== registryContract.providerVersion) finding(boundary, { code: 'query-provider', severity: 'defect', scope: `${region.key}/${query.providerKey}`, message: `query must use ${registryContract.provider} ${registryContract.providerVersion}` })
    if (
      !sameInstant(query.reviewedAt, mappingReviewedAt) || !evidence || evidence.resolvedAt !== mappingResolvedAt ||
      evidence.sourceUnitKey !== `de-krs-${unit.sourceCode}` || evidence.mappingSha256 !== mappingSha256 ||
      evidence.reviewMethod !== mappingMethod || evidence.minimumLargestOverlap !== mappingOverlap
    ) finding(boundary, { code: 'query-evidence', severity: 'defect', scope: `${region.key}/${query.providerKey}`, message: 'query mapping does not match its immutable reviewed mapping evidence' })
  }
  const mappingDocument = snapshot.catalogue.mappingSource && metadata ? {
    schemaVersion: 1,
    registryId: snapshot.catalogue.registryVersionId,
    provider: metadata.provider,
    providerVersion: metadata.providerVersion,
    source: { name: snapshot.catalogue.mappingSource.name.replace(/ → BKG VG250$/, ''), url: snapshot.catalogue.mappingSource.url, sha256: snapshot.catalogue.mappingSource.sha256 },
    gbifEvidence: metadata.gbifEvidence,
    resolvedAt: metadata.resolvedAt,
    reviewedAt: metadata.reviewedAt,
    counts: metadata.counts,
    review: metadata.review,
    mappings: snapshot.regions.flatMap((region) => region.sourceUnits).map((unit) => ({
      sourceUnitKey: `de-krs-${unit.sourceCode}`,
      providerKeys: unit.queryUnits.map((query) => query.providerKey).sort(),
    })).sort((a, b) => a.sourceUnitKey.localeCompare(b.sourceUnitKey)),
  } : null
  if (!mappingSha256 || !mappingDocument || sha256(mappingDocument) !== mappingSha256) finding(boundary, { code: 'query-mapping-fingerprint', severity: 'defect', scope: 'registry', message: 'the materialized 402-unit mapping does not reproduce its immutable mapping SHA-256' })
  finding(boundary, { code: 'gadm-approximation', severity: 'coverage-limit', scope: 'registry', message: 'GBIF/GADM query boundaries approximate authoritative BKG land geometry; the audit can prove reviewed mappings, not polygon equivalence' })
  coverageLimits.push({ code: 'provider-duplicates', severity: 'coverage-limit', scope: 'catalogue', message: 'GBIF facet counts may include provider/syndication duplicates because facets expose no occurrence identifiers' })
  if (excludedQueryUnits.length) coverageLimits.push({ code: 'query-unit-exclusions', severity: 'coverage-limit', scope: 'registry', message: `${excludedQueryUnits.length} reviewed open-water query unit(s) are excluded: ${excludedQueryUnits.map((row) => `${row.providerKey} ${row.name}`).join(', ')}` })

  const southwestContract = registryContract.southwest ?? { key: 'de-krg-07340000', sourceUnits: ['07317', '07320', '07340'] }
  const southwest = snapshot.regions.find((region) => region.key === southwestContract.key)
  const southwestUnits = southwest?.sourceUnits.map((unit) => unit.sourceCode).sort() ?? []
  const southwestQueries = southwest?.sourceUnits.flatMap((unit) => unit.queryUnits.map((query) => query.providerKey)).sort() ?? []
  const validComposition = canonicalJson(southwestUnits) === canonicalJson(southwestContract.sourceUnits)
  if (!southwest || !validComposition) finding(boundary, { code: 'southwest-palatinate', severity: 'defect', scope: southwestContract.key, message: `reviewed composite must contain exactly ${southwestContract.sourceUnits.join(', ')}` })

  const distribution = regionDistribution(snapshot.regions)
  const targets = reviewTargets(snapshot, distribution, review, registryContract.sampleRegions)
  const evidenceFingerprint = sha256(targets.map(reviewTargetEvidence))
  if (review && review.evidenceFingerprint !== evidenceFingerprint) defects.push({ code: 'review-evidence-fingerprint', severity: 'defect', scope: 'review', message: 'review evidenceFingerprint does not match the current review targets' })
  const targetIds = new Set(targets.map((target) => target.id))
  for (const row of review?.reviews ?? []) if (!targetIds.has(row.targetId)) defects.push({ code: 'review-unknown-target', severity: 'defect', scope: row.targetId, message: 'review target is not required by this catalogue audit' })
  for (const required of registryContract.sampleRegions ?? REQUIRED_SAMPLE_REGIONS) if (!snapshot.regions.some((region) => region.key === required.key)) defects.push({ code: 'sample-missing', severity: 'defect', scope: required.key, message: `required ${required.category} sample is absent` })
  const passed = targets.filter((target) => target.review && REVIEW_CHECKS.every((check) => target.review!.checks[check] === 'pass')).length
  const failed = targets.filter((target) => target.review && REVIEW_CHECKS.some((check) => target.review!.checks[check] === 'fail')).length
  const missing = targets.filter((target) => !target.review).length
  const perTile: Record<string, number> = {}
  for (const taxon of unionByKey.values()) perTile[taxon.tile] = (perTile[taxon.tile] ?? 0) + 1
  const sorted = (values: Finding[]) => values.sort((a, b) => a.code.localeCompare(b.code) || a.scope.localeCompare(b.scope) || a.message.localeCompare(b.message))
  sorted(defects); sorted(coverageLimits); sorted(taxonomy); sorted(naming); sorted(seasonality); sorted(boundary)

  return {
    schemaVersion: 1,
    catalogue: snapshot.catalogue,
    completion: { intended: snapshot.regions.length, complete, ready: snapshot.regions.length - notReady.length, failed: statusCount('failed'), pending: statusCount('pending'), running: statusCount('running'), exclusions: review?.regionExclusions ?? [] },
    national: { uniqueTaxa: unionByKey.size, computedUnionFingerprint, perTile: Object.fromEntries(Object.entries(perTile).sort(([a], [b]) => a.localeCompare(b))) },
    taxonomy: {
      resolutions: snapshot.taxonomy.length,
      accepted: snapshot.taxonomy.filter((row) => row.acceptedKey !== null).length,
      rejected: snapshot.taxonomy.filter((row) => row.rejectionReason !== null).length,
      rejectionReasons: Object.fromEntries(Object.entries(rejectionReasons).sort(([a], [b]) => a.localeCompare(b))),
    },
    queryMapping: {
      sourceUnits: allSourceUnits.length,
      mappedQueryUnits: allQueryUnits.length,
      verifiedQueryUnits: snapshot.regions.flatMap((region) => region.sourceUnits.flatMap((unit) => unit.queryUnits)).filter((query) => query.reviewStatus === 'verified').length,
      excludedQueryUnits,
    },
    distribution,
    southwestPalatinate: { key: southwestContract.key, present: Boolean(southwest), sourceUnits: southwestUnits, queryUnits: southwestQueries, validComposition },
    anomalies: { taxonomy, naming, seasonality, boundary },
    coverageLimits,
    defects,
    reviewTargets: targets,
    review: { required: targets.length, passed, failed, missing },
    verdict: defects.length === 0 && failed === 0 && missing === 0 ? 'ready-for-transfer' : 'blocked',
  }
}

export function buildTransferManifest(snapshot: AuditSnapshot, audit: CatalogueAudit, transfer: TransferExport | null = null): TransferManifest {
  const blockers = [
    ...audit.defects.map((finding) => `${finding.code}:${finding.scope}`),
    ...(audit.review.failed ? [`${audit.review.failed} review target(s) failed`] : []),
    ...(audit.review.missing ? [`${audit.review.missing} review target(s) missing`] : []),
    ...(!transfer ? ['checked transfer artifact not generated'] : []),
  ].sort()
  return {
    schemaVersion: 1,
    catalogue: {
      id: snapshot.catalogue.id,
      runKey: snapshot.catalogue.runKey,
      inputFingerprint: snapshot.catalogue.inputFingerprint,
      responseFingerprint: snapshot.catalogue.responseFingerprint ?? '',
      unionFingerprint: snapshot.catalogue.unionFingerprint ?? '',
      registryVersionId: snapshot.catalogue.registryVersionId,
    },
    auditFingerprint: sha256(audit),
    eligible: blockers.length === 0,
    blockers,
    payload: {
      format: 'standkreis-jsonl-v1',
      artifact: transfer?.artifact ?? null,
      tables: [...(transfer?.tables ?? [])].sort((a, b) => a.table.localeCompare(b.table)),
      excludes: PERSONAL_TABLES,
      containsPersonalRows: false,
    },
  }
}

const ACTIVATION_ONLY_FINDINGS = new Set(['activation-required', 'regions-not-ready', 'region-now-counts-missing'])

export function assertLocalDatabaseUrl(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('catalogue activation requires an explicit local DATABASE_URL')
  const hostname = new URL(connectionString).hostname
  if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
    throw new Error(`catalogue activation is local-only; database host ${hostname} is not local`)
  }
}

/**
 * Publish an already reviewed candidate into the local live set atomically. This deliberately has
 * no production override. #28 owns the separately reviewed production-data transfer.
 */
export async function activateLocalCatalogue(options: { catalogue: string; review: ReviewFile; activatedAt?: Date; registryContract?: AuditRegistryContract }) {
  assertLocalDatabaseUrl()
  const activatedAt = options.activatedAt ?? new Date()

  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'catalogue-activation:DE'}, 0))::text`
    const before = await loadAuditSnapshot(options.catalogue, tx)
    const audit = buildCatalogueAudit(before, options.review, options.registryContract)
    const blocking = audit.defects.filter((finding) => !ACTIVATION_ONLY_FINDINGS.has(finding.code))
    if (blocking.length || audit.review.failed || audit.review.missing) {
      throw new Error(`catalogue activation blocked: ${blocking.length} non-activation defects, ${audit.review.failed} failed reviews, ${audit.review.missing} missing reviews`)
    }
    if (before.catalogue.status === 'active' && audit.completion.ready === audit.completion.intended) return
    if (before.catalogue.status !== 'complete') throw new Error(`catalogue ${before.catalogue.id} must be complete before activation`)
    const regionIds = before.regions.map((region) => region.regionId).sort()
    if (new Set(regionIds).size !== before.catalogue.expectedRegions) throw new Error('catalogue builds do not map one-to-one onto intended regions')
    for (const region of before.regions) {
      const build = region.build!
      const nowCounts = Array.from({ length: 12 }, (_, month) => build.plausibility.filter((row) => isNow(row.monthShare, row.peak, month + 1)).length)
      await tx.catalogueRegionBuild.update({ where: { id: build.id }, data: { nowCounts } })
    }
    await tx.$executeRaw`UPDATE "Taxon" SET prose = jsonb_set(prose, '{regions}', (prose->'regions') - ${regionIds}::text[], false) WHERE prose->>'version' = '1' AND prose ? 'regions'`
    await tx.lookalike.deleteMany({ where: { regionId: { in: regionIds } } })
    await tx.plausibility.deleteMany({ where: { regionId: { in: regionIds } } })

    const taxonIds = new Map(before.regions.flatMap((region) => region.build?.plausibility ?? []).map((row) => [row.taxon.gbifKey, row.taxon.id]))
    const plausibility = before.regions.flatMap((region) => (region.build?.plausibility ?? []).map((row) => ({
      regionId: region.regionId,
      taxonId: row.taxon.id,
      obs: row.obs,
      monthShare: row.monthShare,
      peak: row.peak,
      words: row.words,
    })))
    const lookalikes = before.regions.flatMap((region) => (region.build?.lookalikes ?? []).map(([taxonKey, siblingKey]) => ({
      regionId: region.regionId,
      taxonId: taxonIds.get(taxonKey)!,
      siblingId: taxonIds.get(siblingKey)!,
    })))
    if (lookalikes.some((row) => !row.taxonId || !row.siblingId)) throw new Error('lookalike rows reference taxa outside the staged regional set')
    for (let offset = 0; offset < plausibility.length; offset += 2_000) await tx.plausibility.createMany({ data: plausibility.slice(offset, offset + 2_000) })
    for (let offset = 0; offset < lookalikes.length; offset += 2_000) await tx.lookalike.createMany({ data: lookalikes.slice(offset, offset + 2_000) })

    await tx.$executeRaw`
      UPDATE "Region" AS region
      SET status = 'ready'::"RegionStatus", error = NULL,
          "monthTotals" = build."monthTotals", "refreshedAt" = build."completedAt",
          "pickerSummary" = (
            SELECT jsonb_build_object(
              'version', 1, 'refreshedAt', ${activatedAt}::timestamptz, 'setSize', build."regionSize",
              'content', count(*) FILTER (WHERE taxon."contentAt" IS NOT NULL),
              'introEn', count(*) FILTER (WHERE taxon.intro->>'lang' = 'en'),
              'noGermanName', count(*) FILTER (WHERE taxon."contentAt" IS NOT NULL AND NOT coalesce(jsonb_typeof(taxon."commonNames"->'de') = 'string', false)),
              'nowCounts', to_jsonb(build."nowCounts")
            )
            FROM "CataloguePlausibility" AS candidate JOIN "Taxon" AS taxon ON taxon.id = candidate."taxonId"
            WHERE candidate."regionBuildId" = build.id
          )
      FROM "CatalogueRegionBuild" AS build
      JOIN "RegionRegistryEntry" AS entry ON entry.id = build."registryEntryId"
      WHERE build."catalogueVersionId" = ${before.catalogue.id} AND build.status = 'complete'::"CatalogueRegionBuildStatus"
        AND region.id = entry."regionId"
    `
    const ready = await tx.region.count({ where: { id: { in: regionIds }, status: 'ready' } })
    const livePlausibility = await tx.plausibility.count({ where: { regionId: { in: regionIds } } })
    const liveLookalikes = await tx.lookalike.count({ where: { regionId: { in: regionIds } } })
    if (ready !== before.catalogue.expectedRegions || livePlausibility !== plausibility.length || liveLookalikes !== lookalikes.length) throw new Error('live regional copy did not reproduce every staged row')

    await tx.catalogueVersion.updateMany({ where: { countryCode: 'DE', status: 'active', id: { not: before.catalogue.id } }, data: { status: 'retired' } })
    await tx.regionRegistryVersion.updateMany({ where: { countryCode: 'DE', active: true, id: { not: before.catalogue.registryVersionId } }, data: { active: false } })
    await tx.regionRegistryVersion.update({ where: { id: before.catalogue.registryVersionId }, data: { active: true, activatedAt } })
    await tx.catalogueVersion.update({ where: { id: before.catalogue.id }, data: { status: 'active', auditedAt: activatedAt, activatedAt } })
  }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 1_800_000 })
}

/** Load only catalogue/registry/taxon-owned fields; personal relations and mixed Asset rows are not selected. */
export async function loadAuditSnapshot(idOrRunKey: string, reader: typeof db | Prisma.TransactionClient = db): Promise<AuditSnapshot> {
  const found = await reader.catalogueVersion.findFirst({
    where: { OR: [{ id: idOrRunKey }, { countryCode: 'DE', runKey: idOrRunKey }] },
    select: { id: true },
  })
  if (!found) throw new Error(`Germany catalogue ${idOrRunKey} was not found`)
  const catalogue = await reader.catalogueVersion.findUnique({
    where: { id: found.id },
    select: {
      id: true, countryCode: true, runKey: true, status: true, registryVersionId: true,
      inputFingerprint: true, sourceFingerprint: true, responseFingerprint: true, unionFingerprint: true,
      plausibleRulesVersion: true, tileMappingVersion: true, observationWindowVersion: true,
      yearFrom: true, yearTo: true, occurrencePredicates: true, expectedRegions: true,
      completedRegions: true, unionTaxa: true, generatedAt: true,
    },
  })
  if (!catalogue) throw new Error(`Germany catalogue ${found.id} disappeared during audit loading`)
  const registry = await reader.regionRegistryVersion.findUnique({ where: { id: catalogue.registryVersionId } })
  if (!registry) throw new Error(`registry ${catalogue.registryVersionId} disappeared during audit loading`)
  // Keep these reads sequential. Prisma's pg transaction adapter has one client; relation includes
  // can issue concurrent queries and are unsafe while activation holds an interactive transaction.
  const sources = await reader.regionRegistrySource.findMany({ where: { registryVersionId: registry.id }, orderBy: [{ role: 'asc' }, { id: 'asc' }] })
  const entries = await reader.regionRegistryEntry.findMany({ where: { registryVersionId: registry.id }, orderBy: [{ sourceCode: 'asc' }, { id: 'asc' }] })
  const regionRows = await reader.region.findMany({ where: { id: { in: entries.map((entry) => entry.regionId) } }, select: { id: true, canonicalKey: true, status: true } })
  const aliases = await reader.regionRegistryAlias.findMany({ where: { registryEntryId: { in: entries.map((entry) => entry.id) } }, orderBy: [{ normalizedName: 'asc' }, { id: 'asc' }] })
  const sourceUnits = await reader.regionSourceUnit.findMany({ where: { registryVersionId: registry.id }, orderBy: [{ sourceCode: 'asc' }, { id: 'asc' }] })
  const queryUnits = await reader.regionQueryUnit.findMany({ where: { registryVersionId: registry.id }, orderBy: [{ providerKey: 'asc' }, { id: 'asc' }] })
  const builds = await reader.catalogueRegionBuild.findMany({ where: { catalogueVersionId: catalogue.id }, orderBy: [{ registryEntryId: 'asc' }, { id: 'asc' }] })
  const buildIds = builds.map((build) => build.id)
  const plausibility = await reader.cataloguePlausibility.findMany({ where: { regionBuildId: { in: buildIds } }, orderBy: [{ regionBuildId: 'asc' }, { taxonId: 'asc' }] })
  const lookalikes = await reader.catalogueLookalike.findMany({ where: { regionBuildId: { in: buildIds } }, orderBy: [{ regionBuildId: 'asc' }, { taxonId: 'asc' }, { siblingId: 'asc' }] })
  const unionRows = await reader.catalogueTaxon.findMany({ where: { catalogueVersionId: catalogue.id }, orderBy: { taxonId: 'asc' } })
  const taxonIds = [...new Set([...plausibility.map((row) => row.taxonId), ...unionRows.map((row) => row.taxonId)])]
  const taxa = await reader.taxon.findMany({
    where: { id: { in: taxonIds } },
    select: { id: true, gbifKey: true, sciName: true, commonNames: true, rank: true, tile: true, class: true, order: true, genus: true },
  })
  const taxonomy = await reader.catalogueTaxonomyResolution.findMany({ where: { catalogueVersionId: catalogue.id }, orderBy: { sourceKey: 'asc' } })

  const regionById = new Map(regionRows.map((region) => [region.id, region]))
  const aliasesByEntry = Map.groupBy(aliases, (alias) => alias.registryEntryId)
  const unitsByEntry = Map.groupBy(sourceUnits, (unit) => unit.registryEntryId)
  const queriesByUnit = Map.groupBy(queryUnits, (query) => query.sourceUnitId)
  const buildsByEntry = Map.groupBy(builds, (build) => build.registryEntryId)
  const plausibilityByBuild = Map.groupBy(plausibility, (row) => row.regionBuildId)
  const lookalikesByBuild = Map.groupBy(lookalikes, (row) => row.regionBuildId)
  const taxonById = new Map(taxa.map((taxon) => [taxon.id, taxon]))

  const regions: AuditRegion[] = entries.map((entry) => {
    const region = regionById.get(entry.regionId)
    if (!region) throw new Error(`registry entry ${entry.id} references missing region ${entry.regionId}`)
    const build = buildsByEntry.get(entry.id)?.[0] ?? null
    const buildPlausibility = build ? (plausibilityByBuild.get(build.id) ?? []) : []
    const gbifByTaxonId = new Map(buildPlausibility.map((row) => [row.taxonId, taxonById.get(row.taxonId)?.gbifKey]))
    return {
      regionId: region.id,
      key: region.canonicalKey ?? entry.sourceCode,
      regionStatus: region.status,
      sourceCode: entry.sourceCode,
      name: entry.displayName,
      sourceName: entry.sourceName,
      stateCode: entry.stateCode,
      state: entry.stateName,
      aliases: (aliasesByEntry.get(entry.id) ?? []).map((alias) => alias.name).sort(),
      sourceUnits: (unitsByEntry.get(entry.id) ?? []).map((unit) => ({
        sourceCode: unit.sourceCode,
        name: unit.name,
        kind: unit.kind,
        queryUnits: (queriesByUnit.get(unit.id) ?? []).map((query) => ({ provider: query.provider, providerVersion: query.providerVersion, providerKey: query.providerKey, reviewStatus: query.reviewStatus, reviewedAt: query.reviewedAt?.toISOString() ?? null, evidence: query.evidence })),
      })),
      build: build ? {
        id: build.id,
        registryEntryId: build.registryEntryId,
        status: build.status,
        attempts: build.attempts,
        error: build.error,
        totalObservations: build.totalObservations,
        monthTotals: build.monthTotals,
        regionSize: build.regionSize,
        nowCounts: build.nowCounts,
        perTile: build.perTile,
        rejectedTaxa: build.rejectedTaxa,
        responseFingerprint: build.responseFingerprint,
        setFingerprint: build.setFingerprint,
        plausibility: buildPlausibility.map((row) => {
          const taxon = taxonById.get(row.taxonId)
          if (!taxon) throw new Error(`catalogue plausibility ${row.id} references missing taxon ${row.taxonId}`)
          return { taxon: { ...taxon, tile: taxon.tile }, obs: row.obs, monthShare: row.monthShare, peak: row.peak, words: row.words }
        }).sort((a, b) => a.taxon.gbifKey - b.taxon.gbifKey),
        lookalikes: (lookalikesByBuild.get(build.id) ?? []).map((row) => {
          const taxonKey = gbifByTaxonId.get(row.taxonId), siblingKey = gbifByTaxonId.get(row.siblingId)
          if (taxonKey === undefined || siblingKey === undefined) throw new Error(`catalogue lookalike ${row.id} references a taxon outside build ${build.id}`)
          return [taxonKey, siblingKey] as [number, number]
        }).sort(([a, siblingA], [b, siblingB]) => a - b || siblingA - siblingB),
      } : null,
    }
  })
  const union = unionRows.map((row) => {
    const taxon = taxonById.get(row.taxonId)
    if (!taxon) throw new Error(`catalogue union references missing taxon ${row.taxonId}`)
    return { ...taxon, tile: taxon.tile }
  }).sort((a, b) => a.gbifKey - b.gbifKey)

  return {
    catalogue: {
      id: catalogue.id,
      countryCode: catalogue.countryCode,
      runKey: catalogue.runKey,
      status: catalogue.status,
      registryVersionId: catalogue.registryVersionId,
      registryVersion: registry.version,
      registryArtifactSha256: registry.artifactSha256,
      inputFingerprint: catalogue.inputFingerprint,
      sourceFingerprint: catalogue.sourceFingerprint,
      responseFingerprint: catalogue.responseFingerprint,
      unionFingerprint: catalogue.unionFingerprint,
      plausibleRulesVersion: catalogue.plausibleRulesVersion,
      tileMappingVersion: catalogue.tileMappingVersion,
      observationWindowVersion: catalogue.observationWindowVersion,
      yearFrom: catalogue.yearFrom,
      yearTo: catalogue.yearTo,
      occurrencePredicates: catalogue.occurrencePredicates,
      expectedRegions: catalogue.expectedRegions,
      completedRegions: catalogue.completedRegions,
      unionTaxa: catalogue.unionTaxa,
      generatedAt: catalogue.generatedAt?.toISOString() ?? null,
      sourceTopicDates: [...new Set(sources.map((source) => source.topicDate.toISOString().slice(0, 10)))].sort(),
      sourceRecords: sources.map((source) => ({ role: source.role, sha256: source.sha256, topicDate: source.topicDate.toISOString().slice(0, 10) })),
      sourceDetails: sources.map((source) => ({
        role: source.role,
        name: source.name,
        url: source.url,
        topicDate: source.topicDate.toISOString().slice(0, 10),
        downloadedAt: source.downloadedAt.toISOString(),
        sha256: source.sha256,
        licenceId: source.licenceId,
        licenceUrl: source.licenceUrl,
        attribution: source.attribution,
        metadata: source.metadata,
      })),
      registryExpectedSourceUnits: registry.expectedSourceUnits,
      mappingMetadata: sources.find((source) => source.role === 'queryMappings')?.metadata ?? null,
      mappingSource: (() => {
        const source = sources.find((candidate) => candidate.role === 'queryMappings')
        return source ? { name: source.name, url: source.url, sha256: source.sha256 } : null
      })(),
    },
    regions,
    union,
    taxonomy: taxonomy.map((row) => ({ sourceKey: row.sourceKey, acceptedKey: row.acceptedKey, rejectionReason: row.rejectionReason, record: row.record, recordFingerprint: row.recordFingerprint })),
  }
}

export function makeReviewTemplate(audit: CatalogueAudit): ReviewFile {
  return {
    schemaVersion: 1,
    catalogueId: audit.catalogue.id,
    inputFingerprint: audit.catalogue.inputFingerprint,
    responseFingerprint: audit.catalogue.responseFingerprint ?? '',
    unionFingerprint: audit.catalogue.unionFingerprint ?? '',
    evidenceFingerprint: sha256(audit.reviewTargets.map(reviewTargetEvidence)),
    regionExclusions: audit.completion.exclusions,
    reviews: audit.reviewTargets.map((target) => ({
      targetId: target.id,
      reviewer: '',
      reviewedAt: '',
      notes: '',
      checks: { species: 'fail', naming: 'fail', seasonality: 'fail', boundary: 'fail' },
    })),
  }
}

export async function writeAuditBundle(options: { catalogue: string; output: string; review?: string; activateLocal?: boolean }): Promise<{ audit: CatalogueAudit; manifest: TransferManifest }> {
  const review = options.review ? parseReviewFile(JSON.parse(await readFile(resolve(options.review), 'utf8'))) : null
  if (options.activateLocal) {
    if (!review) throw new Error('--activate-local requires --review')
    await activateLocalCatalogue({ catalogue: options.catalogue, review })
  }
  const snapshot = await loadAuditSnapshot(options.catalogue)
  const audit = buildCatalogueAudit(snapshot, review)
  const output = resolve(options.output), artifactPath = resolve(output, 'transfer-artifact.jsonl')
  await mkdir(output, { recursive: true })
  const transfer = audit.verdict === 'ready-for-transfer'
    ? await exportLocalCatalogueArtifact({ catalogueId: snapshot.catalogue.id, path: artifactPath })
    : null
  if (!transfer) await unlink(artifactPath).catch(() => undefined)
  const manifest = buildTransferManifest(snapshot, audit, transfer)
  await Promise.all([
    writeFile(resolve(output, 'audit.json'), deterministicJson(audit)),
    writeFile(resolve(output, 'review-template.json'), deterministicJson(makeReviewTemplate(audit))),
    writeFile(resolve(output, 'transfer-manifest.json'), deterministicJson(manifest)),
  ])
  return { audit, manifest }
}

export function parseAuditArgs(args: string[]) {
  const values = new Map<string, string>()
  let activateLocal = false
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!
    if (argument === '--activate-local') {
      if (activateLocal) throw new Error('duplicate catalogue audit argument --activate-local')
      activateLocal = true
      continue
    }
    if (!['--catalogue', '--output', '--review'].includes(argument)) throw new Error(`unknown catalogue audit argument ${argument}`)
    if (values.has(argument)) throw new Error(`duplicate catalogue audit argument ${argument}`)
    const value = args[++index]
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`)
    values.set(argument, value)
  }
  const catalogue = values.get('--catalogue'), output = values.get('--output'), review = values.get('--review')
  if (!catalogue || !output) throw new Error('usage: npx tsx etl/catalogue-audit.ts --catalogue <id-or-run-key> --output <directory> [--review <review.json>] [--activate-local]')
  return { catalogue, output, review, activateLocal }
}

async function main() {
  const { catalogue, output, review, activateLocal } = parseAuditArgs(process.argv.slice(2))
  const result = await writeAuditBundle({ catalogue, output, review, activateLocal })
  console.log(`audit ${result.audit.verdict}: ${result.audit.defects.length} defects · ${result.audit.review.missing} reviews missing · ${result.audit.coverageLimits.length} coverage limits`)
  console.log(`manifest ${result.manifest.eligible ? 'eligible' : 'blocked'} · ${resolve(output)}`)
  if (!result.manifest.eligible) process.exitCode = 2
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => db.$disconnect())
}
