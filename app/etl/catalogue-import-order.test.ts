import { describe, expect, it } from 'vitest'
import { canonicalContent, contentDigest } from './catalogue-gallery-transfer'
import {
  CATALOGUE_TARGET_PRIMARY_KEYS,
  canonicalCatalogueTargetRows,
  catalogueTargetRowsFingerprint,
  type CatalogueTargetRow,
  type CatalogueTargetTable,
} from './catalogue-import-plan'

// Preserve the pre-#94 comparator as an independent evidence-format oracle.
function previousOrder(table: string, rows: readonly CatalogueTargetRow[]) {
  const fields = CATALOGUE_TARGET_PRIMARY_KEYS[table as CatalogueTargetTable]
  const key = (row: CatalogueTargetRow) => fields
    ? canonicalContent(Object.fromEntries(fields.map((field) => [field, row[field]])))
    : canonicalContent(row)
  return [...rows].sort((left, right) => key(left).localeCompare(key(right)))
}

const cases: { name: string; table: string; rows: CatalogueTargetRow[] }[] = [
  { name: 'scalar keys with locale-sensitive text', table: 'Region', rows: [
    { id: 'z', name: 'first' }, { id: 'Ä', name: 'second' }, { id: 'a', name: 'third' }, { id: 'A', name: 'fourth' },
  ] },
  { name: 'composite keys in canonical object field order', table: 'Lookalike', rows: [
    { taxonId: 'a', regionId: 'z', siblingId: 'b' }, { taxonId: 'z', regionId: 'a', siblingId: 'b' },
    { taxonId: 'a', regionId: 'a', siblingId: 'c' }, { taxonId: 'b', regionId: 'a', siblingId: 'b' },
  ] },
  { name: 'mixed numeric and string composite keys', table: 'CatalogueTaxonomyResolution', rows: [
    { catalogueVersionId: 'a', sourceKey: 20 }, { catalogueVersionId: 'a', sourceKey: 3 },
    { catalogueVersionId: 'b', sourceKey: 1 }, { catalogueVersionId: 'a', sourceKey: 100 },
  ] },
  { name: 'personal-table fallback with nested content', table: 'Identity', rows: [
    { id: 'b', createdAt: new Date('2026-09-11'), nested: { z: 1, a: null } },
    { nested: { a: true, z: [3, 2, 1] }, id: 'a', omitted: undefined },
  ] },
  { name: 'snapshot-table fallback outside the writable key map', table: 'CatalogueHabitatBatch', rows: [
    { catalogueVersionId: 'b', names: ['beta', 'alpha'], record: { z: 1, a: 2 } },
    { record: { a: 2, z: 1 }, names: ['alpha', 'beta'], catalogueVersionId: 'a' },
  ] },
  { name: 'equal keys preserve input order despite differing non-key data', table: 'Taxon', rows: [
    { id: 'same', sciName: 'Z' }, { id: 'same', sciName: 'A' }, { id: 'same', sciName: 'M' },
  ] },
  { name: 'protected projections omitting the primary key remain stable', table: 'Taxon', rows: [
    { sciName: 'Z' }, { sciName: 'A' }, { sciName: 'M' },
  ] },
  { name: 'partially projected composite keys', table: 'Lookalike', rows: [
    { regionId: 'b', note: 'Z' }, { regionId: 'a', note: 'Z' }, { regionId: 'a', note: 'A' },
  ] },
  { name: 'fallback projections with equal canonical content', table: 'Identity', rows: [
    { a: 1, b: 2 }, { b: 2, a: 1 }, { a: 0 },
  ] },
  { name: 'empty input', table: 'Taxon', rows: [] },
  { name: 'single input', table: 'Taxon', rows: [{ id: 'only' }] },
]

describe('catalogue target ordering evidence compatibility', () => {
  it.each(cases)('$name', ({ table, rows }) => {
    const input = Object.freeze(rows.map((row) => Object.freeze(row)))
    const before = canonicalContent(input)
    const expected = previousOrder(table, input)
    const actual = canonicalCatalogueTargetRows(table, input)

    expect(actual).toEqual(expected)
    expected.forEach((row, index) => expect(actual[index]).toBe(row))
    expect(actual).not.toBe(input)
    expect(canonicalContent(input)).toBe(before)
    expect(catalogueTargetRowsFingerprint(table, input)).toBe(contentDigest(expected))
  })
})
