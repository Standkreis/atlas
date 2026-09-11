import { describe, expect, it } from 'vitest'
import { contentDigest } from './catalogue-gallery-transfer'
import {
  CATALOGUE_APPLY_ORDER,
  CATALOGUE_TARGET_SNAPSHOT_TABLES,
  type CatalogueTargetRow,
  type TargetCatalogueSnapshot,
  type TargetGalleryReview,
} from './catalogue-import-plan'
import type { ValidatedCatalogueImport } from './catalogue-import-validation'
import { planCatalogueTarget } from './catalogue-import-relational-plan'
import { createCatalogueApplyReceipt } from './catalogue-import-store'

const at = '2026-09-10T12:00:00.000Z'
const later = '2026-09-11T12:00:00.000Z'
const sourceRegionId = 'source-mainz'
const targetRegionId = 'retained-mainz-uuid'
const schagenId = 'retired-schagen-uuid'
const outsideRegionId = 'outside-region'
const sourceTaxonA = 'source-taxon-a'
const targetTaxonA = 'retained-taxon-a'
const sourceTaxonB = 'source-taxon-b'

function taxon(overrides: Partial<CatalogueTargetRow>): CatalogueTargetRow {
  return {
    id: sourceTaxonA, gbifKey: 1, wikidataId: null, sciName: 'Source species', commonNames: { de: 'Quelle', fr: 'Source' },
    rank: 'species', tile: 'bird', class: 'Aves', order: 'Passeriformes', genus: 'Source', iucn: null,
    tags: [], intro: null, facts: null, factsAt: null, prose: null, namePath: null, contentAt: null, updatedAt: at,
    ...overrides,
  }
}
function region(overrides: Partial<CatalogueTargetRow>): CatalogueTargetRow {
  return {
    id: sourceRegionId, gadmGid: 'DEU.11.19_1', canonicalKey: 'de-krg-07339000', countryCode: 'DE',
    name: 'Mainz-Bingen', higher: 'Deutschland › Rheinland-Pfalz', monthTotals: [1], pickerSummary: { source: true },
    status: 'ready', error: null, refreshedAt: at, createdAt: at, ...overrides,
  }
}
function catalogue(overrides: Partial<CatalogueTargetRow>): CatalogueTargetRow {
  return {
    id: 'catalogue-new', countryCode: 'DE', runKey: 'germany-v7', registryVersionId: 'registry-new',
    inputFingerprint: 'input', sourceFingerprint: 'source', responseFingerprint: 'response', unionFingerprint: 'union',
    plausibleRulesVersion: 2, tileMappingVersion: 1, habitatRulesVersion: 0, habitatSource: null,
    observationWindowVersion: 1, yearFrom: 2016, yearTo: 2026, occurrencePredicates: { basis: 'observation' },
    status: 'active', expectedRegions: 1, completedRegions: 1, unionTaxa: 2, startedAt: at,
    generatedAt: at, auditedAt: at, activatedAt: later, executionOwner: null, executionExpiresAt: null, updatedAt: later,
    ...overrides,
  }
}
function registry(overrides: Partial<CatalogueTargetRow>): CatalogueTargetRow {
  return {
    id: 'registry-new', countryCode: 'DE', version: '2026-v7', artifactSha256: 'a'.repeat(64),
    expectedRegions: 1, expectedSourceUnits: 1, active: true, importedAt: at, activatedAt: later, ...overrides,
  }
}
function build(overrides: Partial<CatalogueTargetRow> = {}): CatalogueTargetRow {
  return {
    id: 'build-mainz', catalogueVersionId: 'catalogue-new', registryVersionId: 'registry-new',
    registryEntryId: 'entry-mainz', status: 'complete', attempts: 1, leaseOwner: null, leaseExpiresAt: null,
    startedAt: at, completedAt: later, error: null, totalObservations: 42, monthTotals: [42], regionSize: 2,
    nowCounts: [2], perTile: { bird: 2 }, rejectedTaxa: [], habitatSummary: null, requestStats: { pages: 1 },
    responseFingerprint: 'response', setFingerprint: 'set', createdAt: at, updatedAt: later, ...overrides,
  }
}
function work(taxonId: string, kind: string, version: string): CatalogueTargetRow {
  return {
    taxonId, kind, version, status: 'complete', attempts: 1, leaseOwner: null, leaseExpiresAt: null,
    startedAt: at, completedAt: later, error: null, resultSummary: { kind }, sourceFingerprint: `${kind}-source`,
    createdAt: at, updatedAt: later,
  }
}

function validatedSource(overrides: Partial<Record<string, readonly CatalogueTargetRow[]>> = {}): ValidatedCatalogueImport {
  const source: Record<string, readonly CatalogueTargetRow[]> = {
    Region: [region({ prose: undefined })],
    RegionRegistryVersion: [registry({ activatedAt: at, habitatRulesVersion: undefined, habitatSource: undefined })],
    RegionRegistrySource: [{
      id: 'registry-source', registryVersionId: 'registry-new', role: 'regions', name: 'Official', url: 'https://example.test/source',
      topicDate: '2026-01-01', downloadedAt: at, sha256: 'b'.repeat(64), licenceId: 'dl-de/by-2-0',
      licenceUrl: 'https://example.test/licence', attribution: 'Office', metadata: { reviewed: true },
    }],
    RegionRegistryEntry: [{
      id: 'entry-mainz', registryVersionId: 'registry-new', sourceId: 'registry-source', regionId: sourceRegionId,
      sourceCode: '07339', sourceName: 'Mainz-Bingen', displayName: 'Mainz-Bingen', stateCode: 'RP', stateName: 'Rheinland-Pfalz',
    }],
    RegionRegistryAlias: [{ id: 'alias-mainz', registryEntryId: 'entry-mainz', kind: 'sourceName', name: 'Mainz-Bingen', normalizedName: 'mainz bingen' }],
    RegionSourceUnit: [{
      id: 'unit-mainz', registryVersionId: 'registry-new', registryEntryId: 'entry-mainz', sourceId: 'registry-source',
      canonicalKey: 'de-krg-07339000', sourceCode: '07339', name: 'Mainz-Bingen', kind: 'kreis',
    }],
    RegionQueryUnit: [{
      id: 'query-mainz', registryVersionId: 'registry-new', sourceUnitId: 'unit-mainz', sourceId: 'registry-source',
      provider: 'gbifGadm', providerVersion: 'v1', providerKey: 'DEU.11.19_1', reviewStatus: 'verified', reviewedAt: at,
      evidence: { official: true },
    }],
    Taxon: [
      taxon({ prose: { version: 1, regions: { [sourceRegionId]: { marker: 'source' }, 'foreign-source': { marker: 'foreign' } } } }),
      taxon({ id: sourceTaxonB, gbifKey: 2, wikidataId: 'Q2', sciName: 'Second source', commonNames: { de: 'Zweite' }, genus: 'Source', prose: null }),
    ],
    CatalogueVersion: [catalogue({ activatedAt: at, habitatRulesVersion: undefined, habitatSource: undefined })],
    CatalogueRegionBuild: [build({ habitatSummary: undefined })],
    CataloguePlausibility: [
      { id: 'source-p-a', regionBuildId: 'build-mainz', taxonId: sourceTaxonA, obs: 10, monthShare: [10], peak: 1, words: 'source a' },
      { id: 'source-p-b', regionBuildId: 'build-mainz', taxonId: sourceTaxonB, obs: 20, monthShare: [20], peak: 2, words: 'source b' },
    ],
    CatalogueLookalike: [{ id: 'source-look', regionBuildId: 'build-mainz', taxonId: sourceTaxonA, siblingId: sourceTaxonB }],
    CatalogueTaxon: [
      { catalogueVersionId: 'catalogue-new', taxonId: sourceTaxonA, createdAt: at },
      { catalogueVersionId: 'catalogue-new', taxonId: sourceTaxonB, createdAt: at },
    ],
    CatalogueTaxonomyResolution: [{
      catalogueVersionId: 'catalogue-new', sourceKey: 1, record: { acceptedKey: 1 }, recordFingerprint: 'record',
      acceptedKey: 1, rejectionReason: null, resolvedAt: at,
    }],
    Asset: [],
    TaxonEnrichmentWork: [work(sourceTaxonA, 'names', '1'), work(sourceTaxonA, 'gallery', '1'), work(sourceTaxonB, 'names', '1'), work(sourceTaxonB, 'gallery', '1')],
    ...overrides,
  }
  const tables = new Map(Object.entries(source))
  return {
    pins: {
      catalogueId: 'catalogue-new', runKey: 'germany-v7', registryVersionId: 'registry-new', unionTaxa: 2,
      inputFingerprint: 'input', responseFingerprint: 'response', unionFingerprint: 'union',
      baseAuditFingerprint: 'c'.repeat(64), contentAuditFingerprint: 'd'.repeat(64), contentFingerprint: 'e'.repeat(64), taxonFingerprint: 'f'.repeat(64),
    },
    tables,
    evidence: { files: [], tables: [], decodedFingerprint: '0'.repeat(64) },
    assertStillValid: async () => {},
  } as unknown as ValidatedCatalogueImport
}

function targetSnapshot(overrides: Partial<Record<string, readonly CatalogueTargetRow[]>> = {}): TargetCatalogueSnapshot {
  const tables = new Map<string, readonly CatalogueTargetRow[]>(CATALOGUE_TARGET_SNAPSHOT_TABLES.map((table) => [table, []]))
  const existing: Record<string, readonly CatalogueTargetRow[]> = {
    Identity: [{ id: 'person', createdAt: at, email: 'owner@example.test', emailVerifiedAt: at, displayName: 'Owner', avatarAssetId: null }],
    Filter: [{ id: 'filter', identityId: 'person', regionId: schagenId, regionIds: [sourceRegionId, schagenId, sourceRegionId, 'unknown'], tiles: ['bird'], nowOnly: true, updatedAt: at }],
    Region: [
      region({ id: targetRegionId, canonicalKey: null, name: 'Legacy Mainz', pickerSummary: { old: true }, createdAt: '2020-01-01T00:00:00.000Z' }),
      region({ id: schagenId, gadmGid: 'NLD.9.73_1', canonicalKey: null, countryCode: null, name: 'Schagen' }),
      region({ id: outsideRegionId, gadmGid: 'FRA.1_1', canonicalKey: 'fr-outside', countryCode: 'FR', name: 'Outside' }),
    ],
    RegionRegistryVersion: [registry({ id: 'registry-old', version: 'old', active: true, activatedAt: at })],
    CatalogueVersion: [catalogue({ id: 'catalogue-old', runKey: 'old', registryVersionId: 'registry-old', status: 'active', activatedAt: at })],
    Taxon: [
      taxon({
        id: targetTaxonA, gbifKey: 1, wikidataId: 'Q1', sciName: 'Old classification', commonNames: { de: 'Zielname', en: 'Target name', fr: '' },
        rank: 'subspecies', tile: 'plant', class: 'Old', order: 'Old', genus: 'Old', iucn: 'LC', tags: ['rich'],
        intro: { target: true }, facts: { target: true }, factsAt: at,
        prose: { version: 1, regions: { [targetRegionId]: { marker: 'target' }, [schagenId]: { marker: 'retained retired prose' }, 'foreign-target': { marker: 'keep' } } },
        namePath: ['rich'], contentAt: at, updatedAt: '2024-01-01T00:00:00.000Z',
      }),
      taxon({ id: 'outside-taxon', gbifKey: 99, wikidataId: 'Q99', sciName: 'Outside taxon' }),
    ],
    Plausibility: [
      { id: 'old-p-a', taxonId: targetTaxonA, regionId: targetRegionId, obs: 1, monthShare: [1], peak: 0, words: 'old' },
      { id: 'retired-p', taxonId: targetTaxonA, regionId: schagenId, obs: 1, monthShare: [1], peak: 0, words: 'retired' },
      { id: 'outside-p', taxonId: 'outside-taxon', regionId: outsideRegionId, obs: 1, monthShare: [1], peak: 0, words: 'outside' },
    ],
    Lookalike: [
      { taxonId: targetTaxonA, regionId: schagenId, siblingId: 'outside-taxon' },
      { taxonId: 'outside-taxon', regionId: outsideRegionId, siblingId: targetTaxonA },
    ],
    Interaction: [{ id: 'interaction', sourceId: targetTaxonA, targetId: 'outside-taxon', kind: 'eats', origin: 'owner', studies: {}, real: 1, prose: true }],
    Asset: [{
      id: 'old-sound', kind: 'sound', url: 'https://example.test/sound', author: 'Owner', licence: null,
      licenceUrl: null, sourceUrl: null, origin: 'user', caption: null, meta: null, position: 0, createdAt: at,
      taxonId: targetTaxonA, sightingId: null, ownerId: null, byteSize: 10,
    }],
    TaxonEnrichmentWork: [work(targetTaxonA, 'names', '1')],
    ...overrides,
  }
  for (const [table, rows] of Object.entries(existing)) tables.set(table, rows)
  return { tables }
}

const gallery: TargetGalleryReview = {
  reviewer: 'owner', reviewedAt: later, receiptEvidence: { reviewed: true },
  reuseTargetAssetIdBySourceId: new Map(),
  reviewAsset() { throw new Error('fixture has no reference image') },
}

function mutation(plan: ReturnType<typeof planCatalogueTarget>, table: string, phase?: string) {
  return plan.mutations.filter((row) => row.table === table && (!phase || row.phase === phase))
}

describe('planCatalogueTarget', () => {
  it('maps the complete source graph, preserves rich target content and publishes only the reviewed live scope', () => {
    const source = validatedSource()
    const target = targetSnapshot()
    const plan = planCatalogueTarget({ source, target, gallery, activationAt: later })

    expect(plan.mappings.regionIdBySourceId.get(sourceRegionId)).toBe(targetRegionId)
    expect(plan.mappings.taxonIdBySourceId.get(sourceTaxonA)).toBe(targetTaxonA)
    expect(plan.mappings.taxonIdBySourceId.get(sourceTaxonB)).toBe(sourceTaxonB)

    const mappedTaxon = mutation(plan, 'Taxon').find((row) => row.key.id === targetTaxonA)!.after!
    expect(mappedTaxon).toMatchObject({
      id: targetTaxonA, gbifKey: 1, wikidataId: 'Q1', sciName: 'Source species', rank: 'species', tile: 'bird',
      class: 'Aves', order: 'Passeriformes', genus: 'Source', iucn: 'LC', tags: ['rich'], intro: { target: true },
      facts: { target: true }, commonNames: { de: 'Zielname', en: 'Target name', fr: 'Source' },
      updatedAt: '2024-01-01T00:00:00',
      prose: { version: 1, regions: {
        [targetRegionId]: { marker: 'target' }, [schagenId]: { marker: 'retained retired prose' },
        'foreign-source': { marker: 'foreign' }, 'foreign-target': { marker: 'keep' },
      } },
    })
    const sourceEntry = mutation(plan, 'RegionRegistryEntry')[0]!.after!
    expect(sourceEntry.regionId).toBe(targetRegionId)
    expect(mutation(plan, 'CataloguePlausibility').map((row) => row.after?.taxonId)).toEqual([targetTaxonA, sourceTaxonB])
    expect(mutation(plan, 'CatalogueLookalike')[0]!.after).toMatchObject({ taxonId: targetTaxonA, siblingId: sourceTaxonB })
    expect(mutation(plan, 'TaxonEnrichmentWork').some((row) => row.after?.taxonId === targetTaxonA)).toBe(true)

    const live = mutation(plan, 'Plausibility', 'publish')
    expect(live.find((row) => row.key.id === 'old-p-a')!.after).toMatchObject({ id: 'old-p-a', taxonId: targetTaxonA, regionId: targetRegionId, obs: 10 })
    expect(live.find((row) => row.key.id === 'retired-p')!.after).toBeNull()
    expect(live.some((row) => row.key.id === 'outside-p')).toBe(false)
    expect(mutation(plan, 'Lookalike', 'publish').some((row) => row.before?.regionId === outsideRegionId)).toBe(false)

    expect(mutation(plan, 'Filter', 'publish')[0]!.after).toEqual({
      id: 'filter', identityId: 'person', regionId: targetRegionId, regionIds: [targetRegionId],
      tiles: ['bird'], nowOnly: true, updatedAt: '2026-09-10T12:00:00',
    })
    expect(mutation(plan, 'RegionRegistryVersion', 'materialize')[0]!.after).toMatchObject({ id: 'registry-new', active: false, activatedAt: null })
    expect(mutation(plan, 'CatalogueVersion', 'materialize')[0]!.after).toMatchObject({ id: 'catalogue-new', status: 'audited', activatedAt: null, habitatRulesVersion: 0, habitatSource: null })
    expect(mutation(plan, 'RegionRegistryVersion', 'publish').find((row) => row.key.id === 'registry-new')!.after?.activatedAt).toBe('2026-09-11T12:00:00')
    expect(mutation(plan, 'CatalogueVersion', 'publish').find((row) => row.key.id === 'catalogue-new')!.after?.activatedAt).toBe('2026-09-11T12:00:00')
    expect(mutation(plan, 'CatalogueVersion', 'publish').find((row) => row.key.id === 'catalogue-old')!.after?.status).toBe('retired')
    expect(mutation(plan, 'ReferenceGalleryReceipt')).toHaveLength(2)

    const protectedAssets = plan.protectedScopes.find((scope) => scope.table === 'Asset' && scope.selector.kind === 'all')!
    expect(protectedAssets.beforeRows).toBe(1)
    expect(plan.protectedScopes.some((scope) => scope.table === 'Interaction' && scope.selector.kind === 'all')).toBe(true)
    expect(plan.protectedScopes.some((scope) => scope.table === 'Taxon' && scope.selector.kind === 'keys' && scope.selector.keys.some((key) => key.id === 'outside-taxon'))).toBe(true)

    const ranks = plan.mutations.map((row) => CATALOGUE_APPLY_ORDER.findIndex((entry) => entry.phase === row.phase && entry.table === row.table))
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    expect(() => (plan.mappings.taxonIdBySourceId as Map<string, string>).set('x', 'y')).toThrow()
    expect(Object.isFrozen(plan.mutations)).toBe(true)
    expect(Object.isFrozen(target.tables.get('Taxon')![0])).toBe(false)

    const again = planCatalogueTarget({ source, target, gallery, activationAt: later })
    expect(again.fingerprint).toBe(plan.fingerprint)
    expect(contentDigest(again.mutations)).toBe(contentDigest(plan.mutations))
    expect(createCatalogueApplyReceipt({ operationId: 'fixture', plan, validated: source, createdAt: later }).planFingerprint).toBe(plan.fingerprint)
  })

  it('preserves an unsupported nonempty target prose shape without reinterpreting it', () => {
    const target = targetSnapshot({ Taxon: [
      taxon({ id: targetTaxonA, gbifKey: 1, wikidataId: 'Q1', sciName: 'old classification', prose: { version: 2, body: 'owner-rich' } }),
      taxon({ id: 'outside-taxon', gbifKey: 99, wikidataId: 'Q99' }),
    ] })
    const plan = planCatalogueTarget({ source: validatedSource(), target, gallery, activationAt: later })
    expect(mutation(plan, 'Taxon').find((row) => row.key.id === targetTaxonA)!.after?.prose).toEqual({ version: 2, body: 'owner-rich' })
  })

  it('rejects unequal prose values that remap onto one region and deduplicates equal values', () => {
    const conflicting = validatedSource({ Taxon: [
      taxon({ prose: { version: 1, regions: {
        [sourceRegionId]: { text: 'source-id' }, [targetRegionId]: { text: 'target-id' },
      } } }),
      taxon({ id: sourceTaxonB, gbifKey: 2, wikidataId: 'Q2', prose: null }),
    ] })
    expect(() => planCatalogueTarget({ source: conflicting, target: targetSnapshot(), gallery, activationAt: later })).toThrow('source Taxon.prose maps conflicting prose')

    const same = { text: 'same' }
    const deduplicated = validatedSource({ Taxon: [
      taxon({ prose: { version: 1, regions: { [sourceRegionId]: same, [targetRegionId]: same } } }),
      taxon({ id: sourceTaxonB, gbifKey: 2, wikidataId: 'Q2', prose: null }),
    ] })
    const target = targetSnapshot({ Taxon: [
      taxon({ id: targetTaxonA, gbifKey: 1, wikidataId: 'Q1', prose: null }),
      taxon({ id: 'outside-taxon', gbifKey: 99, wikidataId: 'Q99', prose: null }),
    ] })
    const plan = planCatalogueTarget({ source: deduplicated, target, gallery, activationAt: later })
    expect(mutation(plan, 'Taxon').find((row) => row.key.id === targetTaxonA)!.after?.prose).toEqual({
      version: 1, regions: { [targetRegionId]: same },
    })
  })

  it('rejects cross-GBIF Wikidata reuse, UUID collisions and ambiguous legacy/canonical regions', () => {
    const conflictSource = validatedSource({ Taxon: [
      taxon({ wikidataId: null }), taxon({ id: sourceTaxonB, gbifKey: 2, wikidataId: 'Q99' }),
    ] })
    expect(() => planCatalogueTarget({ source: conflictSource, target: targetSnapshot(), gallery, activationAt: later })).toThrow(/Wikidata identity Q99 conflicts/)

    const uuidConflict = targetSnapshot({ Taxon: [
      taxon({ id: targetTaxonA, gbifKey: 1, wikidataId: 'Q1' }),
      taxon({ id: sourceTaxonB, gbifKey: 99, wikidataId: 'Q99' }),
    ] })
    expect(() => planCatalogueTarget({ source: validatedSource(), target: uuidConflict, gallery, activationAt: later })).toThrow(/UUID collides/)

    const ambiguous = targetSnapshot({ Region: [
      region({ id: targetRegionId, canonicalKey: null }),
      region({ id: 'canonical-mainz', gadmGid: null, canonicalKey: 'de-krg-07339000' }),
    ] })
    expect(() => planCatalogueTarget({ source: validatedSource(), target: ambiguous, gallery, activationAt: later })).toThrow(/ambiguous canonical\/legacy/)
  })

  it('emits complete scalar before/after rows including dormant schema defaults', () => {
    const plan = planCatalogueTarget({ source: validatedSource(), target: targetSnapshot(), gallery, activationAt: later })
    const catalogueColumns = [
      'id', 'countryCode', 'runKey', 'registryVersionId', 'inputFingerprint', 'sourceFingerprint', 'responseFingerprint',
      'unionFingerprint', 'plausibleRulesVersion', 'tileMappingVersion', 'habitatRulesVersion', 'habitatSource',
      'observationWindowVersion', 'yearFrom', 'yearTo', 'occurrencePredicates', 'status', 'expectedRegions',
      'completedRegions', 'unionTaxa', 'startedAt', 'generatedAt', 'auditedAt', 'activatedAt', 'executionOwner',
      'executionExpiresAt', 'updatedAt',
    ].sort()
    for (const change of mutation(plan, 'CatalogueVersion')) {
      if (change.before) expect(Object.keys(change.before).sort()).toEqual(catalogueColumns)
      if (change.after) expect(Object.keys(change.after).sort()).toEqual(catalogueColumns)
    }
    const buildColumns = [
      'id', 'catalogueVersionId', 'registryVersionId', 'registryEntryId', 'status', 'attempts', 'leaseOwner',
      'leaseExpiresAt', 'startedAt', 'completedAt', 'error', 'totalObservations', 'monthTotals', 'regionSize',
      'nowCounts', 'perTile', 'rejectedTaxa', 'habitatSummary', 'requestStats', 'responseFingerprint', 'setFingerprint',
      'createdAt', 'updatedAt',
    ].sort()
    expect(Object.keys(mutation(plan, 'CatalogueRegionBuild')[0]!.after!).sort()).toEqual(buildColumns)
    for (const receipt of mutation(plan, 'ReferenceGalleryReceipt')) expect(receipt.after).toHaveProperty('createdAt', '2026-09-11T12:00:00')
  })
})
