import { z } from 'zod'

const sha256 = z.string().regex(/^[0-9a-f]{64}$/)
const httpsUrl = z.string().url().refine((value) => value.startsWith('https://'), 'must use https')
const instant = z.string().datetime({ offset: true })
const sourceUnitKey = z.string().regex(/^de-krs-\d{5}$/)
const providerKey = z.string().regex(/^DEU(?:\.\d+)+_\d+$/)
const GERMANY_REGISTRY_ID = 'de-krg-2024-12-31'
const GERMANY_QUERY_COUNTS = {
  sourceUnits: 400,
  mappedQueryUnits: 402,
  excludedQueryUnits: 1,
  providerInventory: 403,
} as const
const DEFERRED_GERMANY_QUERY_KEYS = ['DEU.1.5_1'] as const

const source = z.object({
  name: z.string().trim().min(1),
  url: httpsUrl,
  sha256,
}).strict()

const excluded = z.object({
  providerKey,
  name: z.string().trim().min(1),
  type: z.string().trim().min(1),
  reason: z.string().trim().min(1),
}).strict()

const mapping = z.object({
  sourceUnitKey,
  providerKeys: z.array(providerKey).min(1),
}).strict()

const mappingDocument = z.object({
  schemaVersion: z.literal(1),
  registryId: z.string().regex(/^de-krg-\d{4}-\d{2}-\d{2}$/),
  provider: z.literal('gbifGadm'),
  providerVersion: z.string().trim().min(1),
  source,
  gbifEvidence: source,
  resolvedAt: instant,
  reviewedAt: instant,
  counts: z.object({
    sourceUnits: z.number().int().nonnegative(),
    mappedQueryUnits: z.number().int().nonnegative(),
    excludedQueryUnits: z.number().int().nonnegative(),
    providerInventory: z.number().int().nonnegative(),
  }).strict(),
  review: z.object({
    status: z.literal('verified'),
    method: z.string().trim().min(1),
    minimumLargestOverlap: z.number().min(0).max(1),
    excluded: z.array(excluded),
  }).strict(),
  mappings: z.array(mapping).min(1),
}).strict()

export type RegionQueryMapping = z.infer<typeof mappingDocument>

function assertStrictlySorted(values: string[], label: string) {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1]! >= values[index]!) throw new Error(`${label} must be strictly sorted and unique`)
  }
}

/**
 * Validate a local operator mapping without making it a repository asset. GADM identifiers and
 * review evidence are persisted in Postgres by the importer, but the national crosswalk itself is
 * deliberately not checked into Git under the GADM terms recorded in the Germany contract.
 */
export function parseRegionQueryMapping(input: unknown): RegionQueryMapping {
  const document = mappingDocument.parse(input)
  assertStrictlySorted(document.mappings.map((row) => row.sourceUnitKey), 'mapping source-unit keys')

  const allProviderKeys: string[] = []
  for (const row of document.mappings) {
    assertStrictlySorted(row.providerKeys, `provider keys for ${row.sourceUnitKey}`)
    allProviderKeys.push(...row.providerKeys)
  }
  if (new Set(allProviderKeys).size !== allProviderKeys.length) throw new Error('provider keys must be assigned exactly once')

  const excludedKeys = document.review.excluded.map((row) => row.providerKey)
  if (new Set(excludedKeys).size !== excludedKeys.length) throw new Error('excluded provider keys must be unique')
  if (excludedKeys.some((key) => allProviderKeys.includes(key))) throw new Error('an excluded provider key cannot also be mapped')
  const computedCounts = {
    sourceUnits: document.mappings.length,
    mappedQueryUnits: allProviderKeys.length,
    excludedQueryUnits: excludedKeys.length,
    providerInventory: allProviderKeys.length + excludedKeys.length,
  }
  for (const [name, actual] of Object.entries(computedCounts)) {
    if (document.counts[name as keyof typeof computedCounts] !== actual) {
      throw new Error(`mapping counts.${name} must equal computed value ${actual}`)
    }
  }
  if (document.registryId === GERMANY_REGISTRY_ID) {
    if (document.providerVersion !== '4.1') throw new Error('Germany registry query mapping must use GADM 4.1')
    for (const [name, expected] of Object.entries(GERMANY_QUERY_COUNTS)) {
      if (document.counts[name as keyof typeof GERMANY_QUERY_COUNTS] !== expected) {
        throw new Error(`Germany registry query mapping counts.${name} must equal ${expected}`)
      }
    }
    if (
      excludedKeys.length !== DEFERRED_GERMANY_QUERY_KEYS.length ||
      DEFERRED_GERMANY_QUERY_KEYS.some((key, index) => excludedKeys[index] !== key)
    ) throw new Error(`Germany registry query mapping must exclude exactly ${DEFERRED_GERMANY_QUERY_KEYS.join(', ')}`)
  }
  if (new Date(document.reviewedAt) < new Date(document.resolvedAt)) throw new Error('reviewedAt must not precede resolvedAt')
  return document
}
