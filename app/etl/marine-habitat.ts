import { get, withFreshCache, withResponseCapture, type RequestStats } from './fetch'
import { fingerprint } from './fingerprint'
import type { RegistryRegionCalculation } from './region'

export const MARINE_RULE_VERSION = 1
export const WORMS_SOURCE = {
  name: 'World Register of Marine Species (WoRMS), Aphia',
  endpoint: 'https://marinespecies.org/rest/AphiaRecordsByMatchNames',
  method: 'GET',
  namesParameter: 'scientificnames[]',
  marine_only: false,
  apiMaxNames: 50,
  batchSize: 20,
  requestTimeoutMs: 60_000,
  contractVersion: 1,
  citation: 'WoRMS Editorial Board (2026). World Register of Marine Species. Available at VLIZ. doi:10.14284/170',
  doi: 'https://doi.org/10.14284/170',
  terms: 'https://www.marinespecies.org/about.php#terms',
  licence: 'CC-BY for page text, unless stated otherwise; entire database redistribution requires prior written agreement.',
  termsReviewedOn: '2026-09-09',
  scope: 'Local checkpoint of the bounded German candidate-name subset; no raw database redistribution.',
} as const

type Flag = boolean | null
export type HabitatReason = 'marine' | 'compatible' | 'nonmarine' | 'unknown' | 'unmatched' | 'inexact' | 'ambiguous'
export type HabitatDecision = {
  sciName: string
  exclude: boolean
  reason: HabitatReason
  aphiaId: number | null
  isMarine: Flag
  isFreshwater: Flag
  isTerrestrial: Flag
  isBrackish: Flag
}
export type HabitatEvidence = HabitatDecision & { batchFingerprint: string }
export type HabitatRegionSummary = {
  version: number
  examined: number
  retained: number
  reasons: Partial<Record<HabitatReason, number>>
  excluded: { gbifKey: number; sciName: string; aphiaId: number | null }[]
  evidenceFingerprint: string
}

// Do not coerce strings, absent fields, or null to positive/negative evidence.
const flag = (value: unknown): Flag => value === true || value === 1 ? true : value === false || value === 0 ? false : null
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const positiveId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0

/** Only one exact, accepted species record with the requested valid name can exclude a taxon. */
export function decideMarineHabitat(sciName: string, matches: unknown): HabitatDecision {
  const unresolved = (reason: HabitatReason): HabitatDecision => ({
    sciName, exclude: false, reason, aphiaId: null, isMarine: null, isFreshwater: null, isTerrestrial: null, isBrackish: null,
  })
  if (matches === null || (Array.isArray(matches) && matches.length === 0)) return unresolved('unmatched')
  if (!Array.isArray(matches)) throw new Error(`invalid WoRMS match list for ${sciName}`)
  if (matches.some((row) => !object(row))) throw new Error(`invalid WoRMS record for ${sciName}`)
  if (matches.length !== 1) return unresolved('ambiguous')
  const row: unknown = matches[0]
  if (!object(row)) throw new Error(`invalid WoRMS record for ${sciName}`)
  if (row.match_type !== 'exact' || row.status !== 'accepted' || row.rank !== 'Species'
    || row.scientificname !== sciName || row.valid_name !== sciName
    || !positiveId(row.AphiaID) || row.valid_AphiaID !== row.AphiaID) return unresolved('inexact')
  const isMarine = flag(row.isMarine), isFreshwater = flag(row.isFreshwater), isTerrestrial = flag(row.isTerrestrial)
  const reason: HabitatReason = isFreshwater === true || isTerrestrial === true ? 'compatible'
    : isMarine === true ? 'marine' : isMarine === false ? 'nonmarine' : 'unknown'
  return { sciName, exclude: reason === 'marine', reason, aphiaId: row.AphiaID,
    isMarine, isFreshwater, isTerrestrial, isBrackish: flag(row.isBrackish) }
}

export function wormsMatchUrl(names: readonly string[]): string {
  if (!names.length || names.length > WORMS_SOURCE.apiMaxNames || new Set(names).size !== names.length
    || names.some((name) => !name.trim() || name !== name.trim())) throw new Error('WoRMS batch requires 1–50 unique, nonempty names')
  const url = new URL(WORMS_SOURCE.endpoint)
  for (const name of names) url.searchParams.append(WORMS_SOURCE.namesParameter, name)
  url.searchParams.set('marine_only', 'false')
  return url.toString()
}

export type HabitatLookup = (names: readonly string[]) => Promise<string>
/** Force a new source read for missing catalogue checkpoints, even with GBIF --reuse-cache. */
export const fetchWormsMatches: HabitatLookup = (names) => withFreshCache(() => get(wormsMatchUrl(names), { text: true, timeoutMs: WORMS_SOURCE.requestTimeoutMs }))

type BatchEnvelope = {
  version: 1
  ruleVersion: number
  source: typeof WORMS_SOURCE
  names: string[]
  url: string
  fetchedAt: string
  rawResponse: string
  requests: RequestStats
}
export type StoredHabitatBatch = {
  requestFingerprint: string
  names: string[]
  record: unknown
  recordFingerprint: string
}
export type HabitatStore = {
  loadHabitat(catalogueId: string, names: readonly string[]): Promise<StoredHabitatBatch[]>
  saveHabitat(catalogueId: string, batch: StoredHabitatBatch): Promise<void>
}

export function isHabitatTimeout(error: unknown): boolean {
  let current: unknown = error
  while (current instanceof Error) {
    if (current.name === 'TimeoutError' || /aborted due to timeout/i.test(current.message)) return true
    current = current.cause
  }
  return false
}

function parseMatches(names: readonly string[], rawResponse: string): HabitatDecision[] {
  const response: unknown = JSON.parse(rawResponse)
  if (!Array.isArray(response) || response.length !== names.length) throw new Error('WoRMS response must have one ordered match list per requested name')
  return names.map((name, index) => decideMarineHabitat(name, response[index]))
}

export function decodeHabitatBatch(batch: StoredHabitatBatch): { envelope: BatchEnvelope; decisions: HabitatEvidence[] } {
  if (fingerprint(batch.record) !== batch.recordFingerprint) throw new Error('habitat checkpoint does not match its fingerprint')
  const record = batch.record as BatchEnvelope
  if (!object(record) || record.version !== 1 || record.ruleVersion !== MARINE_RULE_VERSION
    || fingerprint(record.source) !== fingerprint(WORMS_SOURCE)
    || fingerprint(record.names) !== fingerprint(batch.names)
    || record.url !== wormsMatchUrl(batch.names)
    || batch.requestFingerprint !== fingerprint({ source: WORMS_SOURCE, url: record.url })
    || typeof record.rawResponse !== 'string' || !Number.isFinite(Date.parse(record.fetchedAt))) {
    throw new Error('habitat checkpoint has an invalid source envelope')
  }
  return { envelope: record, decisions: parseMatches(batch.names, record.rawResponse)
    .map((decision) => ({ ...decision, batchFingerprint: batch.recordFingerprint })) }
}

/** Serialize shared-name discovery, checkpoint each successful batch, and retry only missing names. */
export function catalogueHabitatResolver(
  catalogueId: string,
  store: HabitatStore,
  lookup: HabitatLookup = fetchWormsMatches,
  now: () => Date = () => new Date(),
): (names: readonly string[]) => Promise<Map<string, HabitatEvidence>> {
  let chain: Promise<unknown> = Promise.resolve()
  return (names) => {
    const work = chain.then(async () => {
      const unique = [...new Set(names)].sort()
      if (!unique.length) return new Map<string, HabitatEvidence>()
      const known = new Map<string, HabitatEvidence>()
      const remember = (batch: StoredHabitatBatch) => {
        for (const decision of decodeHabitatBatch(batch).decisions) {
          const previous = known.get(decision.sciName)
          if (previous && fingerprint(previous) !== fingerprint(decision)) throw new Error(`conflicting habitat checkpoints for ${decision.sciName}`)
          known.set(decision.sciName, decision)
        }
      }
      for (const batch of await store.loadHabitat(catalogueId, unique)) remember(batch)
      const missing = unique.filter((name) => !known.has(name))
      const pending = Array.from({ length: Math.ceil(missing.length / WORMS_SOURCE.batchSize) }, (_, index) => (
        missing.slice(index * WORMS_SOURCE.batchSize, (index + 1) * WORMS_SOURCE.batchSize)
      ))
      while (pending.length) {
        const batchNames = pending.shift()!
        const url = wormsMatchUrl(batchNames)
        let captured: { value: string; fingerprint: string; requests: RequestStats }
        try {
          captured = await withResponseCapture(() => lookup(batchNames))
        } catch (error) {
          if (!isHabitatTimeout(error) || batchNames.length === 1) throw error
          const middle = Math.ceil(batchNames.length / 2)
          // Retry the same ordered names as two smaller requests. Successful halves checkpoint
          // independently, so another interruption never repeats them.
          pending.unshift(batchNames.slice(0, middle), batchNames.slice(middle))
          continue
        }
        // Validate cardinality and record shape before persisting a reusable success.
        parseMatches(batchNames, captured.value)
        const record: BatchEnvelope = { version: 1, ruleVersion: MARINE_RULE_VERSION, source: WORMS_SOURCE,
          names: batchNames, url, fetchedAt: now().toISOString(), rawResponse: captured.value, requests: captured.requests }
        const batch: StoredHabitatBatch = { requestFingerprint: fingerprint({ source: WORMS_SOURCE, url }),
          names: batchNames, record, recordFingerprint: fingerprint(record) }
        await store.saveHabitat(catalogueId, batch)
        remember(batch)
      }
      return new Map(unique.map((name) => [name, known.get(name)!]))
    })
    chain = work.catch(() => undefined)
    return work
  }
}

/** Post-cut exclusion: no replenishment or change to the observational seasonality denominator. */
export function filterMarineRegion(
  calculation: RegistryRegionCalculation,
  evidence: ReadonlyMap<string, HabitatEvidence>,
): { calculation: RegistryRegionCalculation; summary: HabitatRegionSummary } {
  const reasons: Partial<Record<HabitatReason, number>> = {}
  const excluded: HabitatRegionSummary['excluded'] = []
  const decisions = calculation.taxa.map((taxon) => {
    const decision = evidence.get(taxon.sciName)
    if (!decision || decision.sciName !== taxon.sciName) throw new Error(`missing habitat evidence for ${taxon.sciName}`)
    reasons[decision.reason] = (reasons[decision.reason] ?? 0) + 1
    if (decision.exclude) excluded.push({ gbifKey: taxon.gbifKey, sciName: taxon.sciName, aphiaId: decision.aphiaId })
    return { gbifKey: taxon.gbifKey, ...decision }
  })
  const removed = new Set(excluded.map((row) => row.gbifKey))
  const taxa = calculation.taxa.filter((row) => !removed.has(row.gbifKey))
  const perTile: Record<string, number> = {}
  for (const taxon of taxa) perTile[taxon.tile] = (perTile[taxon.tile] ?? 0) + 1
  return {
    calculation: { ...calculation, taxa, perTile,
      plausibility: calculation.plausibility.filter((row) => !removed.has(row.gbifKey)),
      lookalikePairs: calculation.lookalikePairs.filter(([taxon, sibling]) => !removed.has(taxon) && !removed.has(sibling)) },
    summary: { version: MARINE_RULE_VERSION, examined: calculation.taxa.length, retained: taxa.length, reasons, excluded,
      evidenceFingerprint: fingerprint(decisions.sort((a, b) => a.gbifKey - b.gbifKey)) },
  }
}

/** Public audit contains decisions and source citations, never raw response bodies. */
export function habitatAudit(batches: StoredHabitatBatch[]) {
  const decoded = batches.map(decodeHabitatBatch)
  const decisions = decoded.flatMap((batch) => batch.decisions).sort((a, b) => a.sciName.localeCompare(b.sciName))
  if (new Set(decisions.map((decision) => decision.sciName)).size !== decisions.length) throw new Error('habitat audit contains overlapping name checkpoints')
  const reasons: Partial<Record<HabitatReason, number>> = {}
  for (const decision of decisions) reasons[decision.reason] = (reasons[decision.reason] ?? 0) + 1
  const checkpointedSuccessfulRequests: RequestStats = { perHost: {}, networkAttempts: 0, hits: 0, misses: 0, retries: 0, tooMany: 0 }
  for (const { envelope: { requests } } of decoded) {
    checkpointedSuccessfulRequests.networkAttempts = (checkpointedSuccessfulRequests.networkAttempts ?? 0) + (requests.networkAttempts ?? 0)
    for (const [host, count] of Object.entries(requests.perHost)) checkpointedSuccessfulRequests.perHost[host] = (checkpointedSuccessfulRequests.perHost[host] ?? 0) + count
    for (const kind of ['hits', 'misses', 'retries', 'tooMany'] as const) checkpointedSuccessfulRequests[kind] += requests[kind]
  }
  return { source: WORMS_SOURCE, version: MARINE_RULE_VERSION, batches: batches.length, names: decisions.length, reasons, decisions,
    sourceDates: [...new Set(decoded.map((batch) => batch.envelope.fetchedAt.slice(0, 10)))].sort(),
    fingerprint: fingerprint(batches.map((batch) => batch.recordFingerprint).sort()),
    // Durable successful-batch total. It can overlap region-attempt stats; after a hard kill it
    // can also contain a checkpoint whose enclosing region never persisted its attempt stats.
    checkpointedSuccessfulRequests }
}
