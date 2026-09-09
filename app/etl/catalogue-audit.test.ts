import { describe, expect, it } from 'vitest'
import { assertLocalDatabaseUrl, buildCatalogueAudit, buildTransferManifest, deterministicJson, makeReviewTemplate, parseAuditArgs, sha256, type AuditSnapshot, type ReviewFile } from './catalogue-audit'

const FIXTURE_REGISTRY = { artifactSha256: sha256('registry'), regions: 6, sourceUnits: 8, mappedQueryUnits: 8, provider: 'gbifGadm', providerVersion: '4.1', excludedQueryKeys: [] }

const taxon = (gbifKey: number, sciName = `Species ${gbifKey}`) => ({
  id: `taxon-${gbifKey}`, gbifKey, sciName, commonNames: { de: `Art ${gbifKey}` }, rank: 'species', tile: 'plant', class: null, order: null, genus: 'Species',
})

function snapshot(): AuditSnapshot {
  const keys = ['de-krg-01054000', 'de-krg-07232000', 'de-krg-09180000', 'de-krg-11000000', 'de-krg-14626000', 'de-krg-07340000']
  const union = keys.map((_, index) => taxon(index + 1))
  const regions = keys.map((key, index) => ({
    regionId: `region-${index}`, key, regionStatus: 'ready', sourceCode: key.slice(-8), name: key, sourceName: key, stateCode: '99', state: 'Testland', aliases: [key],
    sourceUnits: key === 'de-krg-07340000'
      ? ['07317', '07320', '07340'].map((sourceCode) => ({ sourceCode, name: sourceCode, kind: 'Kreis', queryUnits: [{ provider: 'gbifGadm', providerVersion: '4.1', providerKey: `DEU.${sourceCode}`, reviewStatus: 'verified', reviewedAt: '2026-09-08T10:00:00.000Z', evidence: { sourceUnitKey: `de-krs-${sourceCode}`, mappingSha256: sha256('mapping'), resolvedAt: '2026-09-08T09:00:00.000Z', reviewMethod: 'fixture', minimumLargestOverlap: 1 } }] }))
      : [{ sourceCode: key.slice(-8, -3), name: key, kind: 'Kreis', queryUnits: [{ provider: 'gbifGadm', providerVersion: '4.1', providerKey: `DEU.${index}`, reviewStatus: 'verified', reviewedAt: '2026-09-08T10:00:00.000Z', evidence: { sourceUnitKey: `de-krs-${key.slice(-8, -3)}`, mappingSha256: sha256('mapping'), resolvedAt: '2026-09-08T09:00:00.000Z', reviewMethod: 'fixture', minimumLargestOverlap: 1 } }] }],
    build: {
      id: `build-${index}`, registryEntryId: `entry-${index}`, status: 'complete', attempts: 1, error: null, totalObservations: 100, monthTotals: Array(12).fill(100), regionSize: 1, nowCounts: Array(12).fill(1), perTile: { plant: 1 }, rejectedTaxa: [],
      responseFingerprint: sha256(`response-${index}`), setFingerprint: '',
      plausibility: [{ taxon: union[index]!, obs: 10, monthShare: Array(12).fill(100), peak: 100, words: 'Ganzes Jahr' }],
      lookalikes: [],
    },
  }))
  for (const region of regions) {
    const build = region.build
    build.setFingerprint = sha256({
      regionKey: region.key,
      total: build.totalObservations,
      monthTotals: build.monthTotals,
      perTile: build.perTile,
      taxa: build.plausibility.map((row) => ({ gbifKey: row.taxon.gbifKey, sciName: row.taxon.sciName, rank: row.taxon.rank, tile: row.taxon.tile, class: row.taxon.class, order: row.taxon.order, genus: row.taxon.genus })),
      plausibility: build.plausibility.map((row) => ({ gbifKey: row.taxon.gbifKey, obs: row.obs, monthShare: row.monthShare, peak: row.peak, words: row.words })),
      lookalikes: [],
      rejectedTaxa: [],
    })
  }
  const unionFingerprint = sha256(union.map((row) => row.gbifKey))
  const registryArtifactSha256 = sha256('registry')
  const sourceRecords: Array<{ role: string; sha256: string; topicDate: string }> = []
  const sourceFingerprint = sha256({ artifact: registryArtifactSha256, sources: sourceRecords })
  const inputFingerprint = sha256({ registryVersionId: 'registry-1', registryVersion: '2024', sourceFingerprint, rules: { plausible: 1, tile: 1 }, observation: { version: 1, yearFrom: 2016, yearTo: 2026 }, occurrencePredicates: {} })
  const responseFingerprint = sha256(regions.map((region) => ({ entry: region.build.registryEntryId, response: region.build.responseFingerprint })).sort((a, b) => a.entry.localeCompare(b.entry)))
  const mappingSource = { name: 'Fixture mapping → BKG VG250', url: 'https://example.test/gadm', sha256: sha256('mapping-source') }
  const mappingMetadata = {
    provider: 'gbifGadm', providerVersion: '4.1', gbifEvidence: { name: 'Fixture GBIF evidence', url: 'https://example.test/gbif', sha256: sha256('gbif') },
    resolvedAt: '2026-09-08T09:00:00.000Z', reviewedAt: '2026-09-08T10:00:00.000Z',
    counts: { sourceUnits: 8, mappedQueryUnits: 8, excludedQueryUnits: 0, providerInventory: 8 },
    review: { status: 'verified', method: 'fixture', minimumLargestOverlap: 1, excluded: [] },
  }
  const mappings = regions.flatMap((region) => region.sourceUnits).map((unit) => ({ sourceUnitKey: `de-krs-${unit.sourceCode}`, providerKeys: unit.queryUnits.map((query) => query.providerKey).sort() })).sort((a, b) => a.sourceUnitKey.localeCompare(b.sourceUnitKey))
  const mappingSha256 = sha256({ schemaVersion: 1, registryId: 'registry-1', provider: mappingMetadata.provider, providerVersion: mappingMetadata.providerVersion, source: { name: 'Fixture mapping', url: mappingSource.url, sha256: mappingSource.sha256 }, gbifEvidence: mappingMetadata.gbifEvidence, resolvedAt: mappingMetadata.resolvedAt, reviewedAt: mappingMetadata.reviewedAt, counts: mappingMetadata.counts, review: mappingMetadata.review, mappings })
  for (const region of regions) for (const unit of region.sourceUnits) for (const query of unit.queryUnits) query.evidence = { sourceUnitKey: `de-krs-${unit.sourceCode}`, mappingSha256, resolvedAt: mappingMetadata.resolvedAt, reviewMethod: mappingMetadata.review.method, minimumLargestOverlap: mappingMetadata.review.minimumLargestOverlap }
  return {
    catalogue: {
      id: 'catalogue-1', countryCode: 'DE', runKey: 'germany-1', status: 'active', registryVersionId: 'registry-1', registryVersion: '2024', registryArtifactSha256,
      inputFingerprint, sourceFingerprint, responseFingerprint, unionFingerprint,
      plausibleRulesVersion: 1, tileMappingVersion: 1, observationWindowVersion: 1, yearFrom: 2016, yearTo: 2026, occurrencePredicates: {}, expectedRegions: 6, completedRegions: 6, unionTaxa: 6,
      generatedAt: '2026-09-08T12:00:00.000Z', sourceTopicDates: ['2024-12-31'], sourceRecords, sourceDetails: [], registryExpectedSourceUnits: 8,
      mappingMetadata: { ...mappingMetadata, mappingSha256, sourceUnitCount: 8, queryUnitCount: 8 }, mappingSource,
    },
    regions,
    union,
    taxonomy: union.map((row) => {
      const record = { version: 1, status: 'accepted', acceptedKey: row.gbifKey, species: { key: row.gbifKey, rank: 'SPECIES', canonicalName: row.sciName, kingdom: 'Plantae', genus: 'Species' } }
      return { sourceKey: row.gbifKey, acceptedKey: row.gbifKey, rejectionReason: null, record, recordFingerprint: sha256(record) }
    }),
  }
}

function passedReviews(base: AuditSnapshot): ReviewFile {
  const draft = buildCatalogueAudit(base, null, FIXTURE_REGISTRY)
  const template = makeReviewTemplate(draft)
  return {
    ...template,
    reviews: template.reviews.map((target) => ({
      ...target,
      reviewer: 'A. Reviewer',
      reviewedAt: '2026-09-08T14:00:00.000Z',
      notes: 'Species list, names, seasonal summaries and query-unit boundary evidence reviewed.',
      checks: { species: 'pass', naming: 'pass', seasonality: 'pass', boundary: 'pass' },
    })),
  }
}

describe('Germany catalogue audit', () => {
  it('requires explicit, unambiguous arguments and a local activation database', () => {
    expect(parseAuditArgs(['--catalogue', 'cat', '--output', '/tmp/audit', '--review', '/tmp/review.json', '--activate-local'])).toEqual({
      catalogue: 'cat', output: '/tmp/audit', review: '/tmp/review.json', activateLocal: true,
    })
    for (const args of [
      ['--catalogue', '--output', '/tmp/audit'],
      ['--catalogue', 'cat', '--output'],
      ['--catalogue', 'cat', '--catalogue', 'other', '--output', '/tmp/audit'],
      ['--catalogue', 'cat', '--output', '/tmp/audit', '--activate-local', '--activate-local'],
      ['--catalogue', 'cat', '--output', '/tmp/audit', '--unknown'],
    ]) expect(() => parseAuditArgs(args)).toThrow()
    expect(() => assertLocalDatabaseUrl('')).toThrow('explicit local DATABASE_URL')
    expect(() => assertLocalDatabaseUrl('postgresql://example.test/dex')).toThrow('local-only')
    expect(() => assertLocalDatabaseUrl('postgresql://dex:dex@localhost:5433/dex_germany_atlas')).not.toThrow()
  })

  it('is blocked on explicit scientific review even when every mechanical invariant passes', () => {
    const input = snapshot()
    const audit = buildCatalogueAudit(input, null, FIXTURE_REGISTRY)
    expect(audit.defects).toEqual([])
    expect(audit.completion.ready).toBe(6)
    expect(audit.review).toEqual({ required: 6, passed: 0, failed: 0, missing: 6 })
    expect(audit.verdict).toBe('blocked')
    expect(audit.southwestPalatinate).toMatchObject({ validComposition: true, sourceUnits: ['07317', '07320', '07340'] })
    expect(makeReviewTemplate(audit).reviews).toHaveLength(6)
  })

  it('becomes transfer-ready only after every required check has an evidence-bearing pass', () => {
    const input = snapshot()
    const audit = buildCatalogueAudit(input, passedReviews(input), FIXTURE_REGISTRY)
    expect(audit.review).toEqual({ required: 6, passed: 6, failed: 0, missing: 0 })
    expect(audit.verdict).toBe('ready-for-transfer')
    expect(audit.coverageLimits.map((row) => row.code)).toEqual(['gadm-approximation', 'provider-duplicates'])
    const transfer = { artifact: { file: 'transfer-artifact.jsonl', sha256: sha256('artifact'), bytes: 10, rows: 6 }, tables: [{ table: 'CatalogueTaxon', columns: ['catalogueVersionId', 'taxonId'], rows: 6, digest: sha256(input.union) }] }
    const manifest = buildTransferManifest(input, audit, transfer)
    expect(manifest).toMatchObject({ eligible: true, payload: { containsPersonalRows: false } })
    expect(manifest.payload.excludes).toEqual(expect.arrayContaining(['Identity', 'Sighting', 'Study', 'Asset']))
    expect(manifest.payload.tables).toEqual([{ table: 'CatalogueTaxon', columns: ['catalogueVersionId', 'taxonId'], rows: 6, digest: sha256(input.union) }])
  })

  it('separates missing names as coverage from corrupt taxonomy and seasonality as defects', () => {
    const input = snapshot()
    input.union[0]!.commonNames = {}
    input.regions[0]!.build!.plausibility[0]!.taxon.commonNames = {}
    input.union[1]!.rank = 'genus'
    input.regions[1]!.build!.plausibility[0]!.monthShare = [100]
    const audit = buildCatalogueAudit(input, passedReviews(input), FIXTURE_REGISTRY)
    expect(audit.coverageLimits.some((row) => row.code === 'missing-german-name')).toBe(true)
    expect(audit.defects.map((row) => row.code)).toEqual(expect.arrayContaining(['rank', 'month-shares']))
    expect(audit.verdict).toBe('blocked')
  })

  it('emits byte-stable JSON and catches a taxonomy-envelope digest change', () => {
    const input = snapshot()
    input.taxonomy[0]!.record = { damaged: true }
    const first = buildCatalogueAudit(input, null, FIXTURE_REGISTRY)
    const second = buildCatalogueAudit(input, null, FIXTURE_REGISTRY)
    expect(deterministicJson(first)).toBe(deterministicJson(second))
    expect(first.defects.some((row) => row.code === 'taxonomy-fingerprint')).toBe(true)
  })

  it('reconstructs the exact operational mapping and fails when one ownership row changes', () => {
    const input = snapshot()
    input.regions[0]!.sourceUnits[0]!.queryUnits[0]!.providerKey = 'DEU.999.999_1'
    const audit = buildCatalogueAudit(input, null, FIXTURE_REGISTRY)
    expect(audit.defects.some((row) => row.code === 'query-mapping-fingerprint')).toBe(true)
  })

  it('recomputes catalogue inputs and accepted taxonomy identity instead of trusting stored digests', () => {
    const input = snapshot()
    input.catalogue.occurrencePredicates = { occurrenceStatus: 'ABSENT' }
    input.union[0]!.sciName = 'Altered name'
    const audit = buildCatalogueAudit(input, null, FIXTURE_REGISTRY)
    expect(audit.defects.map((row) => row.code)).toEqual(expect.arrayContaining(['input-fingerprint', 'taxon-identity']))
  })

  it('makes a proposed region exclusion reviewable but requires a regenerated candidate', () => {
    const input = snapshot()
    const firstReview = passedReviews(input)
    firstReview.regionExclusions = [{ key: input.regions[0]!.key, reason: 'Boundary evidence requires exclusion.', reviewer: 'A. Reviewer', reviewedAt: '2026-09-08T14:00:00.000Z' }]
    const changed = buildCatalogueAudit(input, firstReview, FIXTURE_REGISTRY)
    const revised = makeReviewTemplate(changed)
    expect(revised.regionExclusions).toEqual(firstReview.regionExclusions)
    expect(changed.reviewTargets.find((target) => target.key === input.regions[0]!.key)?.reasons).toContain('reviewed-region-exclusion')
    expect(changed.defects.some((row) => row.code === 'region-exclusion-regeneration')).toBe(true)
  })
})
