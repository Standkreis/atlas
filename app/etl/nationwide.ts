import { randomUUID } from 'node:crypto'
import { Prisma } from '../src/generated/prisma/client'
import { OBSERVATION_WINDOW } from '../src/domain/observationWindow'
import { isNow } from '../src/domain/rules'
import { resolveAcceptedSpecies, type AcceptedTaxonomyResult, type SpeciesLookup, type SpeciesMatchLookup } from './accepted-taxonomy'
import { db } from './db'
import { failedCaptureRequests, withFreshCache, withResponseCapture, type RequestStats } from './fetch'
import { BASIS, gbifSpecies, gbifSpeciesMatch, type Species } from './gbif'
import { fingerprint } from './fingerprint'
import { catalogueHabitatResolver, decodeHabitatBatch, filterMarineRegion, habitatAudit, MARINE_RULE_VERSION, WORMS_SOURCE, type HabitatLookup, type HabitatRegionSummary, type HabitatStore } from './marine-habitat'
import {
  calculateRegistryRegion,
  type RegionJobDependencies,
  type RegistryRegionCalculation,
  type TaxonomyResolutionSummary,
} from './region'

export { canonicalJson, fingerprint } from './fingerprint'

export const NATIONWIDE_RULES = {
  // v2 resolves doubtful GBIF variants to an exact accepted concept before floors and tile cuts.
  plausible: 2,
  tileMapping: 1,
  habitat: MARINE_RULE_VERSION,
} as const

const COUNTRY = 'DE'
const DEFAULT_LEASE_MS = 15 * 60_000
const MAX_CONCURRENCY = 4

const OCCURRENCE_PREDICATES = {
  basisOfRecord: [...BASIS].sort(),
  hasCoordinate: true,
  occurrenceStatus: 'PRESENT',
} as const

export type CatalogueHandle = {
  id: string
  countryCode: string
  runKey: string
  registryVersionId: string
  status: string
  inputFingerprint: string
  sourceFingerprint: string
  expectedRegions: number
  completedRegions: number
  unionTaxa: number
}

export type RegionClaim = {
  id: string
  registryEntryId: string
  regionKey: string
  attempts: number
}

export type StoredTaxonomyResolution = {
  sourceKey: number
  acceptedKey: number | null
  rejectionReason: string | null
  record: unknown
  recordFingerprint: string
}

export type StagedRegion = {
  calculation: RegistryRegionCalculation
  habitatSummary: HabitatRegionSummary
  responseFingerprint: string
  setFingerprint: string
  requestStats: RequestStats
}

export type RegionReport = {
  key: string
  name: string
  state: string
  status: string
  attempts: number
  observations: number | null
  size: number | null
  perTile: Record<string, number>
  rejectedTaxa: number
  habitatSummary: HabitatRegionSummary | null
  requestStats: RequestStats
  seconds: number | null
  error: string | null
  responseFingerprint: string | null
  setFingerprint: string | null
}

export type NationwideReport = {
  catalogue: {
    id: string
    countryCode: string
    runKey: string
    status: string
    inputFingerprint: string
    sourceFingerprint: string
    responseFingerprint: string | null
    unionFingerprint: string | null
    registryVersionId: string
    registryVersion: string
    sourceTopicDates: string[]
    observationWindow: { version: number; yearFrom: number; yearTo: number }
    plausibleRulesVersion: number
    tileMappingVersion: number
    habitatRulesVersion: number
    habitatSource: unknown
    occurrencePredicates: unknown
    startedAt: string
    generatedAt: string | null
    elapsedSeconds: number
  }
  regions: {
    expected: number
    complete: number
    failed: number
    pending: number
    running: number
    rows: RegionReport[]
  }
  national: {
    uniqueTaxa: number
    perTile: Record<string, number>
    unionFingerprint: string
    contentComplete: number
    contentAwaiting: number
  }
  enrichment: Record<string, Record<string, number>>
  habitat: ReturnType<typeof habitatAudit> | null
  requests: RequestStats
  outliers: {
    smallest: { key: string; size: number }[]
    largest: { key: string; size: number }[]
    belowFence: { key: string; size: number }[]
    aboveFence: { key: string; size: number }[]
  }
  stoppedReason: string | null
}

export type PrepareCatalogueInput = {
  registryVersionId: string
  runKey: string
  countryCode: string
  plausibleRulesVersion: number
  tileMappingVersion: number
  habitatRulesVersion: number
  habitatSource: typeof WORMS_SOURCE
  observationWindowVersion: number
  yearFrom: number
  yearTo: number
  occurrencePredicates: typeof OCCURRENCE_PREDICATES
}

export type NationwideStore = HabitatStore & {
  prepare(input: PrepareCatalogueInput): Promise<CatalogueHandle>
  acquireExecution(catalogueId: string, owner: string, now: Date, expiresAt: Date): Promise<boolean>
  renewExecution(catalogueId: string, owner: string, now: Date, expiresAt: Date): Promise<boolean>
  releaseExecution(catalogueId: string, owner: string): Promise<void>
  claimRegion(catalogueId: string, owner: string, now: Date, expiresAt: Date, attempted: ReadonlySet<string>): Promise<RegionClaim | null>
  renewRegion(catalogueId: string, claimId: string, owner: string, now: Date, expiresAt: Date): Promise<boolean>
  stageRegion(catalogue: CatalogueHandle, claim: RegionClaim, owner: string, at: Date, staged: StagedRegion): Promise<boolean>
  failRegion(catalogueId: string, claim: RegionClaim, owner: string, at: Date, error: string, attemptRequests: RequestStats): Promise<boolean>
  loadTaxonomy(catalogueId: string, sourceKeys: readonly number[]): Promise<StoredTaxonomyResolution[]>
  saveTaxonomy(catalogueId: string, rows: readonly StoredTaxonomyResolution[]): Promise<void>
  finalize(catalogueId: string, owner: string, at: Date): Promise<boolean>
  report(catalogueId: string, stoppedReason?: string | null): Promise<NationwideReport>
}

function assertRunKey(value: string) {
  if (!value.trim() || value.length > 120) throw new Error('runKey must contain 1–120 characters')
}

function assertConcurrency(value: number) {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_CONCURRENCY) {
    throw new Error(`nationwide concurrency must be an integer from 1 to ${MAX_CONCURRENCY}`)
  }
}

function requestStats(value: unknown): RequestStats {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const perHostSource = source.perHost && typeof source.perHost === 'object' ? source.perHost as Record<string, unknown> : {}
  const perHost = Object.fromEntries(Object.entries(perHostSource)
    .filter(([, count]) => Number.isFinite(count) && Number(count) >= 0)
    .map(([host, count]) => [host, Number(count)]))
  const count = (key: string) => Number.isFinite(source[key]) && Number(source[key]) >= 0 ? Number(source[key]) : 0
  return {
    perHost,
    networkAttempts: count('networkAttempts'),
    hits: count('hits'),
    misses: count('misses'),
    retries: count('retries'),
    tooMany: count('tooMany'),
  }
}

function addRequestStats(values: RequestStats[]): RequestStats {
  const out: RequestStats = { perHost: {}, networkAttempts: 0, hits: 0, misses: 0, retries: 0, tooMany: 0 }
  for (const value of values) {
    for (const [host, count] of Object.entries(value.perHost)) out.perHost[host] = (out.perHost[host] ?? 0) + count
    out.networkAttempts = (out.networkAttempts ?? 0) + (value.networkAttempts ?? 0)
    out.hits += value.hits
    out.misses += value.misses
    out.retries += value.retries
    out.tooMany += value.tooMany
  }
  return out
}

function taxonomyEnvelope(row: TaxonomyResolutionSummary): StoredTaxonomyResolution {
  const record = row.status === 'accepted'
    ? { version: 1, status: 'accepted', acceptedKey: row.acceptedKey, species: row.species }
    : { version: 1, status: 'rejected', reason: row.reason }
  return {
    sourceKey: row.sourceKey,
    acceptedKey: row.status === 'accepted' ? row.acceptedKey : null,
    rejectionReason: row.status === 'rejected' ? row.reason : null,
    record,
    recordFingerprint: fingerprint(record),
  }
}

function decodeTaxonomy(row: StoredTaxonomyResolution): TaxonomyResolutionSummary {
  if (fingerprint(row.record) !== row.recordFingerprint) {
    throw new Error(`taxonomy checkpoint ${row.sourceKey} does not match its fingerprint`)
  }
  const envelope = row.record as { version?: unknown; status?: unknown; acceptedKey?: unknown; species?: unknown; reason?: unknown }
  if (envelope.version !== 1) throw new Error(`taxonomy checkpoint ${row.sourceKey} has an unsupported envelope version`)
  if (row.acceptedKey !== null) {
    if (envelope.status !== 'accepted' || envelope.acceptedKey !== row.acceptedKey || !envelope.species || typeof envelope.species !== 'object') {
      throw new Error(`taxonomy checkpoint ${row.sourceKey} has an invalid accepted envelope`)
    }
    return { sourceKey: row.sourceKey, status: 'accepted', acceptedKey: row.acceptedKey, species: envelope.species as Species }
  }
  if (!row.rejectionReason || envelope.status !== 'rejected' || envelope.reason !== row.rejectionReason) {
    throw new Error(`taxonomy checkpoint ${row.sourceKey} has an invalid rejection envelope`)
  }
  return { sourceKey: row.sourceKey, status: 'rejected', reason: row.rejectionReason }
}

function acceptedResult(rows: TaxonomyResolutionSummary[]): AcceptedTaxonomyResult {
  const resolved = new Map<number, { sourceKey: number; acceptedKey: number; species: Species }>()
  const rejected: { sourceKey: number; reason: string }[] = []
  for (const row of rows.sort((a, b) => a.sourceKey - b.sourceKey)) {
    if (row.status === 'accepted') resolved.set(row.sourceKey, { sourceKey: row.sourceKey, acceptedKey: row.acceptedKey, species: row.species })
    else rejected.push({ sourceKey: row.sourceKey, reason: row.reason })
  }
  return { resolved, rejected }
}

/** Catalogue-scoped taxonomy cache. The serialization chain prevents duplicate lookup batches under region concurrency. */
export function catalogueTaxonomyResolver(
  catalogueId: string,
  store: NationwideStore,
  lookup: SpeciesLookup = gbifSpecies,
  match: SpeciesMatchLookup = gbifSpeciesMatch,
  resolveMissing: (sourceKeys: readonly number[]) => Promise<AcceptedTaxonomyResult> = (sourceKeys) => resolveAcceptedSpecies(sourceKeys, lookup, match),
): (sourceKeys: readonly number[]) => Promise<AcceptedTaxonomyResult> {
  let chain: Promise<unknown> = Promise.resolve()
  return (sourceKeys) => {
    const work = chain.then(async () => {
      const keys = [...new Set(sourceKeys)].sort((a, b) => a - b)
      const stored = await store.loadTaxonomy(catalogueId, keys)
      const byKey = new Map(stored.map((row) => [row.sourceKey, decodeTaxonomy(row)]))
      const missing = keys.filter((key) => !byKey.has(key))
      if (missing.length > 0) {
        const fresh = await resolveMissing(missing)
        const summaries: TaxonomyResolutionSummary[] = [
          ...[...fresh.resolved.values()].map((row) => ({ sourceKey: row.sourceKey, status: 'accepted' as const, acceptedKey: row.acceptedKey, species: row.species })),
          ...fresh.rejected.map((row) => ({ sourceKey: row.sourceKey, status: 'rejected' as const, reason: row.reason })),
        ]
        // Accepted terminal records are useful checkpoints when they later appear as raw facet keys.
        for (const row of [...fresh.resolved.values()]) {
          if (!byKey.has(row.acceptedKey) && !summaries.some((summary) => summary.sourceKey === row.acceptedKey)) {
            summaries.push({ sourceKey: row.acceptedKey, status: 'accepted', acceptedKey: row.acceptedKey, species: row.species })
          }
        }
        await store.saveTaxonomy(catalogueId, summaries.map(taxonomyEnvelope))
        for (const row of summaries) byKey.set(row.sourceKey, row)
      }
      return acceptedResult(keys.map((key) => {
        const row = byKey.get(key)
        if (!row) throw new Error(`taxonomy checkpoint did not resolve source key ${key}`)
        return row
      }))
    })
    chain = work.catch(() => undefined)
    return work
  }
}

function setFingerprint(calculation: RegistryRegionCalculation): string {
  return fingerprint({
    regionKey: calculation.target.regionKey,
    total: calculation.total,
    monthTotals: calculation.monthTotals,
    perTile: calculation.perTile,
    taxa: calculation.taxa,
    plausibility: calculation.plausibility,
    lookalikes: calculation.lookalikePairs,
    rejectedTaxa: calculation.rejectedTaxa,
  })
}

function responseFingerprint(captured: string, taxonomy: TaxonomyResolutionSummary[]): string {
  return fingerprint({
    captured,
    taxonomy: taxonomy.map(taxonomyEnvelope).map((row) => ({ sourceKey: row.sourceKey, recordFingerprint: row.recordFingerprint })),
  })
}

function stopReason(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error)
  if (/total request budget exhausted/i.test(message)) return 'request budget exhausted'
  if (/(^|\s)429(\s|$)/.test(message)) return 'upstream rate limit persisted after retries'
  return null
}

export type NationwideOptions = {
  registryVersionId: string
  runKey: string
  countryCode?: string
  concurrency?: number
  leaseMs?: number
  owner?: string
  now?: () => Date
  log?: (message: string) => void
  store?: NationwideStore
  calculate?: typeof calculateRegistryRegion
  regionDependencies?: Partial<RegionJobDependencies>
  species?: SpeciesLookup
  match?: SpeciesMatchLookup
  habitatLookup?: HabitatLookup
  fresh?: typeof withFreshCache
  capture?: typeof withResponseCapture
}

export type NationwideResult = {
  catalogueId: string
  owner: string | null
  attempted: number
  completed: number
  failed: number
  lost: number
  stoppedReason: string | null
  report: NationwideReport
}

/**
 * Build or resume one pinned national catalogue. All calculated regional rows land in versioned
 * staging tables; this workflow deliberately never writes Region, Plausibility, Lookalike or prose.
 */
export async function runNationwide(options: NationwideOptions): Promise<NationwideResult> {
  assertRunKey(options.runKey)
  const concurrency = options.concurrency ?? 1
  assertConcurrency(concurrency)
  const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 1_000) throw new Error('nationwide leaseMs must be at least 1000 ms')
  const now = options.now ?? (() => new Date())
  const log = options.log ?? console.log
  const store = options.store ?? prismaStore
  if (store === prismaStore) {
    const url = new URL(process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex')
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Germany catalogue generation requires local Postgres')
  }
  const calculate = options.calculate ?? calculateRegistryRegion
  const fresh = options.fresh ?? withFreshCache
  const capture = options.capture ?? withResponseCapture
  const catalogue = await store.prepare({
    registryVersionId: options.registryVersionId,
    runKey: options.runKey,
    countryCode: options.countryCode ?? COUNTRY,
    plausibleRulesVersion: NATIONWIDE_RULES.plausible,
    tileMappingVersion: NATIONWIDE_RULES.tileMapping,
    habitatRulesVersion: NATIONWIDE_RULES.habitat,
    habitatSource: WORMS_SOURCE,
    observationWindowVersion: OBSERVATION_WINDOW.version,
    yearFrom: OBSERVATION_WINDOW.firstYear,
    yearTo: OBSERVATION_WINDOW.lastYear,
    occurrencePredicates: OCCURRENCE_PREDICATES,
  })

  if (!['building', 'partial'].includes(catalogue.status)) {
    return { catalogueId: catalogue.id, owner: null, attempted: 0, completed: 0, failed: 0, lost: 0, stoppedReason: null, report: await store.report(catalogue.id) }
  }

  const owner = options.owner ?? randomUUID()
  const acquiredAt = now()
  if (!await store.acquireExecution(catalogue.id, owner, acquiredAt, new Date(acquiredAt.getTime() + leaseMs))) {
    throw new Error(`catalogue ${catalogue.id} is already running under another execution lease`)
  }

  const upstreamTaxonomy = options.regionDependencies?.taxonomy
  const habitat = catalogueHabitatResolver(catalogue.id, store, options.habitatLookup, now)
  const taxonomy = catalogueTaxonomyResolver(
    catalogue.id,
    store,
    options.regionDependencies?.species ?? options.species ?? gbifSpecies,
    options.match ?? gbifSpeciesMatch,
    upstreamTaxonomy,
  )
  const attempted = new Set<string>()
  let completed = 0
  let failed = 0
  let lost = 0
  let stopped: string | null = null
  let executionLost = false
  let heartbeatBusy = false
  const heartbeatEvery = Math.max(1_000, Math.floor(leaseMs / 3))
  const heartbeat = setInterval(() => {
    if (heartbeatBusy || executionLost) return
    heartbeatBusy = true
    const at = now()
    void store.renewExecution(catalogue.id, owner, at, new Date(at.getTime() + leaseMs))
      .then((ok) => { if (!ok) executionLost = true })
      .catch(() => { executionLost = true })
      .finally(() => { heartbeatBusy = false })
  }, heartbeatEvery)
  heartbeat.unref?.()

  try {
    const worker = async () => {
      while (!stopped && !executionLost) {
        const at = now()
        if (!await store.renewExecution(catalogue.id, owner, at, new Date(at.getTime() + leaseMs))) {
          executionLost = true
          return
        }
        const claim = await store.claimRegion(catalogue.id, owner, at, new Date(at.getTime() + leaseMs), attempted)
        if (!claim) return
        attempted.add(claim.id)
        let claimLost = false
        let claimHeartbeatBusy = false
        let attemptRequests = requestStats(null)
        const claimHeartbeat = setInterval(() => {
          if (claimHeartbeatBusy || claimLost) return
          claimHeartbeatBusy = true
          const heartbeatAt = now()
          void store.renewRegion(catalogue.id, claim.id, owner, heartbeatAt, new Date(heartbeatAt.getTime() + leaseMs))
            .then((ok) => { if (!ok) claimLost = true })
            .catch(() => { claimLost = true })
            .finally(() => { claimHeartbeatBusy = false })
        }, heartbeatEvery)
        claimHeartbeat.unref?.()
        try {
          const captured = await capture(() => fresh(async () => {
            const calculation = await calculate(catalogue.registryVersionId, claim.regionKey, log, { ...options.regionDependencies, taxonomy })
            return filterMarineRegion(calculation, await habitat(calculation.taxa.map((taxon) => taxon.sciName)))
          }))
          attemptRequests = captured.requests
          if (claimLost) throw new Error(`region claim lease lost for ${claim.regionKey}`)
          const staged: StagedRegion = {
            calculation: captured.value.calculation,
            habitatSummary: captured.value.summary,
            responseFingerprint: fingerprint({ taxonomy: responseFingerprint(captured.fingerprint, captured.value.calculation.taxonomyResolutions), habitat: captured.value.summary.evidenceFingerprint }),
            setFingerprint: setFingerprint(captured.value.calculation),
            requestStats: captured.requests,
          }
          if (await store.stageRegion(catalogue, claim, owner, now(), staged)) {
            completed++
            log(`✓ ${claim.regionKey} · ${staged.calculation.plausibility.length} taxa · attempt ${claim.attempts}`)
          } else {
            lost++
            executionLost = true
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (await store.failRegion(catalogue.id, claim, owner, now(), message, failedCaptureRequests(error) ?? attemptRequests)) failed++
          else lost++
          const terminal = stopReason(error)
          if (terminal) stopped = terminal
          log(`✗ ${claim.regionKey}: ${message}`)
        } finally {
          clearInterval(claimHeartbeat)
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker))
    if (executionLost) stopped ??= 'execution lease lost'
    // Finalization also reconciles incomplete runs to `partial` and persists the completed count.
    if (!executionLost) await store.finalize(catalogue.id, owner, now())
  } finally {
    clearInterval(heartbeat)
    await store.releaseExecution(catalogue.id, owner)
  }

  const report = await store.report(catalogue.id, stopped)
  return { catalogueId: catalogue.id, owner, attempted: attempted.size, completed, failed, lost, stoppedReason: stopped, report }
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const position = (sorted.length - 1) * p
  const lo = Math.floor(position), hi = Math.ceil(position)
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (position - lo)
}

export function catalogueOutliers(rows: RegionReport[]): NationwideReport['outliers'] {
  const sizes = rows
    .filter((row): row is RegionReport & { size: number } => row.status === 'complete' && row.size !== null)
    .map((row) => ({ key: row.key, size: row.size }))
    .sort((a, b) => a.size - b.size || a.key.localeCompare(b.key))
  const values = sizes.map((row) => row.size)
  const q1 = quantile(values, 0.25), q3 = quantile(values, 0.75), iqr = q3 - q1
  const lower = q1 - 1.5 * iqr, upper = q3 + 1.5 * iqr
  return {
    smallest: sizes.slice(0, 5),
    largest: sizes.slice(-5).reverse(),
    belowFence: sizes.filter((row) => row.size < lower),
    aboveFence: sizes.filter((row) => row.size > upper),
  }
}

export function formatNationwideReport(report: NationwideReport): string {
  const region = report.regions
  const state = `${region.complete}/${region.expected} complete · ${region.failed} failed · ${region.pending} pending · ${region.running} running`
  const tiles = Object.entries(report.national.perTile).sort(([a], [b]) => a.localeCompare(b)).map(([tile, count]) => `${tile} ${count}`).join(' · ') || 'none'
  const sizes = region.rows.flatMap((row) => row.size === null ? [] : row.size)
  const sizeRange = sizes.length ? `${Math.min(...sizes)}–${Math.max(...sizes)} taxa/region` : 'no completed regional sizes'
  const enrichment = Object.entries(report.enrichment).sort(([a], [b]) => a.localeCompare(b)).map(([phase, counts]) => (
    `${phase} ${Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([status, count]) => `${status} ${count}`).join('/')}`
  )).join(' · ') || 'not seeded'
  const outliers = [...report.outliers.belowFence, ...report.outliers.aboveFence].map((row) => `${row.key} ${row.size}`).join(' · ') || 'none'
  const requestsTotal = report.requests.networkAttempts ?? Object.values(report.requests.perHost).reduce((sum, count) => sum + count, 0)
  const stop = report.stoppedReason ? `\nStopped: ${report.stoppedReason}` : ''
  return [
    `Germany catalogue ${report.catalogue.runKey} (${report.catalogue.id}) · ${report.catalogue.status}`,
    `Registry ${report.catalogue.registryVersion} (${report.catalogue.registryVersionId}) · observations ${report.catalogue.observationWindow.yearFrom}–${report.catalogue.observationWindow.yearTo} (v${report.catalogue.observationWindow.version})`,
    `Regions ${state} · ${sizeRange}`,
    `National union ${report.national.uniqueTaxa} taxa · ${tiles}`,
    ...(report.habitat ? [`Habitat v${report.habitat.version}: ${report.habitat.names} names matched · ${report.habitat.reasons.marine ?? 0} marine excluded · coverage ${JSON.stringify(report.habitat.reasons)}`] : []),
    `Content ${report.national.contentComplete} complete · ${report.national.contentAwaiting} awaiting`,
    `Enrichment ${enrichment}`,
    `Regional size outliers ${outliers}`,
    `Requests ${requestsTotal} network attempts · ${report.requests.retries} retries · ${report.requests.tooMany} rate limits · ${report.catalogue.elapsedSeconds.toFixed(1)} s`,
  ].join('\n') + stop
}

/** Read a durable machine report without acquiring or resuming an execution lease. */
export function reportNationwide(
  catalogueId: string,
  store: NationwideStore = prismaStore,
): Promise<NationwideReport> {
  return store.report(catalogueId)
}

const prismaStore: NationwideStore = {
  async prepare(input) {
    const registry = await db.regionRegistryVersion.findUnique({
      where: { id: input.registryVersionId },
      include: {
        sources: { orderBy: { role: 'asc' } },
        entries: { orderBy: { sourceCode: 'asc' }, select: { id: true, sourceCode: true, region: { select: { canonicalKey: true } } } },
      },
    })
    if (!registry) throw new Error(`no registry version ${input.registryVersionId}`)
    if (registry.countryCode !== input.countryCode) throw new Error(`registry ${registry.id} belongs to ${registry.countryCode}, not ${input.countryCode}`)
    if (registry.entries.length !== registry.expectedRegions) throw new Error(`registry ${registry.id} has ${registry.entries.length}/${registry.expectedRegions} entries`)
    if (registry.entries.some((entry) => !entry.region.canonicalKey)) throw new Error(`registry ${registry.id} contains a region without a canonical key`)
    const sourceFingerprint = fingerprint({
      artifact: registry.artifactSha256,
      sources: registry.sources.map((source) => ({ role: source.role, sha256: source.sha256, topicDate: source.topicDate.toISOString().slice(0, 10) })),
    })
    const inputFingerprint = fingerprint({
      registryVersionId: registry.id,
      registryVersion: registry.version,
      sourceFingerprint,
      rules: { plausible: input.plausibleRulesVersion, tile: input.tileMappingVersion, habitat: input.habitatRulesVersion },
      habitatSource: input.habitatSource,
      observation: { version: input.observationWindowVersion, yearFrom: input.yearFrom, yearTo: input.yearTo },
      occurrencePredicates: input.occurrencePredicates,
    })
    const existing = await db.catalogueVersion.findUnique({ where: { countryCode_runKey: { countryCode: input.countryCode, runKey: input.runKey } } })
    if (existing) {
      if (existing.registryVersionId !== registry.id || existing.inputFingerprint !== inputFingerprint || existing.sourceFingerprint !== sourceFingerprint) {
        throw new Error(`runKey ${input.runKey} already identifies different catalogue inputs`)
      }
      return existing
    }
    try {
      return await db.$transaction(async (tx) => {
        const catalogue = await tx.catalogueVersion.create({ data: {
          countryCode: input.countryCode,
          runKey: input.runKey,
          registryVersionId: registry.id,
          inputFingerprint,
          sourceFingerprint,
          plausibleRulesVersion: input.plausibleRulesVersion,
          tileMappingVersion: input.tileMappingVersion,
          habitatRulesVersion: input.habitatRulesVersion,
          habitatSource: input.habitatSource,
          observationWindowVersion: input.observationWindowVersion,
          yearFrom: input.yearFrom,
          yearTo: input.yearTo,
          occurrencePredicates: input.occurrencePredicates as unknown as Prisma.InputJsonValue,
          expectedRegions: registry.expectedRegions,
          status: 'partial',
        } })
        await tx.catalogueRegionBuild.createMany({ data: registry.entries.map((entry) => ({
          catalogueVersionId: catalogue.id,
          registryVersionId: registry.id,
          registryEntryId: entry.id,
        })) })
        return catalogue
      })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
      const raced = await db.catalogueVersion.findUnique({ where: { countryCode_runKey: { countryCode: input.countryCode, runKey: input.runKey } } })
      if (!raced) {
        const unfinished = await db.catalogueVersion.findFirst({ where: { countryCode: input.countryCode, status: { in: ['building', 'partial'] } }, select: { id: true, runKey: true } })
        throw new Error(unfinished
          ? `${input.countryCode} already has unfinished catalogue ${unfinished.runKey} (${unfinished.id}); resume it before starting ${input.runKey}`
          : `could not create catalogue run ${input.runKey} because a unique catalogue constraint changed concurrently`)
      }
      if (raced.registryVersionId !== registry.id || raced.inputFingerprint !== inputFingerprint) throw new Error(`runKey ${input.runKey} raced with different catalogue inputs`)
      return raced
    }
  },

  async acquireExecution(catalogueId, owner, now, expiresAt) {
    const result = await db.catalogueVersion.updateMany({
      where: {
        id: catalogueId,
        status: { in: ['building', 'partial'] },
        OR: [{ executionOwner: null }, { executionOwner: owner }, { executionExpiresAt: { lte: now } }],
      },
      data: { executionOwner: owner, executionExpiresAt: expiresAt, status: 'building' },
    })
    return result.count === 1
  },

  async renewExecution(catalogueId, owner, now, expiresAt) {
    const result = await db.catalogueVersion.updateMany({
      where: { id: catalogueId, executionOwner: owner, executionExpiresAt: { gt: now }, status: { in: ['building', 'partial'] } },
      data: { executionExpiresAt: expiresAt },
    })
    return result.count === 1
  },

  async releaseExecution(catalogueId, owner) {
    await db.catalogueVersion.updateMany({
      where: { id: catalogueId, executionOwner: owner, status: 'building' },
      data: { status: 'partial', executionOwner: null, executionExpiresAt: null },
    })
  },

  async claimRegion(catalogueId, owner, now, expiresAt, attempted) {
    for (let contention = 0; contention < 8; contention++) {
      const candidate = await db.catalogueRegionBuild.findFirst({
        where: {
          catalogueVersionId: catalogueId,
          id: { notIn: [...attempted] },
          OR: [
            { status: { in: ['pending', 'failed'] } },
            { status: 'running', leaseExpiresAt: { lte: now } },
          ],
        },
        orderBy: [{ registryEntry: { sourceCode: 'asc' } }, { id: 'asc' }],
        select: { id: true, attempts: true, registryEntryId: true, registryEntry: { select: { region: { select: { canonicalKey: true } } } } },
      })
      if (!candidate) return null
      const claimed = await db.catalogueRegionBuild.updateMany({
        where: {
          id: candidate.id,
          catalogueVersionId: catalogueId,
          OR: [
            { status: { in: ['pending', 'failed'] } },
            { status: 'running', leaseExpiresAt: { lte: now } },
          ],
        },
        data: {
          status: 'running',
          attempts: { increment: 1 },
          leaseOwner: owner,
          leaseExpiresAt: expiresAt,
          startedAt: now,
          completedAt: null,
          error: null,
        },
      })
      if (claimed.count !== 1) continue
      const regionKey = candidate.registryEntry.region.canonicalKey
      if (!regionKey) throw new Error(`registry entry ${candidate.registryEntryId} has no canonical region key`)
      return { id: candidate.id, registryEntryId: candidate.registryEntryId, regionKey, attempts: candidate.attempts + 1 }
    }
    throw new Error(`could not claim a region for catalogue ${catalogueId} after repeated contention`)
  },

  async renewRegion(catalogueId, claimId, owner, now, expiresAt) {
    const result = await db.catalogueRegionBuild.updateMany({
      where: { id: claimId, catalogueVersionId: catalogueId, status: 'running', leaseOwner: owner, leaseExpiresAt: { gt: now } },
      data: { leaseExpiresAt: expiresAt },
    })
    return result.count === 1
  },

  async stageRegion(catalogue, claim, owner, at, staged) {
    const calculation = staged.calculation
    if (calculation.target.registryVersion !== catalogue.registryVersionId || calculation.target.registryEntryId !== claim.registryEntryId || calculation.target.regionKey !== claim.regionKey) {
      throw new Error(`calculation target does not match claimed region ${claim.regionKey}`)
    }
    return db.$transaction(async (tx) => {
      const execution = await tx.catalogueVersion.findFirst({ where: { id: catalogue.id, executionOwner: owner, executionExpiresAt: { gt: at }, status: { in: ['building', 'partial'] } }, select: { id: true } })
      const build = await tx.catalogueRegionBuild.findFirst({ where: { id: claim.id, catalogueVersionId: catalogue.id, registryEntryId: claim.registryEntryId, status: 'running', leaseOwner: owner, leaseExpiresAt: { gt: at } }, select: { id: true, requestStats: true } })
      if (!execution || !build) return false
      for (const taxon of [...calculation.taxa].sort((a, b) => a.gbifKey - b.gbifKey)) {
        const { gbifKey, ...data } = taxon
        await tx.taxon.upsert({ where: { gbifKey }, create: { gbifKey, ...data }, update: data })
      }
      const taxa = await tx.taxon.findMany({ where: { gbifKey: { in: calculation.taxa.map((taxon) => taxon.gbifKey) } }, select: { id: true, gbifKey: true } })
      const idOf = new Map(taxa.map((taxon) => [taxon.gbifKey, taxon.id]))
      if (idOf.size !== calculation.taxa.length) throw new Error(`staged region ${claim.regionKey} could not resolve every accepted taxon row`)
      await tx.catalogueLookalike.deleteMany({ where: { regionBuildId: claim.id } })
      await tx.cataloguePlausibility.deleteMany({ where: { regionBuildId: claim.id } })
      if (calculation.plausibility.length > 0) await tx.cataloguePlausibility.createMany({ data: calculation.plausibility.map((row) => ({
        regionBuildId: claim.id,
        taxonId: idOf.get(row.gbifKey)!,
        obs: row.obs,
        monthShare: row.monthShare,
        peak: row.peak,
        words: row.words,
      })) })
      if (calculation.lookalikePairs.length > 0) await tx.catalogueLookalike.createMany({ data: calculation.lookalikePairs.map(([taxon, sibling]) => ({
        regionBuildId: claim.id,
        taxonId: idOf.get(taxon)!,
        siblingId: idOf.get(sibling)!,
      })) })
      const completed = await tx.catalogueRegionBuild.updateMany({
        where: { id: claim.id, status: 'running', leaseOwner: owner, leaseExpiresAt: { gt: at } },
        data: {
          status: 'complete',
          leaseOwner: null,
          leaseExpiresAt: null,
          completedAt: at,
          error: null,
          totalObservations: calculation.total,
          monthTotals: calculation.monthTotals,
          regionSize: calculation.plausibility.length,
          nowCounts: Array.from({ length: 12 }, (_, month) => calculation.plausibility.filter((row) => isNow(row.monthShare, row.peak, month + 1)).length),
          perTile: calculation.perTile as Prisma.InputJsonValue,
          rejectedTaxa: calculation.rejectedTaxa as unknown as Prisma.InputJsonValue,
          habitatSummary: staged.habitatSummary as unknown as Prisma.InputJsonValue,
          requestStats: addRequestStats([requestStats(build.requestStats), staged.requestStats]) as unknown as Prisma.InputJsonValue,
          responseFingerprint: staged.responseFingerprint,
          setFingerprint: staged.setFingerprint,
        },
      })
      if (completed.count !== 1) throw new Error(`lost claim for ${claim.regionKey} while staging its result`)
      return true
    }, { maxWait: 10_000, timeout: 120_000 })
  },

  async failRegion(catalogueId, claim, owner, at, error, attemptRequests) {
    return db.$transaction(async (tx) => {
      const where = {
        id: claim.id,
        catalogueVersionId: catalogueId,
        status: 'running' as const,
        leaseOwner: owner,
        leaseExpiresAt: { gt: at },
        catalogueVersion: { executionOwner: owner, executionExpiresAt: { gt: at }, status: 'building' as const },
      }
      const build = await tx.catalogueRegionBuild.findFirst({ where, select: { requestStats: true } })
      if (!build) return false
      const result = await tx.catalogueRegionBuild.updateMany({
        where,
        data: {
          status: 'failed', leaseOwner: null, leaseExpiresAt: null, completedAt: null,
          error: error.slice(0, 2000),
          requestStats: addRequestStats([requestStats(build.requestStats), attemptRequests]) as unknown as Prisma.InputJsonValue,
        },
      })
      return result.count === 1
    })
  },

  async loadTaxonomy(catalogueId, sourceKeys) {
    if (sourceKeys.length === 0) return []
    return db.catalogueTaxonomyResolution.findMany({ where: { catalogueVersionId: catalogueId, sourceKey: { in: [...sourceKeys] } }, orderBy: { sourceKey: 'asc' } })
  },

  async saveTaxonomy(catalogueId, rows) {
    if (rows.length === 0) return
    await db.catalogueTaxonomyResolution.createMany({ data: rows.map((row) => ({
      catalogueVersionId: catalogueId,
      sourceKey: row.sourceKey,
      record: row.record as Prisma.InputJsonValue,
      recordFingerprint: row.recordFingerprint,
      acceptedKey: row.acceptedKey,
      rejectionReason: row.rejectionReason,
    })), skipDuplicates: true })
    const stored = await db.catalogueTaxonomyResolution.findMany({ where: { catalogueVersionId: catalogueId, sourceKey: { in: rows.map((row) => row.sourceKey) } } })
    const expected = new Map(rows.map((row) => [row.sourceKey, row.recordFingerprint]))
    for (const row of stored) {
      if (expected.get(row.sourceKey) !== row.recordFingerprint) throw new Error(`taxonomy checkpoint conflict for source key ${row.sourceKey}`)
    }
  },

  async loadHabitat(catalogueId, names) {
    if (!names.length) return []
    return db.catalogueHabitatBatch.findMany({ where: { catalogueVersionId: catalogueId, names: { hasSome: [...names] } }, orderBy: { requestFingerprint: 'asc' } })
  },

  async saveHabitat(catalogueId, batch) {
    decodeHabitatBatch(batch)
    await db.$transaction(async (tx) => {
      // A stale process can finish an HTTP request after its lease expires. Serialize the
      // overlap check with insertion so a new owner cannot checkpoint a name twice.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`catalogue-habitat:${catalogueId}`}, 0))::text`
      const overlaps = await tx.catalogueHabitatBatch.findMany({ where: { catalogueVersionId: catalogueId, names: { hasSome: batch.names } } })
      if (overlaps.some((stored) => stored.requestFingerprint !== batch.requestFingerprint || stored.recordFingerprint !== batch.recordFingerprint)) throw new Error('habitat checkpoint conflict')
      if (overlaps.length) return
      await tx.catalogueHabitatBatch.create({ data: { ...batch, catalogueVersionId: catalogueId, record: batch.record as Prisma.InputJsonValue } })
    })
  },

  async finalize(catalogueId, owner, at) {
    return db.$transaction(async (tx) => {
      const catalogue = await tx.catalogueVersion.findFirst({ where: { id: catalogueId, executionOwner: owner, executionExpiresAt: { gt: at }, status: { in: ['building', 'partial'] } } })
      if (!catalogue) return false
      const grouped = await tx.catalogueRegionBuild.groupBy({ by: ['status'], where: { catalogueVersionId: catalogueId }, _count: { _all: true } })
      const counts = Object.fromEntries(grouped.map((row) => [row.status, row._count._all]))
      const complete = counts.complete ?? 0
      if (complete !== catalogue.expectedRegions || (counts.pending ?? 0) || (counts.running ?? 0) || (counts.failed ?? 0)) {
        await tx.catalogueVersion.update({ where: { id: catalogueId }, data: {
          status: 'partial',
          completedRegions: complete,
          executionOwner: null,
          executionExpiresAt: null,
        } })
        return false
      }
      const staged = await tx.cataloguePlausibility.findMany({
        where: { regionBuild: { catalogueVersionId: catalogueId, status: 'complete' } },
        distinct: ['taxonId'],
        select: { taxonId: true, taxon: { select: { gbifKey: true } } },
        orderBy: { taxonId: 'asc' },
      })
      const builds = await tx.catalogueRegionBuild.findMany({ where: { catalogueVersionId: catalogueId, status: 'complete' }, select: { registryEntryId: true, responseFingerprint: true, setFingerprint: true, habitatSummary: true }, orderBy: { registryEntryId: 'asc' } })
      if (builds.some((build) => !build.responseFingerprint || !build.setFingerprint)) throw new Error(`catalogue ${catalogueId} has a complete region without fingerprints`)
      if (catalogue.habitatRulesVersion > 0 && builds.some((build) => !build.habitatSummary)) throw new Error(`catalogue ${catalogueId} has a complete region without habitat evidence`)
      await tx.catalogueTaxon.deleteMany({ where: { catalogueVersionId: catalogueId } })
      if (staged.length > 0) await tx.catalogueTaxon.createMany({ data: staged.map((row) => ({ catalogueVersionId: catalogueId, taxonId: row.taxonId })) })
      const aggregateFingerprint = fingerprint(builds.map((build) => ({ entry: build.registryEntryId, response: build.responseFingerprint })))
      const unionFingerprint = fingerprint(staged.map((row) => row.taxon.gbifKey).sort((a, b) => a - b))
      const completedData: Prisma.CatalogueVersionUncheckedUpdateInput & { unionFingerprint: string } = {
        status: 'complete',
        completedRegions: complete,
        unionTaxa: staged.length,
        responseFingerprint: aggregateFingerprint,
        unionFingerprint,
        generatedAt: at,
        executionOwner: null,
        executionExpiresAt: null,
      }
      await tx.catalogueVersion.update({ where: { id: catalogueId }, data: completedData })
      return true
    }, { maxWait: 10_000, timeout: 120_000 })
  },

  async report(catalogueId, stoppedReason = null) {
    const catalogue = await db.catalogueVersion.findUniqueOrThrow({
      where: { id: catalogueId },
      include: {
        habitat: { orderBy: { requestFingerprint: 'asc' } },
        registryVersion: { include: { sources: { select: { topicDate: true } } } },
        regionBuilds: {
          orderBy: { registryEntry: { sourceCode: 'asc' } },
          include: { registryEntry: { include: { region: { select: { canonicalKey: true, name: true } } } } },
        },
        taxa: { include: { taxon: { select: { gbifKey: true, tile: true, contentAt: true, enrichmentWork: { select: { kind: true, version: true, status: true } } } } } },
      },
    })
    const rows: RegionReport[] = catalogue.regionBuilds.map((build) => ({
      key: build.registryEntry.region.canonicalKey ?? build.registryEntry.sourceCode,
      name: build.registryEntry.region.name,
      state: build.registryEntry.stateName,
      status: build.status,
      attempts: build.attempts,
      observations: build.totalObservations,
      size: build.regionSize,
      perTile: build.perTile && typeof build.perTile === 'object' && !Array.isArray(build.perTile) ? build.perTile as Record<string, number> : {},
      rejectedTaxa: Array.isArray(build.rejectedTaxa) ? build.rejectedTaxa.length : 0,
      habitatSummary: build.habitatSummary as HabitatRegionSummary | null,
      requestStats: requestStats(build.requestStats),
      seconds: build.startedAt && build.completedAt ? (build.completedAt.getTime() - build.startedAt.getTime()) / 1000 : null,
      error: build.error,
      responseFingerprint: build.responseFingerprint,
      setFingerprint: build.setFingerprint,
    }))
    const statuses = (status: string) => rows.filter((row) => row.status === status).length
    const unionRows = catalogue.taxa.map((row) => row.taxon).sort((a, b) => a.gbifKey - b.gbifKey)
    const perTile: Record<string, number> = {}
    for (const taxon of unionRows) perTile[taxon.tile] = (perTile[taxon.tile] ?? 0) + 1
    const enrichment: Record<string, Record<string, number>> = {}
    for (const taxon of unionRows) for (const work of taxon.enrichmentWork) {
      const key = `${work.kind}@${work.version}`
      const bucket = (enrichment[key] ??= {})
      bucket[work.status] = (bucket[work.status] ?? 0) + 1
    }
    const generatedAt = catalogue.generatedAt?.toISOString() ?? null
    const end = catalogue.generatedAt ?? new Date()
    return {
      catalogue: {
        id: catalogue.id,
        countryCode: catalogue.countryCode,
        runKey: catalogue.runKey,
        status: catalogue.status,
        inputFingerprint: catalogue.inputFingerprint,
        sourceFingerprint: catalogue.sourceFingerprint,
        responseFingerprint: catalogue.responseFingerprint,
        unionFingerprint: (catalogue as typeof catalogue & { unionFingerprint: string | null }).unionFingerprint,
        registryVersionId: catalogue.registryVersionId,
        registryVersion: catalogue.registryVersion.version,
        sourceTopicDates: [...new Set(catalogue.registryVersion.sources.map((source) => source.topicDate.toISOString().slice(0, 10)))].sort(),
        observationWindow: { version: catalogue.observationWindowVersion, yearFrom: catalogue.yearFrom, yearTo: catalogue.yearTo },
        plausibleRulesVersion: catalogue.plausibleRulesVersion,
        tileMappingVersion: catalogue.tileMappingVersion,
        habitatRulesVersion: catalogue.habitatRulesVersion,
        habitatSource: catalogue.habitatSource,
        occurrencePredicates: catalogue.occurrencePredicates,
        startedAt: catalogue.startedAt.toISOString(),
        generatedAt,
        elapsedSeconds: (end.getTime() - catalogue.startedAt.getTime()) / 1000,
      },
      regions: {
        expected: catalogue.expectedRegions,
        complete: statuses('complete'),
        failed: statuses('failed'),
        pending: statuses('pending'),
        running: statuses('running'),
        rows,
      },
      national: {
        uniqueTaxa: unionRows.length,
        perTile,
        unionFingerprint: fingerprint(unionRows.map((taxon) => taxon.gbifKey)),
        contentComplete: unionRows.filter((taxon) => taxon.contentAt).length,
        contentAwaiting: unionRows.filter((taxon) => !taxon.contentAt).length,
      },
      enrichment,
      habitat: catalogue.habitatRulesVersion > 0 ? habitatAudit(catalogue.habitat) : null,
      requests: addRequestStats(rows.map((row) => row.requestStats)),
      outliers: catalogueOutliers(rows),
      stoppedReason,
    }
  },
}

export { prismaStore }

/** Product-language alias used by the operator CLI and integration tests. */
export const runGermany = runNationwide
