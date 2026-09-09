/** Filtered companion to the #19 catalogue artifact. Never contains sounds or personal media. */
import { createHash } from 'node:crypto'
import { writeTransferJsonl, type TransferExport, type TransferSpec } from './catalogue-transfer'
import type { ContentAuditReport, ContentAuditSnapshot } from './catalogue-content-audit'
import { GALLERY_VERSION } from './gallery-work'
import { NAMES_VERSION } from './names-work'

export const CONTENT_WORK_VERSIONS = { names: NAMES_VERSION, gallery: GALLERY_VERSION } as const
export const ASSET_TRANSFER_COLUMNS = ['id', 'kind', 'url', 'author', 'licence', 'licenceUrl', 'sourceUrl', 'origin', 'caption', 'meta', 'position', 'createdAt', 'taxonId', 'sightingId', 'ownerId', 'byteSize']
export const WORK_TRANSFER_COLUMNS = ['taxonId', 'kind', 'version', 'status', 'attempts', 'leaseOwner', 'leaseExpiresAt', 'startedAt', 'completedAt', 'error', 'resultSummary', 'sourceFingerprint', 'createdAt', 'updatedAt']

export function canonicalContent(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return item
    if (typeof item === 'number' && Number.isFinite(item)) return item
    if (item instanceof Date) return item.toISOString()
    if (Array.isArray(item)) return item.map(normalize)
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item)
      .filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, normalize(v)]))
    throw new Error('content evidence contains an unsupported JSON value')
  }
  return JSON.stringify(normalize(value))
}
export const contentDigest = (value: unknown) => createHash('sha256').update(canonicalContent(value)).digest('hex')
const byId = <T extends { id: string }>(rows: readonly T[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id))
export const relevantWork = (row: { kind: string; version: string }) => Object.entries(CONTENT_WORK_VERSIONS).some(([kind, version]) => row.kind === kind && row.version === version)
export const qualifiedReference = (row: { kind: string; origin: string; ownerId: string | null; sightingId: string | null; avatarOf?: boolean }) =>
  row.kind === 'image' && ['inat', 'commons'].includes(row.origin) && row.ownerId === null && row.sightingId === null && row.avatarOf === false

/** Includes complete Taxon rows so a freshly regenerated base artifact can be checked against it. */
export function contentSnapshotDigests(snapshot: ContentAuditSnapshot) {
  const taxa = byId(snapshot.taxa)
  const assets = byId(snapshot.assets)
  const work = [...snapshot.work].sort((a, b) => `${a.taxonId}|${a.kind}|${a.version}`.localeCompare(`${b.taxonId}|${b.kind}|${b.version}`))
  return { taxonFingerprint: contentDigest(taxa), contentFingerprint: contentDigest({ catalogue: snapshot.catalogue, taxa, assets, work }) }
}

/** Snapshot rows were loaded under one read transaction. Slicing keeps serialization bounded. */
export async function writeGalleryArtifact(options: { snapshot: ContentAuditSnapshot; audit: ContentAuditReport; path: string }): Promise<TransferExport> {
  const { snapshot, audit } = options
  if (audit.verdict !== 'ready-for-transfer' || contentSnapshotDigests(snapshot).contentFingerprint !== audit.contentFingerprint) throw new Error('gallery transfer requires an eligible audit of the unchanged content snapshot')
  const taxonIds = new Set(snapshot.taxa.map((taxon) => taxon.id))
  if (snapshot.assets.some((asset) => !taxonIds.has(asset.taxonId) || !qualifiedReference(asset))) throw new Error('gallery transfer contains an unqualified or out-of-union asset')
  const assets = byId(snapshot.assets).map((asset) => Object.fromEntries(Object.entries(asset).filter(([key]) => key !== 'avatarOf')))
  const work = snapshot.work.filter((row) => taxonIds.has(row.taxonId) && relevantWork(row) && row.status === 'complete')
    .sort((a, b) => `${a.taxonId}|${a.kind}|${a.version}`.localeCompare(`${b.taxonId}|${b.kind}|${b.version}`))
  const specs: TransferSpec[] = [
    { table: 'Asset', columns: ASSET_TRANSFER_COLUMNS, sql: 'reviewed in-memory snapshot' },
    { table: 'TaxonEnrichmentWork', columns: WORK_TRANSFER_COLUMNS, sql: 'reviewed in-memory snapshot' },
  ]
  return writeTransferJsonl({ catalogueId: snapshot.catalogue.id, path: options.path, specs,
    fetchPage: async (spec, limit, offset) => (spec.table === 'Asset' ? assets : work).slice(offset, offset + limit),
  })
}
