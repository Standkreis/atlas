import germanyRegistryJson from './germany-regions.json'

/** SHA-256 of the exact checked-in bytes of germany-regions.json. */
export const GERMANY_REGISTRY_SHA256 = '5f118de7d4a2bf97f5bb8ecf11232ed02a2a26aa6e0739ff5cdaa7efbe7cbe18'

export type RegistrySourceRole = 'regions' | 'kreisUnits'

export type RegistrySource = {
  id: string
  role: RegistrySourceRole
  authority: string
  product: string
  layer: string
  topicDate: string
  archiveUrl: string
  downloadedOn: string
  archiveSha256: string
  productUrl: string
  licence: {
    id: string
    name: string
    url: string
  }
  attribution: string
  dataSourcesUrl: string
  changeNotice: string
}

export type KreisUnit = {
  key: string
  ags: string
  name: string
  type: string
}

export type RegistryRegion = {
  key: string
  sourceKey: string
  displayName: string
  sourceName: string
  stateCode: string
  stateName: string
  aliases: string[]
  kreisUnits: KreisUnit[]
}

export type RegionRegistry = {
  schemaVersion: 1
  registry: {
    key: string
    countryCode: 'DE'
    topicDate: string
    counts: {
      regions: number
      kreisUnits: number
      states: number
      singletonRegions: number
      twoUnitRegions: number
      threeUnitRegions: number
    }
    sources: RegistrySource[]
  }
  regions: RegistryRegion[]
}

export type RegistryValidationIssue = {
  path: string
  message: string
}

export class RegionRegistryValidationError extends Error {
  readonly issues: RegistryValidationIssue[]

  constructor(issues: RegistryValidationIssue[]) {
    super(`Invalid region registry:\n${issues.map(({ path, message }) => `- ${path}: ${message}`).join('\n')}`)
    this.name = 'RegionRegistryValidationError'
    this.issues = issues
  }
}

type JsonRecord = Record<string, unknown>

const REGION_KEY = /^de-krg-(\d{8})$/
const KREIS_KEY = /^de-krs-(\d{5})$/
const STATE_CODE = /^\d{2}$/
const SHA256 = /^[0-9a-f]{64}$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const HTTPS_URL = /^https:\/\/[^\s]+$/
const BKG_AUTHORITY = 'Bundesamt für Kartographie und Geodäsie (BKG)'
const LICENCE = {
  id: 'dl-de/by-2-0',
  name: 'Datenlizenz Deutschland – Namensnennung 2.0',
  url: 'https://www.govdata.de/dl-de/by-2-0',
} as const

function record(
  value: unknown,
  path: string,
  keys: readonly string[],
  issues: RegistryValidationIssue[],
): JsonRecord | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    issues.push({ path, message: 'expected an object' })
    return undefined
  }
  const result = value as JsonRecord
  for (const key of keys) {
    if (!Object.hasOwn(result, key)) issues.push({ path: `${path}.${key}`, message: 'missing field' })
  }
  for (const key of Object.keys(result)) {
    if (!keys.includes(key)) issues.push({ path: `${path}.${key}`, message: 'unknown field' })
  }
  return result
}

function string(
  value: unknown,
  path: string,
  issues: RegistryValidationIssue[],
  pattern?: RegExp,
): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    issues.push({ path, message: 'expected a non-empty, trimmed string' })
    return undefined
  }
  if (pattern && !pattern.test(value)) {
    issues.push({ path, message: `invalid value ${JSON.stringify(value)}` })
    return undefined
  }
  return value
}

function integer(value: unknown, path: string, issues: RegistryValidationIssue[]): number | undefined {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    issues.push({ path, message: 'expected a non-negative safe integer' })
    return undefined
  }
  return value as number
}

function date(value: unknown, path: string, issues: RegistryValidationIssue[]): string | undefined {
  const valid = string(value, path, issues, ISO_DATE)
  if (!valid) return undefined
  const parsed = new Date(`${valid}T00:00:00.000Z`)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== valid) {
    issues.push({ path, message: `invalid calendar date ${JSON.stringify(valid)}` })
    return undefined
  }
  return valid
}

function literal(value: unknown, expected: unknown, path: string, issues: RegistryValidationIssue[]): void {
  if (value !== expected) issues.push({ path, message: `expected ${JSON.stringify(expected)}` })
}

function sortedUnique(values: string[], path: string, issues: RegistryValidationIssue[]): void {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1] >= values[index]) {
      issues.push({ path, message: 'must be strictly sorted with no duplicates' })
      return
    }
  }
}

function validateSource(value: unknown, index: number, issues: RegistryValidationIssue[]): RegistrySourceRole | undefined {
  const path = `$.registry.sources[${index}]`
  const source = record(value, path, [
    'id', 'role', 'authority', 'product', 'layer', 'topicDate', 'archiveUrl', 'downloadedOn',
    'archiveSha256', 'productUrl', 'licence', 'attribution', 'dataSourcesUrl', 'changeNotice',
  ], issues)
  if (!source) return undefined

  string(source.id, `${path}.id`, issues)
  const role = string(source.role, `${path}.role`, issues)
  if (role !== undefined && role !== 'regions' && role !== 'kreisUnits') {
    issues.push({ path: `${path}.role`, message: 'expected "regions" or "kreisUnits"' })
  }
  literal(source.authority, BKG_AUTHORITY, `${path}.authority`, issues)
  string(source.product, `${path}.product`, issues)
  string(source.layer, `${path}.layer`, issues)
  date(source.topicDate, `${path}.topicDate`, issues)
  string(source.archiveUrl, `${path}.archiveUrl`, issues, HTTPS_URL)
  date(source.downloadedOn, `${path}.downloadedOn`, issues)
  string(source.archiveSha256, `${path}.archiveSha256`, issues, SHA256)
  string(source.productUrl, `${path}.productUrl`, issues, HTTPS_URL)
  string(source.attribution, `${path}.attribution`, issues)
  string(source.dataSourcesUrl, `${path}.dataSourcesUrl`, issues, HTTPS_URL)
  string(source.changeNotice, `${path}.changeNotice`, issues)

  const licence = record(source.licence, `${path}.licence`, ['id', 'name', 'url'], issues)
  if (licence) {
    literal(licence.id, LICENCE.id, `${path}.licence.id`, issues)
    literal(licence.name, LICENCE.name, `${path}.licence.name`, issues)
    literal(licence.url, LICENCE.url, `${path}.licence.url`, issues)
  }

  if (role === 'regions') {
    literal(source.product, 'GE250', `${path}.product`, issues)
    literal(source.layer, 'KRG250', `${path}.layer`, issues)
  } else if (role === 'kreisUnits') {
    literal(source.product, 'VG250', `${path}.product`, issues)
    literal(source.layer, 'vg250_krs (GF = 4)', `${path}.layer`, issues)
  }
  return role === 'regions' || role === 'kreisUnits' ? role : undefined
}

function validateKreisUnit(
  value: unknown,
  path: string,
  stateCode: string | undefined,
  issues: RegistryValidationIssue[],
): { key?: string; ags?: string; name?: string } {
  const unit = record(value, path, ['key', 'ags', 'name', 'type'], issues)
  if (!unit) return {}
  const key = string(unit.key, `${path}.key`, issues, KREIS_KEY)
  const ags = string(unit.ags, `${path}.ags`, issues, /^\d{5}$/)
  const name = string(unit.name, `${path}.name`, issues)
  string(unit.type, `${path}.type`, issues)
  if (key && ags && key !== `de-krs-${ags}`) {
    issues.push({ path: `${path}.key`, message: `must be de-krs-${ags}` })
  }
  if (ags && stateCode && !ags.startsWith(stateCode)) {
    issues.push({ path: `${path}.ags`, message: `does not belong to Land ${stateCode}` })
  }
  return { key, ags, name }
}

function validateRegion(
  value: unknown,
  index: number,
  issues: RegistryValidationIssue[],
): { key?: string; sourceKey?: string; stateCode?: string; stateName?: string; unitKeys: string[] } {
  const path = `$.regions[${index}]`
  const region = record(value, path, [
    'key', 'sourceKey', 'displayName', 'sourceName', 'stateCode', 'stateName', 'aliases', 'kreisUnits',
  ], issues)
  if (!region) return { unitKeys: [] }
  const key = string(region.key, `${path}.key`, issues, REGION_KEY)
  const sourceKey = string(region.sourceKey, `${path}.sourceKey`, issues, /^\d{8}$/)
  const displayName = string(region.displayName, `${path}.displayName`, issues)
  const sourceName = string(region.sourceName, `${path}.sourceName`, issues)
  const stateCode = string(region.stateCode, `${path}.stateCode`, issues, STATE_CODE)
  const stateName = string(region.stateName, `${path}.stateName`, issues)
  if (displayName && /\s{2,}/.test(displayName)) {
    issues.push({ path: `${path}.displayName`, message: 'must not contain repeated whitespace' })
  }
  if (key && sourceKey && key !== `de-krg-${sourceKey}`) {
    issues.push({ path: `${path}.key`, message: `must be de-krg-${sourceKey}` })
  }

  const aliases: string[] = []
  if (!Array.isArray(region.aliases) || region.aliases.length === 0) {
    issues.push({ path: `${path}.aliases`, message: 'expected a non-empty array' })
  } else {
    region.aliases.forEach((alias, aliasIndex) => {
      const valid = string(alias, `${path}.aliases[${aliasIndex}]`, issues)
      if (valid) aliases.push(valid)
    })
    sortedUnique(aliases, `${path}.aliases`, issues)
  }

  const unitKeys: string[] = []
  const unitNames: string[] = []
  if (!Array.isArray(region.kreisUnits) || region.kreisUnits.length === 0) {
    issues.push({ path: `${path}.kreisUnits`, message: 'expected a non-empty array' })
  } else {
    region.kreisUnits.forEach((unit, unitIndex) => {
      const validated = validateKreisUnit(unit, `${path}.kreisUnits[${unitIndex}]`, stateCode, issues)
      if (validated.key) unitKeys.push(validated.key)
      if (validated.name) unitNames.push(validated.name)
    })
    sortedUnique(unitKeys, `${path}.kreisUnits`, issues)
  }

  for (const requiredAlias of [displayName, sourceName, stateName, ...unitNames]) {
    if (requiredAlias && !aliases.includes(requiredAlias)) {
      issues.push({ path: `${path}.aliases`, message: `missing required alias ${JSON.stringify(requiredAlias)}` })
    }
  }
  return { key, sourceKey, stateCode, stateName, unitKeys }
}

/**
 * Validate an importer-produced value without reading files or touching external state.
 * The checks cover the complete JSON shape plus identity, hierarchy, counts and ordering.
 */
export function validateRegionRegistry(input: unknown): RegistryValidationIssue[] {
  const issues: RegistryValidationIssue[] = []
  const root = record(input, '$', ['schemaVersion', 'registry', 'regions'], issues)
  if (!root) return issues
  literal(root.schemaVersion, 1, '$.schemaVersion', issues)

  const metadata = record(root.registry, '$.registry', ['key', 'countryCode', 'topicDate', 'counts', 'sources'], issues)
  let topicDate: string | undefined
  let counts: JsonRecord | undefined
  if (metadata) {
    const registryKey = string(metadata.key, '$.registry.key', issues, /^de-krg-\d{4}-\d{2}-\d{2}$/)
    literal(metadata.countryCode, 'DE', '$.registry.countryCode', issues)
    topicDate = date(metadata.topicDate, '$.registry.topicDate', issues)
    if (registryKey && topicDate && registryKey !== `de-krg-${topicDate}`) {
      issues.push({ path: '$.registry.key', message: `must end with topic date ${topicDate}` })
    }
    counts = record(metadata.counts, '$.registry.counts', [
      'regions', 'kreisUnits', 'states', 'singletonRegions', 'twoUnitRegions', 'threeUnitRegions',
    ], issues)
    if (counts) {
      for (const name of ['regions', 'kreisUnits', 'states', 'singletonRegions', 'twoUnitRegions', 'threeUnitRegions']) {
        integer(counts[name], `$.registry.counts.${name}`, issues)
      }
    }

    if (!Array.isArray(metadata.sources)) {
      issues.push({ path: '$.registry.sources', message: 'expected an array' })
    } else {
      const ids: string[] = []
      const roles: RegistrySourceRole[] = []
      metadata.sources.forEach((source, index) => {
        const sourceRecord = typeof source === 'object' && source !== null && !Array.isArray(source) ? source as JsonRecord : undefined
        if (typeof sourceRecord?.id === 'string') ids.push(sourceRecord.id)
        const role = validateSource(source, index, issues)
        if (role) roles.push(role)
        if (sourceRecord?.topicDate !== topicDate) {
          issues.push({ path: `$.registry.sources[${index}].topicDate`, message: 'must match registry topicDate' })
        }
      })
      sortedUnique(ids, '$.registry.sources', issues)
      for (const role of ['regions', 'kreisUnits'] as const) {
        if (roles.filter((candidate) => candidate === role).length !== 1) {
          issues.push({ path: '$.registry.sources', message: `expected exactly one ${role} source` })
        }
      }
    }
  }

  if (!Array.isArray(root.regions)) {
    issues.push({ path: '$.regions', message: 'expected an array' })
    return issues
  }

  const regionKeys: string[] = []
  const sourceKeys: string[] = []
  const unitKeys: string[] = []
  const states = new Map<string, string>()
  const sizes = new Map<number, number>()
  root.regions.forEach((region, index) => {
    const validated = validateRegion(region, index, issues)
    if (validated.key) regionKeys.push(validated.key)
    if (validated.sourceKey) sourceKeys.push(validated.sourceKey)
    unitKeys.push(...validated.unitKeys)
    if (validated.stateCode && validated.stateName) {
      const existing = states.get(validated.stateCode)
      if (existing && existing !== validated.stateName) {
        issues.push({ path: `$.regions[${index}].stateName`, message: `Land ${validated.stateCode} is already named ${JSON.stringify(existing)}` })
      }
      states.set(validated.stateCode, validated.stateName)
    }
    if (typeof region === 'object' && region !== null && !Array.isArray(region)) {
      const units = (region as JsonRecord).kreisUnits
      if (Array.isArray(units)) sizes.set(units.length, (sizes.get(units.length) ?? 0) + 1)
    }
  })
  sortedUnique(regionKeys, '$.regions', issues)
  if (new Set(sourceKeys).size !== sourceKeys.length) issues.push({ path: '$.regions', message: 'duplicate region sourceKey' })
  if (new Set(unitKeys).size !== unitKeys.length) issues.push({ path: '$.regions', message: 'a Kreis unit belongs to more than one region' })

  const expectedCounts: Record<string, number> = {
    regions: root.regions.length,
    kreisUnits: unitKeys.length,
    states: states.size,
    singletonRegions: sizes.get(1) ?? 0,
    twoUnitRegions: sizes.get(2) ?? 0,
    threeUnitRegions: sizes.get(3) ?? 0,
  }
  if (counts) {
    for (const [name, actual] of Object.entries(expectedCounts)) {
      if (counts[name] !== actual) {
        issues.push({ path: `$.registry.counts.${name}`, message: `declares ${JSON.stringify(counts[name])}, computed ${actual}` })
      }
    }
  }
  const representedSizes = [...sizes.keys()].filter((size) => size !== 1 && size !== 2 && size !== 3)
  if (representedSizes.length > 0) {
    issues.push({ path: '$.regions', message: `unsupported Kreis-unit counts: ${representedSizes.sort((a, b) => a - b).join(', ')}` })
  }
  return issues
}

export function parseRegionRegistry(input: unknown): RegionRegistry {
  const issues = validateRegionRegistry(input)
  if (issues.length > 0) throw new RegionRegistryValidationError(issues)
  return input as RegionRegistry
}

/** Load the source-controlled German snapshot. Importers can inject drafts into parseRegionRegistry. */
export function loadGermanyRegistry(): RegionRegistry {
  return parseRegionRegistry(germanyRegistryJson)
}
