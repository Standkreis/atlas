import type { Prisma } from '../src/generated/prisma/client'
import { requests, withResponseCapture } from './fetch'
import { galleryScope, type GalleryTaxon } from './gallery-work'
import { pickNames } from './prune'
import { runTaxonWork, type TaxonWorkResult } from './taxon-work'
import { wikidataFor, type WdMatch } from './wikidata'

export const NAMES_VERSION = 'wikidata-names-v1'

export type NamesOptions = {
  catalogueVersionId: string
  region?: string
  keys?: number[]
  limit?: number
  concurrency?: number
  log?: (message: string) => void
  fetchNames?: NamesFetch
}

export type NamesSource = {
  qid: string | null
  path: WdMatch['path']
  labels: { de: string | null; en: string | null; ja: string | null }
  sitelinks: { de: string | null; en: string | null }
  note: string | null
}

export type NamesSummary = {
  outcome: 'matched' | 'scientific-fallback' | 'non-species' | 'ambiguous'
  reason: string | null
  selected: Record<string, string>
  added: Record<string, string>
  changed: boolean
  source: NamesSource
}

export type NamesFetch = (taxon: GalleryTaxon) => Promise<{ match: WdMatch; sourceFingerprint: string }>

const cleanNames = (names: Record<string, string>) => Object.fromEntries(
  Object.entries(names).flatMap(([language, name]) => typeof name === 'string' && name.trim() ? [[language, name.trim()]] : []),
)

/** Reuse the same Wikidata URLs and URL-keyed disk cache as gallery/content, while fingerprinting the exact responses. */
export async function fetchTaxonNames(taxon: GalleryTaxon): Promise<{ match: WdMatch; sourceFingerprint: string }> {
  const fetched = await withResponseCapture(async () => (await wikidataFor([taxon])).get(taxon.gbifKey))
  if (!fetched.value) throw new Error(`Wikidata response omitted GBIF key ${taxon.gbifKey}`)
  return { match: fetched.value, sourceFingerprint: fetched.fingerprint }
}

/** Multiple candidates are not safe for names: wikidataFor exposes that ambiguity in its note but only returns one item. */
export function summarizeNames(taxon: GalleryTaxon, match: WdMatch): NamesSummary {
  const item = match.item
  const source: NamesSource = {
    qid: item?.qid ?? null,
    path: match.path,
    labels: { de: item?.deLabel ?? null, en: item?.enLabel ?? null, ja: item?.jaLabel ?? null },
    sitelinks: { de: item?.dewiki ?? null, en: item?.enwiki ?? null },
    note: match.note ?? null,
  }
  if (/^\d+ items via /.test(match.note ?? '')) return { outcome: 'ambiguous', reason: match.note!, selected: {}, added: {}, changed: false, source }
  if (!item) {
    const nonSpecies = /not a species/i.test(match.note ?? '')
    return { outcome: nonSpecies ? 'non-species' : 'scientific-fallback', reason: match.note ?? 'no Wikidata match', selected: {}, added: {}, changed: false, source }
  }
  const selected = cleanNames(pickNames({ sciName: taxon.sciName, deLabel: item.deLabel, enLabel: item.enLabel, jaLabel: item.jaLabel, dewiki: item.dewiki, enwiki: item.enwiki }))
  return { outcome: Object.keys(selected).length ? 'matched' : 'scientific-fallback', reason: Object.keys(selected).length ? null : 'no non-scientific common labels', selected, added: {}, changed: false, source }
}

/** Merge under the taxon row lock; identity drift aborts completion and never publishes stale names. */
async function mergeMissingNames(tx: Prisma.TransactionClient, taxon: GalleryTaxon, summary: NamesSummary) {
  const rows = await tx.$queryRaw<{ gbifKey: number; sciName: string; commonNames: Prisma.JsonValue }[]>`
    SELECT "gbifKey", "sciName", "commonNames" FROM "Taxon" WHERE "id" = ${taxon.id} FOR UPDATE
  `
  const current = rows[0]
  if (!current || current.gbifKey !== taxon.gbifKey || current.sciName !== taxon.sciName) throw new Error(`taxon identity changed for ${taxon.id}`)
  if (!current.commonNames || typeof current.commonNames !== 'object' || Array.isArray(current.commonNames)) throw new Error(`taxon commonNames is malformed for ${taxon.id}`)
  const commonNames = { ...(current.commonNames as Record<string, unknown>) }
  for (const [language, name] of Object.entries(summary.selected)) {
    if (typeof commonNames[language] !== 'string' || !commonNames[language].trim()) {
      commonNames[language] = name
      summary.added[language] = name
    }
  }
  summary.changed = Object.keys(summary.added).length > 0
  if (summary.changed) await tx.taxon.update({ where: { id: taxon.id }, data: { commonNames: commonNames as Prisma.InputJsonValue } })
}

/** Reject incomplete/unknown scope flags rather than accidentally broadening an operator run. */
export function parseNamesArgs(args: string[]): NamesOptions & { json: boolean } {
  const values = new Map<string, string>()
  let json = false
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]
    if (flag === '--json') { if (json) throw new Error('names --json may only be supplied once'); json = true; continue }
    if (!['--catalogue', '--region', '--keys', '--limit', '--concurrency'].includes(flag)) throw new Error(`unknown names argument ${flag}`)
    const value = args[++i]
    if (!value?.trim() || value.startsWith('--') || values.has(flag)) throw new Error(`names ${flag} requires one explicit value`)
    values.set(flag, value)
  }
  const catalogueVersionId = values.get('--catalogue')
  if (!catalogueVersionId) throw new Error('names requires --catalogue <completed-id>')
  const keysValue = values.get('--keys')
  const keys = keysValue?.split(',').map(Number)
  if (keys && (keys.length === 0 || keys.some((key) => !Number.isSafeInteger(key) || key <= 0))) throw new Error('names keys must be positive GBIF integers')
  const limit = values.has('--limit') ? Number(values.get('--limit')) : undefined
  const concurrency = values.has('--concurrency') ? Number(values.get('--concurrency')) : 2
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) throw new Error('names limit must be a positive integer')
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error('names concurrency must be an integer from 1 to 8')
  return { catalogueVersionId, region: values.get('--region'), keys, limit, concurrency, json }
}

export type NamesReport = {
  catalogueVersionId: string
  scope: { region: string | null; keys: number[] | null; taxa: number; limit: number | null }
  examined: number; changed: number; unchanged: number; fallback: number; nonSpecies: number; ambiguous: number
  labelsAdded: Record<string, number>; failed: number; lost: number
  work: TaxonWorkResult
  requests: ReturnType<typeof requests>
  seconds: number
}

export async function runNames(options: NamesOptions): Promise<NamesReport> {
  const url = new URL(process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex')
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('names enrichment requires local Postgres')
  const start = Date.now()
  const before = requests()
  const log = options.log ?? console.log
  const taxa = await galleryScope(options)
  if (taxa.some((taxon) => !taxon.sciName.trim())) throw new Error('names scope contains an invalid scientific name')
  const byId = new Map(taxa.map((taxon) => [taxon.id, taxon]))
  const counts = { examined: 0, changed: 0, unchanged: 0, fallback: 0, nonSpecies: 0, ambiguous: 0 }
  const labelsAdded: Record<string, number> = {}
  log(`names: ${taxa.length} unique taxa in ${options.catalogueVersionId}`)
  const work = await runTaxonWork({
    catalogueVersionId: options.catalogueVersionId, kind: 'names', version: NAMES_VERSION,
    taxonIds: taxa.map((taxon) => taxon.id), limit: options.limit, concurrency: options.concurrency ?? 2,
    worker: async ({ taxonId }, signal) => {
      const taxon = byId.get(taxonId)!
      counts.examined++
      try {
        const fetched = await (options.fetchNames ?? fetchTaxonNames)(taxon)
        if (!/^[a-f\d]{64}$/i.test(fetched.sourceFingerprint)) throw new Error(`malformed names source fingerprint for ${taxon.gbifKey}`)
        signal.throwIfAborted()
        const summary = summarizeNames(taxon, fetched.match)
        return { resultSummary: summary as unknown as Prisma.InputJsonValue, sourceFingerprint: fetched.sourceFingerprint,
          publish: async (tx) => { signal.throwIfAborted(); await mergeMissingNames(tx, taxon, summary) } }
      } catch (error) {
        log(`names failed: ${taxon.gbifKey} ${taxon.sciName}: ${error instanceof Error ? error.message : String(error)}`)
        throw error
      }
    },
    onComplete: (_key, outcome) => {
      const summary = outcome.resultSummary as unknown as NamesSummary
      counts[summary.changed ? 'changed' : 'unchanged']++
      counts.fallback += Number(summary.outcome === 'scientific-fallback')
      counts.nonSpecies += Number(summary.outcome === 'non-species')
      counts.ambiguous += Number(summary.outcome === 'ambiguous')
      for (const language of Object.keys(summary.added)) labelsAdded[language] = (labelsAdded[language] ?? 0) + 1
      if ((counts.changed + counts.unchanged) % 100 === 0) log(`names: ${counts.examined} examined · ${counts.changed} changed · ${counts.fallback + counts.nonSpecies + counts.ambiguous} fallbacks`)
    },
  })
  const after = requests()
  return { catalogueVersionId: options.catalogueVersionId, scope: { region: options.region ?? null, keys: options.keys ?? null, taxa: taxa.length, limit: options.limit ?? null },
    ...counts, labelsAdded, failed: work.failed, lost: work.lost, work,
    requests: { perHost: Object.fromEntries(Object.entries(after.perHost).map(([host, n]) => [host, n - (before.perHost[host] ?? 0)])),
      networkAttempts: (after.networkAttempts ?? 0) - (before.networkAttempts ?? 0), hits: after.hits - before.hits, misses: after.misses - before.misses,
      retries: after.retries - before.retries, tooMany: after.tooMany - before.tooMany }, seconds: (Date.now() - start) / 1000 }
}

export const formatNamesReport = (report: NamesReport) => `names ${report.catalogueVersionId}: ${report.examined} examined · ${report.changed} changed · ${report.unchanged} unchanged · ${report.fallback} scientific fallbacks · ${report.nonSpecies} non-species · ${report.ambiguous} ambiguous · ${report.failed} failed · ${report.lost} lost\nlabels added ${JSON.stringify(report.labelsAdded)} · work ${JSON.stringify(report.work.counts)}\n${report.seconds.toFixed(1)} s · requests ${JSON.stringify(report.requests)}`
