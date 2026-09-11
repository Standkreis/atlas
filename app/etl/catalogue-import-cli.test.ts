import { describe, expect, it, vi } from 'vitest'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { catalogueImportDigest } from './catalogue-import-json'
import {
  catalogueImportCodeState,
  catalogueImportDatabaseTarget,
  parseCatalogueImportExecutionConfig,
  parseCatalogueImportExecutionManifest,
  runCatalogueImportCli,
  type CatalogueImportCliRuntime,
  type CatalogueImportExecutionConfig,
  type CatalogueImportExecutionManifest,
  type CatalogueImportPlanRecord,
} from './catalogue-import-cli'
import type { CatalogueApplyReceipt } from './catalogue-import-store'

const sha = (character: string) => character.repeat(64)
const head = 'a'.repeat(40)
const activationAt = '2026-09-11T12:00:00.000Z'
const file = (path: string, character: string) => ({ path, sha256: sha(character), bytes: 12 })

const config: CatalogueImportExecutionConfig = {
  schemaVersion: 1,
  kind: 'catalogue-import-execution-config',
  expectedCommit: head,
  operationId: 'germany-v7-cutover',
  activationAt,
  frozenBundle: {
    pins: {
      catalogueId: 'catalogue-v7', runKey: 'v7', registryVersionId: 'registry-v1', unionTaxa: 1,
      inputFingerprint: sha('1'), responseFingerprint: sha('2'), unionFingerprint: sha('3'),
      baseAuditFingerprint: sha('4'), contentAuditFingerprint: sha('5'), contentFingerprint: sha('6'), taxonFingerprint: sha('7'),
    },
    base: { audit: file('/frozen/audit.json', '1'), manifest: file('/frozen/manifest.json', '2'), artifact: file('/frozen/artifact.jsonl', '3') },
    gallery: { audit: file('/gallery/audit.json', '4'), manifest: file('/gallery/manifest.json', '5'), artifact: file('/gallery/artifact.jsonl', '6') },
  },
  releaseEvidence: {
    networkReview: file('/release/review.json', '7'), auditUrlReport: file('/release/audit.json', '8'), currentUrlReport: file('/release/current.json', '9'),
  },
  galleryReview: { document: file('/owner/review.json', 'b'), documentFingerprint: sha('c'), evidenceFingerprint: sha('d') },
}

const source = {
  pins: config.frozenBundle.pins,
  tables: new Map(),
  evidence: { files: [], tables: [], decodedFingerprint: sha('1') },
  assertStillValid: vi.fn(),
}
const release = {
  ...source,
  releaseEvidence: [{ role: 'current URL report', path: '/release/current.json', sha256: sha('9'), bytes: 12 }],
  assertReleaseEvidenceStillValid: vi.fn(),
}
const plan = {
  schemaVersion: 1, catalogueVersionId: 'catalogue-v7', registryVersionId: 'registry-v1', sourceEvidence: source.evidence,
  targetSnapshotFingerprint: sha('e'), mappings: { taxonIdBySourceId: new Map(), regionIdBySourceId: new Map(), sourceAssetIdToTargetId: new Map() },
  protectedScopes: [], mutations: [], summary: { mutations: 0 }, fingerprint: sha('f'),
}
const receiptPayload: Omit<CatalogueApplyReceipt, 'fingerprint'> = {
  schemaVersion: 1, operationId: config.operationId, countryCode: 'DE', catalogueVersionId: plan.catalogueVersionId,
  registryVersionId: plan.registryVersionId, sourceEvidence: source.evidence, sourceEvidenceFingerprint: sha('1'),
  targetSnapshotFingerprint: plan.targetSnapshotFingerprint, planFingerprint: plan.fingerprint, createdAt: activationAt,
  protectedScopes: [], mutations: [],
}
const receipt: CatalogueApplyReceipt = { ...receiptPayload, fingerprint: catalogueImportDigest(receiptPayload) }
const receiptDescriptor = {
  path: '/private/receipt.jsonl', sha256: sha('2'), bytes: 100, receiptFingerprint: receipt.fingerprint,
  streamSha256: sha('3'), protectedScopes: 0, mutations: 0,
}
const receiptRecord = { sha256: receiptDescriptor.sha256, bytes: receiptDescriptor.bytes, receiptFingerprint: receiptDescriptor.receiptFingerprint, streamSha256: receiptDescriptor.streamSha256, protectedScopes: 0, mutations: 0 }
const localTarget = { hostname: '127.0.0.1', port: '5434', database: 'dex_check_cutover' }
const planRecord: CatalogueImportPlanRecord = {
  schemaVersion: 1, kind: 'catalogue-import-plan-record', codeHead: head, configDigest: catalogueImportDigest(config),
  target: localTarget, operationId: config.operationId, activationAt, planFingerprint: plan.fingerprint,
  receiptFingerprint: receipt.fingerprint, receiptFile: receiptRecord, summary: { mutations: 0 },
}

function parsed<T>(value: T) {
  return { value, sha256: catalogueImportDigest(value), bytes: 100, contentDigest: catalogueImportDigest(value) }
}

function runtime(overrides: Partial<CatalogueImportCliRuntime> = {}) {
  const events: string[] = []
  const value: CatalogueImportCliRuntime = {
    codeState: vi.fn(async () => ({ head, trackedClean: true, root: '/repo' })),
    connect: vi.fn(async () => ({ db: {} as never, disconnect: vi.fn(async () => undefined) })),
    readJson: vi.fn(async (path: string) => {
      if (path === '/config.json') return parsed(config)
      if (path === '/owner/review.json') return parsed({ schemaVersion: 1 })
      if (path === '/plan-record.json') return parsed(planRecord)
      throw new Error(`unexpected JSON ${path}`)
    }) as CatalogueImportCliRuntime['readJson'],
    validateSource: vi.fn(async () => source as never),
    validateRelease: vi.fn(async () => release as never),
    snapshot: vi.fn(async () => ({ tables: new Map() })),
    review: vi.fn(() => ({ reviewer: 'owner', reviewedAt: activationAt, receiptEvidence: {}, reuseTargetAssetIdBySourceId: new Map(), reviewAsset: vi.fn() })),
    plan: vi.fn(() => plan as never),
    createReceipt: vi.fn(() => receipt),
    writeReceipt: vi.fn(async () => { events.push('receipt'); return receiptDescriptor }),
    readReceipt: vi.fn(async () => ({ receipt, descriptor: receiptDescriptor })),
    writeRecord: vi.fn(async (_path, contents) => {
      events.push((contents as { kind?: string }).kind ?? 'record')
      return { path: _path, sha256: sha('4'), bytes: 100, contentDigest: catalogueImportDigest(contents) }
    }),
    apply: vi.fn(async () => { events.push('apply'); return receipt }),
    recover: vi.fn(async () => { events.push('recover'); return receipt }),
    now: () => new Date(activationAt),
    stdout: vi.fn(),
    ...overrides,
  }
  return { value, events }
}

describe('catalogue import operational CLI', () => {
  it('uses strict configs and distinct read/write execution-manifest contracts', () => {
    expect(parseCatalogueImportExecutionConfig(config)).toEqual(config)
    expect(() => parseCatalogueImportExecutionConfig({ ...config, databaseUrl: 'postgresql://secret' })).toThrow()
    expect(() => parseCatalogueImportExecutionConfig({ ...config, activationAt: 'not-a-timestamp' })).toThrow()
    expect(() => parseCatalogueImportExecutionConfig({ ...config, activationAt: '2026-02-30T12:00:00.000Z' })).toThrow()
    expect(parseCatalogueImportExecutionManifest({
      schemaVersion: 1, kind: 'owner-approved-catalogue-import-execution', action: 'plan', codeHead: head,
      configDigest: catalogueImportDigest(config), target: localTarget,
      approval: { name: 'Owner approval record', link: 'https://example.test/approval', approvedAt: '2026-09-10T12:00:00.000Z' },
    }).action).toBe('plan')
    expect(() => parseCatalogueImportExecutionManifest({
      schemaVersion: 1, kind: 'owner-approved-catalogue-import-execution', action: 'apply', codeHead: head,
      configDigest: catalogueImportDigest(config), target: localTarget,
      approval: { name: 'Owner approval record', link: 'https://example.test/approval', approvedAt: '2026-09-10T12:00:00.000Z' },
    })).toThrow()
    const invalidApproval = { name: 'Owner approval record', link: 'https://example.test/approval', approvedAt: '2026-02-30T12:00:00.000Z' }
    expect(() => parseCatalogueImportExecutionManifest({
      schemaVersion: 1, kind: 'owner-approved-catalogue-import-execution', action: 'plan', codeHead: head,
      configDigest: catalogueImportDigest(config), target: localTarget, approval: invalidApproval,
    })).toThrow()
    expect(() => parseCatalogueImportExecutionManifest({
      schemaVersion: 1, kind: 'owner-approved-catalogue-import-execution', action: 'apply', codeHead: head,
      configDigest: catalogueImportDigest(config), target: localTarget, planRecordDigest: sha('1'),
      planFingerprint: sha('2'), receiptFingerprint: sha('3'), receiptFileSha256: sha('4'), approval: invalidApproval,
    })).toThrow()
  })

  it.each(['plan', 'apply'] as const)('rejects a future %s approval before connecting', async (action) => {
    const remoteTarget = { hostname: 'db.example.test', port: '5432', database: 'dex' }
    const remoteRecord = { ...planRecord, target: remoteTarget }
    const approval = { name: 'Owner approval record', link: 'https://example.test/approval', approvedAt: '2026-09-12T12:00:00.000Z' }
    const executionManifest: CatalogueImportExecutionManifest = action === 'plan' ? {
      schemaVersion: 1, kind: 'owner-approved-catalogue-import-execution', action, codeHead: head,
      configDigest: catalogueImportDigest(config), target: remoteTarget, approval,
    } : {
      schemaVersion: 1, kind: 'owner-approved-catalogue-import-execution', action, codeHead: head,
      configDigest: catalogueImportDigest(config), target: remoteTarget, planRecordDigest: catalogueImportDigest(remoteRecord),
      planFingerprint: plan.fingerprint, receiptFingerprint: receipt.fingerprint, receiptFileSha256: receiptDescriptor.sha256, approval,
    }
    const fake = runtime({
      readJson: vi.fn(async (path: string) => path === '/config.json' ? parsed(config)
        : path === '/plan-record.json' ? parsed(remoteRecord)
          : path === '/manifest.json' ? parsed(executionManifest) : parsed({ schemaVersion: 1 })) as CatalogueImportCliRuntime['readJson'],
    })
    const args = action === 'plan'
      ? ['plan', '--config', '/config.json', '--receipt', '/receipt.jsonl', '--plan-record', '/new-plan-record.json', '--execution-manifest', '/manifest.json']
      : ['apply', '--config', '/config.json', '--receipt', '/receipt.jsonl', '--plan-record', '/plan-record.json', '--release-record', '/release.json', '--execution-manifest', '/manifest.json']

    await expect(runCatalogueImportCli(args, {
      runtime: fake.value, env: { DATABASE_URL: 'postgresql://user:password@db.example.test/dex' },
    })).rejects.toThrow('approval date is in the future')
    expect(fake.value.connect).not.toHaveBeenCalled()
  })

  it('classifies only loopback dex_check databases as disposable and never exposes credentials', () => {
    expect(catalogueImportDatabaseTarget('postgresql://secret:password@127.0.0.1:5434/dex_check_cutover')).toEqual({ target: localTarget, disposableLocal: true })
    expect(catalogueImportDatabaseTarget('postgresql://secret:password@127.0.0.1:5434/dex_check_cutover?sslmode=require&channel_binding=require')).toEqual({ target: localTarget, disposableLocal: true })
    expect(catalogueImportDatabaseTarget('postgresql://secret:password@db.example.test/dex')).toEqual({
      target: { hostname: 'db.example.test', port: '5432', database: 'dex' }, disposableLocal: false,
    })
    expect(() => catalogueImportDatabaseTarget('not a URL')).toThrow('DATABASE_URL')
  })

  it('requires DATABASE_URL from the explicit process environment and allows code-pin without it', async () => {
    const fake = runtime()
    await expect(runCatalogueImportCli(['plan', '--config', '/config.json', '--receipt', '/receipt.jsonl', '--plan-record', '/plan-record.json'], { runtime: fake.value, env: {} }))
      .rejects.toThrow('explicitly configured DATABASE_URL')
    await runCatalogueImportCli(['code-pin'], { runtime: fake.value, env: {} })
    expect(fake.value.codeState).toHaveBeenLastCalledWith()
  })

  it.each([
    'postgresql://dex:dex@127.0.0.1:5434/dex_check_cutover?host=remote.example.test',
    'postgresql://dex:dex@127.0.0.1:5434/dex_check_cutover?hostaddr=203.0.113.1',
    'postgresql://dex:dex@127.0.0.1:5434/dex_check_cutover?port=6543',
    'postgresql://dex:dex@127.0.0.1:5434/dex_check_cutover?database=production',
    'postgresql://dex:dex@127.0.0.1:5434/dex_check_cutover?dbname=production',
    'postgresql://dex:dex@127.0.0.1:5434/dex_check_cutover?options=-csearch_path%3Dpublic',
    'postgresql://dex:dex@127.0.0.1:5434/dex_check_cutover?user=other',
    'postgresql://dex:dex@127.0.0.1:5434/dex_check_cutover?password=other',
  ])('rejects connection-routing query overrides before connecting: %s', async (databaseUrl) => {
    const fake = runtime()
    await expect(runCatalogueImportCli(
      ['plan', '--config', '/config.json', '--receipt', '/receipt.jsonl', '--plan-record', '/plan-record.json'],
      { runtime: fake.value, env: { DATABASE_URL: databaseUrl } },
    )).rejects.toThrow('unsupported, duplicate, or empty connection parameter')
    expect(fake.value.connect).not.toHaveBeenCalled()
  })

  it('derives the default code pin from the executable checkout and rejects another module path', async () => {
    const state = await catalogueImportCodeState()
    expect(state.head).toMatch(/^[a-f\d]{40}$/)
    expect(state.root).toBe(resolve(dirname(fileURLToPath(import.meta.url)), '../..'))
    await expect(catalogueImportCodeState(pathToFileURL(resolve(state.root, 'app/etl/catalogue-import-cli.test.ts')).href))
      .rejects.toThrow('executable does not match')
  })

  it('plans read-only, then durably writes the receipt before its reviewed plan record', async () => {
    const fake = runtime()
    const result = await runCatalogueImportCli(
      ['plan', '--config', '/config.json', '--receipt', '/receipt.jsonl', '--plan-record', '/new-plan-record.json'],
      { runtime: fake.value, env: { DATABASE_URL: 'postgresql://dex:dex@127.0.0.1:5434/dex_check_cutover' } },
    ) as { planRecord: CatalogueImportPlanRecord }
    expect(fake.events).toEqual(['receipt', 'catalogue-import-plan-record'])
    expect(result.planRecord).toMatchObject({ configDigest: catalogueImportDigest(config), target: localTarget, activationAt })
    expect(fake.value.plan).toHaveBeenCalledWith(expect.objectContaining({ activationAt }))
  })

  it('regenerates the approved local plan and fsyncs release evidence before applying', async () => {
    const fake = runtime()
    await runCatalogueImportCli(
      ['apply', '--config', '/config.json', '--receipt', '/receipt.jsonl', '--plan-record', '/plan-record.json', '--release-record', '/release.json'],
      { runtime: fake.value, env: { DATABASE_URL: 'postgresql://dex:dex@127.0.0.1:5434/dex_check_cutover' } },
    )
    expect(fake.events).toEqual(['catalogue-import-release-intent', 'apply'])
    expect(release.assertReleaseEvidenceStillValid).toHaveBeenCalled()
    expect(fake.value.createReceipt).toHaveBeenCalledWith(expect.objectContaining({
      operationId: config.operationId, createdAt: activationAt,
    }))
  })

  it('rejects a non-disposable target without a separately bound owner execution manifest before connecting', async () => {
    const remoteRecord = { ...planRecord, target: { hostname: 'db.example.test', port: '5432', database: 'dex' } }
    const fake = runtime({
      readJson: vi.fn(async (path: string) => path === '/config.json' ? parsed(config) : path === '/plan-record.json' ? parsed(remoteRecord) : parsed({ schemaVersion: 1 })) as CatalogueImportCliRuntime['readJson'],
    })
    await expect(runCatalogueImportCli(
      ['recover', '--config', '/config.json', '--receipt', '/receipt.jsonl', '--plan-record', '/plan-record.json'],
      { runtime: fake.value, env: { DATABASE_URL: 'postgresql://user:password@db.example.test/dex' } },
    )).rejects.toThrow('operator must independently verify its human approval')
    expect(fake.value.connect).not.toHaveBeenCalled()
  })

  it('accepts an exact recovery manifest and passes the streamed, pinned receipt to guarded recovery', async () => {
    const remoteTarget = { hostname: 'db.example.test', port: '5432', database: 'dex' }
    const remoteRecord = { ...planRecord, target: remoteTarget }
    const manifest: CatalogueImportExecutionManifest = {
      schemaVersion: 1, kind: 'owner-approved-catalogue-import-execution', action: 'recover', codeHead: head,
      configDigest: catalogueImportDigest(config), target: remoteTarget, planRecordDigest: catalogueImportDigest(remoteRecord),
      planFingerprint: plan.fingerprint, receiptFingerprint: receipt.fingerprint, receiptFileSha256: receiptDescriptor.sha256,
      approval: { name: 'Owner approval record', link: 'https://example.test/approval', approvedAt: '2026-09-10T12:00:00.000Z' },
    }
    const fake = runtime({
      readJson: vi.fn(async (path: string) => path === '/config.json' ? parsed(config) : path === '/plan-record.json' ? parsed(remoteRecord) : path === '/manifest.json' ? parsed(manifest) : parsed({ schemaVersion: 1 })) as CatalogueImportCliRuntime['readJson'],
    })
    await runCatalogueImportCli(
      ['recover', '--config', '/config.json', '--receipt', '/receipt.jsonl', '--plan-record', '/plan-record.json', '--execution-manifest', '/manifest.json'],
      { runtime: fake.value, env: { DATABASE_URL: 'postgresql://user:password@db.example.test/dex' } },
    )
    expect(fake.events).toEqual(['recover'])
    expect(fake.value.recover).toHaveBeenCalledWith(expect.anything(), { receipt })
  })
})
