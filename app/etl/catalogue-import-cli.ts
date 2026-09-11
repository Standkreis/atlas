/** Explicit, file-backed operator CLI for the checked Germany catalogue cutover. */
import { createHash } from 'node:crypto'
import { execFile as execFileCallback } from 'node:child_process'
import { readFile, realpath } from 'node:fs/promises'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'
import { z } from 'zod'
import { PrismaClient } from '../src/generated/prisma/client'
import { catalogueImportDigest } from './catalogue-import-json'
import { planCatalogueTarget } from './catalogue-import-relational-plan'
import { targetGalleryReviewFromDocument, type ReviewedTargetGalleryDocument } from './catalogue-import-review'
import {
  readCatalogueReceiptFile,
  writeCanonicalExclusiveFile,
  writeCatalogueReceiptFile,
  type CatalogueReceiptFileDescriptor,
} from './catalogue-import-receipt-file'
import {
  applyCatalogueTargetPlan,
  createCatalogueApplyReceipt,
  recoverCatalogueTarget,
  snapshotCatalogueTarget,
} from './catalogue-import-store'
import {
  validateCatalogueImportBundle,
  validateCatalogueReleaseEvidence,
  type CatalogueImportBundleInput,
  type CatalogueReleaseEvidenceInput,
  type ImportEvidenceFile,
} from './catalogue-import-validation'

const execFile = promisify(execFileCallback)
const SHA256 = /^[a-f\d]{64}$/
const COMMIT = /^[a-f\d]{40}$/
const UTC_MILLIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const MAX_OPERATOR_JSON_BYTES = 32 * 1024 * 1024

const shaSchema = z.string().regex(SHA256)
const textSchema = z.string().trim().min(1)
const utcMillisSchema = z.string().regex(UTC_MILLIS).refine((value) => {
  const timestamp = new Date(value)
  return Number.isFinite(timestamp.getTime()) && timestamp.toISOString() === value
}, 'must be a real UTC timestamp with millisecond precision')
const fileSchema = z.strictObject({ path: textSchema, sha256: shaSchema, bytes: z.number().int().nonnegative().optional() })
const bundleSchema = z.strictObject({ audit: fileSchema, manifest: fileSchema, artifact: fileSchema })
const pinsSchema = z.strictObject({
  catalogueId: textSchema, runKey: textSchema, registryVersionId: textSchema, unionTaxa: z.number().int().nonnegative(),
  inputFingerprint: shaSchema, responseFingerprint: shaSchema, unionFingerprint: shaSchema,
  baseAuditFingerprint: shaSchema, contentAuditFingerprint: shaSchema, contentFingerprint: shaSchema, taxonFingerprint: shaSchema,
})
const importBundleSchema = z.strictObject({
  pins: pinsSchema, base: bundleSchema, gallery: bundleSchema,
  maxLineBytes: z.number().int().min(1024).max(16 * 1024 * 1024).optional(),
})
const releaseEvidenceSchema = z.strictObject({ networkReview: fileSchema, auditUrlReport: fileSchema, currentUrlReport: fileSchema })
const configSchema = z.strictObject({
  schemaVersion: z.literal(1), kind: z.literal('catalogue-import-execution-config'), expectedCommit: z.string().regex(COMMIT),
  operationId: textSchema, activationAt: utcMillisSchema, frozenBundle: importBundleSchema,
  releaseEvidence: releaseEvidenceSchema,
  galleryReview: z.strictObject({ document: fileSchema, documentFingerprint: shaSchema, evidenceFingerprint: shaSchema }),
})
const targetSchema = z.strictObject({ hostname: textSchema, port: textSchema, database: textSchema })
const receiptDescriptorSchema = z.strictObject({ sha256: shaSchema, bytes: z.number().int().nonnegative(), receiptFingerprint: shaSchema, streamSha256: shaSchema, protectedScopes: z.number().int().nonnegative(), mutations: z.number().int().nonnegative() })
const planRecordSchema = z.strictObject({
  schemaVersion: z.literal(1), kind: z.literal('catalogue-import-plan-record'), codeHead: z.string().regex(COMMIT),
  configDigest: shaSchema, target: targetSchema, operationId: textSchema, activationAt: utcMillisSchema,
  planFingerprint: shaSchema, receiptFingerprint: shaSchema, receiptFile: receiptDescriptorSchema,
  summary: z.record(z.string(), z.number().int().nonnegative()),
})
const executionManifestBase = {
  schemaVersion: z.literal(1), kind: z.literal('owner-approved-catalogue-import-execution'),
  codeHead: z.string().regex(COMMIT), configDigest: shaSchema, target: targetSchema,
  approval: z.strictObject({ name: textSchema, link: z.url(), approvedAt: utcMillisSchema }),
} as const
const executionManifestSchema = z.discriminatedUnion('action', [
  z.strictObject({ ...executionManifestBase, action: z.literal('plan') }),
  z.strictObject({ ...executionManifestBase, action: z.enum(['apply', 'recover']), planRecordDigest: shaSchema, planFingerprint: shaSchema, receiptFingerprint: shaSchema, receiptFileSha256: shaSchema }),
])

export type CatalogueImportExecutionConfig = z.infer<typeof configSchema>
export type CatalogueImportPlanRecord = z.infer<typeof planRecordSchema>
export type CatalogueImportExecutionManifest = z.infer<typeof executionManifestSchema>
export type CatalogueImportTarget = z.infer<typeof targetSchema>

export const parseCatalogueImportExecutionConfig = (value: unknown) => configSchema.parse(value)
export const parseCatalogueImportPlanRecord = (value: unknown) => planRecordSchema.parse(value)
export const parseCatalogueImportExecutionManifest = (value: unknown) => executionManifestSchema.parse(value)

type Database = PrismaClient
export type CatalogueImportCodeState = Readonly<{ head: string; trackedClean: boolean; root: string }>
type ParsedJson<T> = Readonly<{ value: T; sha256: string; bytes: number; contentDigest: string }>

export type CatalogueImportCliRuntime = Readonly<{
  codeState(): Promise<CatalogueImportCodeState>
  connect(connectionString: string): Promise<{ db: Database; disconnect(): Promise<void> }>
  readJson<T>(path: string, schema: z.ZodType<T>, expected?: ImportEvidenceFile): Promise<ParsedJson<T>>
  validateSource(input: CatalogueImportBundleInput): ReturnType<typeof validateCatalogueImportBundle>
  validateRelease: typeof validateCatalogueReleaseEvidence
  snapshot: typeof snapshotCatalogueTarget
  review: typeof targetGalleryReviewFromDocument
  plan: typeof planCatalogueTarget
  createReceipt: typeof createCatalogueApplyReceipt
  writeReceipt: typeof writeCatalogueReceiptFile
  readReceipt: typeof readCatalogueReceiptFile
  writeRecord: typeof writeCanonicalExclusiveFile
  apply: typeof applyCatalogueTargetPlan
  recover: typeof recoverCatalogueTarget
  now(): Date
  stdout(message: string): void
}>

export function catalogueImportDatabaseTarget(connectionString: string): { target: CatalogueImportTarget; disposableLocal: boolean } {
  let url: URL
  try { url = new URL(connectionString) } catch { throw new Error('DATABASE_URL is not a valid PostgreSQL URL') }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.startsWith('/')) {
    throw new Error('DATABASE_URL is not a valid PostgreSQL URL')
  }
  if (url.hash) throw new Error('DATABASE_URL fragments are not allowed')
  const queryNames = new Set<string>()
  for (const [name, value] of url.searchParams) {
    if (!['sslmode', 'channel_binding'].includes(name) || queryNames.has(name) || !value) {
      throw new Error('DATABASE_URL contains an unsupported, duplicate, or empty connection parameter')
    }
    queryNames.add(name)
    if (name === 'sslmode' && !['disable', 'prefer', 'require', 'verify-ca', 'verify-full', 'no-verify'].includes(value)) {
      throw new Error('DATABASE_URL sslmode is invalid')
    }
    if (name === 'channel_binding' && !['disable', 'prefer', 'require'].includes(value)) {
      throw new Error('DATABASE_URL channel_binding is invalid')
    }
  }
  let database: string
  try { database = decodeURIComponent(url.pathname.slice(1)) } catch { throw new Error('DATABASE_URL database name is invalid') }
  if (!database || database.includes('/')) throw new Error('DATABASE_URL database name is invalid')
  const hostname = url.hostname.toLowerCase()
  const target = { hostname, port: url.port || '5432', database }
  const disposableLocal = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname) && /^dex_check_[a-z0-9_]+$/.test(database)
  return { target, disposableLocal }
}

/** Resolve code identity from this executable module, never from an operator-selected cwd. */
export async function catalogueImportCodeState(moduleUrl = import.meta.url): Promise<CatalogueImportCodeState> {
  let modulePath: string
  try { modulePath = await realpath(fileURLToPath(moduleUrl)) } catch { throw new Error('catalogue import executable is not a real local file') }
  const root = await realpath((await execFile('git', ['rev-parse', '--show-toplevel'], { cwd: dirname(modulePath) })).stdout.trim())
  const expectedModule = await realpath(resolve(root, 'app/etl/catalogue-import-cli.ts')).catch(() => '')
  if (expectedModule !== modulePath) throw new Error('catalogue import executable does not match app/etl/catalogue-import-cli.ts in its Git checkout')
  const head = (await execFile('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim().toLowerCase()
  if (!COMMIT.test(head)) throw new Error('Git HEAD is not a full SHA-1 commit')
  const status = (await execFile('git', ['status', '--porcelain=v1', '--untracked-files=no'], { cwd: root })).stdout
  return Object.freeze({ head, trackedClean: status.length === 0, root })
}

async function defaultReadJson<T>(path: string, schema: z.ZodType<T>, expected?: ImportEvidenceFile): Promise<ParsedJson<T>> {
  const absolute = resolve(path)
  const bytes = await readFile(absolute)
  if (bytes.length > MAX_OPERATOR_JSON_BYTES) throw new Error('operator JSON exceeds the 32 MiB size limit')
  const evidence = { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }
  if (expected && (resolve(expected.path) !== absolute || expected.sha256 !== evidence.sha256 || (expected.bytes !== undefined && expected.bytes !== evidence.bytes))) {
    throw new Error('operator JSON does not match its exact file descriptor')
  }
  let decoded: unknown
  try { decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) } catch { throw new Error('operator JSON is invalid') }
  const value = schema.parse(decoded)
  return Object.freeze({ value, ...evidence, contentDigest: catalogueImportDigest(value) })
}

const defaultRuntime: CatalogueImportCliRuntime = {
  codeState: catalogueImportCodeState,
  async connect(connectionString) {
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
    return { db, disconnect: () => db.$disconnect() }
  },
  readJson: defaultReadJson,
  validateSource: validateCatalogueImportBundle,
  validateRelease: validateCatalogueReleaseEvidence,
  snapshot: snapshotCatalogueTarget,
  review: targetGalleryReviewFromDocument,
  plan: planCatalogueTarget,
  createReceipt: createCatalogueApplyReceipt,
  writeReceipt: writeCatalogueReceiptFile,
  readReceipt: readCatalogueReceiptFile,
  writeRecord: writeCanonicalExclusiveFile,
  apply: applyCatalogueTargetPlan,
  recover: recoverCatalogueTarget,
  now: () => new Date(),
  stdout: console.log,
}

function parseFlags(args: readonly string[], allowed: readonly string[]) {
  const result = new Map<string, string>()
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]
    if (!flag?.startsWith('--') || !value || value.startsWith('--')) throw new Error('catalogue import options require --name value pairs')
    const name = flag.slice(2)
    if (!allowed.includes(name) || result.has(name)) throw new Error(`unknown or duplicate catalogue import option --${name}`)
    result.set(name, value)
  }
  return result
}

function required(flags: ReadonlyMap<string, string>, name: string) {
  const value = flags.get(name)
  if (!value) throw new Error(`catalogue import requires --${name}`)
  return value
}

function same(actual: unknown, expected: unknown, label: string) {
  if (catalogueImportDigest(actual) !== catalogueImportDigest(expected)) throw new Error(`${label} mismatch`)
}

function assertCode(config: CatalogueImportExecutionConfig, code: CatalogueImportCodeState, requireClean: boolean) {
  if (code.head !== config.expectedCommit) throw new Error('checked import expectedCommit does not match Git HEAD')
  if (requireClean && !code.trackedClean) throw new Error('checked import requires a clean tracked worktree before writing')
}

function receiptFileRecord(descriptor: CatalogueReceiptFileDescriptor) {
  return {
    sha256: descriptor.sha256, bytes: descriptor.bytes, receiptFingerprint: descriptor.receiptFingerprint,
    streamSha256: descriptor.streamSha256, protectedScopes: descriptor.protectedScopes, mutations: descriptor.mutations,
  }
}

function assertPlanRecord(record: CatalogueImportPlanRecord, config: CatalogueImportExecutionConfig, configDigest: string, code: CatalogueImportCodeState, target: CatalogueImportTarget) {
  if (record.codeHead !== code.head || record.configDigest !== configDigest || record.operationId !== config.operationId || record.activationAt !== config.activationAt) throw new Error('plan record does not bind the config and code')
  same(record.target, target, 'plan record target')
}

function assertExecutionManifest(
  manifest: CatalogueImportExecutionManifest | undefined,
  action: 'apply' | 'recover',
  disposableLocal: boolean,
  bindings: { code: CatalogueImportCodeState; configDigest: string; target: CatalogueImportTarget; planRecordDigest: string; planRecord: CatalogueImportPlanRecord; now: Date },
) {
  if (disposableLocal && !manifest) return
  if (!manifest) throw new Error('non-disposable target requires a separate owner-approved execution manifest; the operator must independently verify its human approval')
  if (manifest.action !== action) throw new Error('execution manifest action mismatch')
  const expected = {
    codeHead: bindings.code.head, configDigest: bindings.configDigest, target: bindings.target,
    planRecordDigest: bindings.planRecordDigest, planFingerprint: bindings.planRecord.planFingerprint,
    receiptFingerprint: bindings.planRecord.receiptFingerprint, receiptFileSha256: bindings.planRecord.receiptFile.sha256,
  }
  for (const [key, value] of Object.entries(expected)) same(manifest[key as keyof typeof manifest], value, `execution manifest ${key}`)
  if (Date.parse(manifest.approval.approvedAt) > bindings.now.getTime()) throw new Error('execution manifest approval date is in the future')
}

function assertPlanExecutionManifest(
  manifest: CatalogueImportExecutionManifest | undefined,
  disposableLocal: boolean,
  bindings: { code: CatalogueImportCodeState; configDigest: string; target: CatalogueImportTarget; now: Date },
) {
  if (disposableLocal && !manifest) return
  if (!manifest) throw new Error('non-disposable target plan requires a separate owner-approved execution manifest; the operator must independently verify its human approval')
  if (manifest.action !== 'plan') throw new Error('execution manifest action mismatch')
  same(manifest.codeHead, bindings.code.head, 'execution manifest codeHead')
  same(manifest.configDigest, bindings.configDigest, 'execution manifest configDigest')
  same(manifest.target, bindings.target, 'execution manifest target')
  if (Date.parse(manifest.approval.approvedAt) > bindings.now.getTime()) throw new Error('execution manifest approval date is in the future')
}

async function loadConfig(path: string, runtime: CatalogueImportCliRuntime) {
  return runtime.readJson(path, configSchema)
}

async function buildPlan(config: CatalogueImportExecutionConfig, db: Database, runtime: CatalogueImportCliRuntime) {
  const source = await runtime.validateSource(config.frozenBundle as CatalogueImportBundleInput)
  const validated = await runtime.validateRelease(source, config.releaseEvidence as CatalogueReleaseEvidenceInput, { now: runtime.now() })
  const target = await runtime.snapshot(db)
  const reviewed = await runtime.readJson(config.galleryReview.document.path, z.unknown(), config.galleryReview.document)
  const gallery = runtime.review(source, target, reviewed.value as ReviewedTargetGalleryDocument, {
    documentFingerprint: config.galleryReview.documentFingerprint,
    evidenceFingerprint: config.galleryReview.evidenceFingerprint,
  })
  const plan = runtime.plan({ source, target, gallery, activationAt: config.activationAt })
  const receipt = runtime.createReceipt({ operationId: config.operationId, plan, validated, createdAt: config.activationAt })
  return { validated, plan, receipt }
}

async function loadPlanBindings(flags: ReadonlyMap<string, string>, configPath: string, connectionString: string, runtime: CatalogueImportCliRuntime) {
  const configFile = await loadConfig(configPath, runtime)
  const config = configFile.value
  const code = await runtime.codeState()
  assertCode(config, code, true)
  const { target, disposableLocal } = catalogueImportDatabaseTarget(connectionString)
  const planRecordFile = await runtime.readJson(required(flags, 'plan-record'), planRecordSchema)
  assertPlanRecord(planRecordFile.value, config, configFile.contentDigest, code, target)
  const receipt = await runtime.readReceipt(required(flags, 'receipt'), {
    sha256: planRecordFile.value.receiptFile.sha256,
    bytes: planRecordFile.value.receiptFile.bytes,
    receiptFingerprint: planRecordFile.value.receiptFingerprint,
  })
  same(receiptFileRecord(receipt.descriptor), planRecordFile.value.receiptFile, 'receipt file descriptor')
  if (receipt.receipt.planFingerprint !== planRecordFile.value.planFingerprint) throw new Error('receipt does not bind the plan record')
  const manifestPath = flags.get('execution-manifest')
  const manifest = manifestPath ? (await runtime.readJson(manifestPath, executionManifestSchema)).value : undefined
  return { configFile, config, code, target, disposableLocal, planRecordFile, receipt, manifest }
}

export const CATALOGUE_IMPORT_CLI_USAGE = [
  'tsx etl/catalogue-import-cli.ts code-pin',
  'tsx etl/catalogue-import-cli.ts plan --config <json> --receipt <jsonl> --plan-record <json> [--execution-manifest <json>]',
  'tsx etl/catalogue-import-cli.ts apply --config <json> --receipt <jsonl> --plan-record <json> --release-record <json> [--execution-manifest <json>]',
  'tsx etl/catalogue-import-cli.ts recover --config <json> --receipt <jsonl> --plan-record <json> [--execution-manifest <json>]',
  'DATABASE_URL must be explicitly configured in the process environment; this CLI never loads .env files.',
  'Non-disposable targets require a separately reviewed execution manifest; validating that record cannot prove human approval, which remains the operator’s responsibility.',
].join('\n')

/** Command runner is injectable so tests never connect to or mutate a real database. */
export async function runCatalogueImportCli(argv: readonly string[], options: { runtime?: CatalogueImportCliRuntime; env?: { DATABASE_URL?: string } } = {}) {
  const runtime = options.runtime ?? defaultRuntime
  const env = options.env ?? process.env
  const [command, ...args] = argv
  if (command === 'code-pin') {
    if (args.length) throw new Error(CATALOGUE_IMPORT_CLI_USAGE)
    const code = await runtime.codeState()
    runtime.stdout(JSON.stringify({ schemaVersion: 1, kind: 'catalogue-import-code-pin', head: code.head, trackedClean: code.trackedClean }))
    return code
  }
  if (!['plan', 'apply', 'recover'].includes(command ?? '')) throw new Error(CATALOGUE_IMPORT_CLI_USAGE)
  const allowed = command === 'plan' ? ['config', 'receipt', 'plan-record', 'execution-manifest'] : command === 'apply'
    ? ['config', 'receipt', 'plan-record', 'release-record', 'execution-manifest']
    : ['config', 'receipt', 'plan-record', 'execution-manifest']
  const flags = parseFlags(args, allowed)
  const connectionString = env.DATABASE_URL
  if (!connectionString) throw new Error('catalogue import requires explicitly configured DATABASE_URL; no .env file is loaded')
  const configPath = required(flags, 'config')

  if (command === 'plan') {
    const configFile = await loadConfig(configPath, runtime)
    const code = await runtime.codeState()
    assertCode(configFile.value, code, true)
    const { target, disposableLocal } = catalogueImportDatabaseTarget(connectionString)
    const manifestPath = flags.get('execution-manifest')
    const manifest = manifestPath ? (await runtime.readJson(manifestPath, executionManifestSchema)).value : undefined
    assertPlanExecutionManifest(manifest, disposableLocal, { code, configDigest: configFile.contentDigest, target, now: runtime.now() })
    const connection = await runtime.connect(connectionString)
    try {
      const built = await buildPlan(configFile.value, connection.db, runtime)
      assertCode(configFile.value, await runtime.codeState(), true)
      const receiptFile = await runtime.writeReceipt(required(flags, 'receipt'), built.receipt)
      assertCode(configFile.value, await runtime.codeState(), true)
      const planRecord: CatalogueImportPlanRecord = {
        schemaVersion: 1, kind: 'catalogue-import-plan-record', codeHead: code.head,
        configDigest: configFile.contentDigest, target, operationId: configFile.value.operationId,
        activationAt: configFile.value.activationAt, planFingerprint: built.plan.fingerprint,
        receiptFingerprint: built.receipt.fingerprint, receiptFile: receiptFileRecord(receiptFile),
        summary: { ...built.plan.summary },
      }
      const recordFile = await runtime.writeRecord(required(flags, 'plan-record'), planRecord)
      runtime.stdout(JSON.stringify({ command, target, planFingerprint: built.plan.fingerprint, receiptFingerprint: built.receipt.fingerprint, receiptFileSha256: receiptFile.sha256, planRecordDigest: recordFile.contentDigest, summary: built.plan.summary }))
      return { plan: built.plan, receipt: built.receipt, receiptFile, planRecord, recordFile }
    } finally { await connection.disconnect() }
  }

  const bindings = await loadPlanBindings(flags, configPath, connectionString, runtime)
  assertExecutionManifest(bindings.manifest, command as 'apply' | 'recover', bindings.disposableLocal, {
    code: bindings.code, configDigest: bindings.configFile.contentDigest, target: bindings.target,
    planRecordDigest: bindings.planRecordFile.contentDigest, planRecord: bindings.planRecordFile.value, now: runtime.now(),
  })
  const connection = await runtime.connect(connectionString)
  try {
    if (command === 'recover') {
      assertCode(bindings.config, await runtime.codeState(), true)
      const result = await runtime.recover(connection.db, { receipt: bindings.receipt.receipt })
      runtime.stdout(JSON.stringify({ command, target: bindings.target, operationId: result.operationId, receiptFingerprint: result.fingerprint }))
      return result
    }
    const built = await buildPlan(bindings.config, connection.db, runtime)
    if (built.plan.fingerprint !== bindings.planRecordFile.value.planFingerprint || built.receipt.fingerprint !== bindings.planRecordFile.value.receiptFingerprint || catalogueImportDigest(built.receipt) !== catalogueImportDigest(bindings.receipt.receipt)) {
      throw new Error('regenerated reviewed plan does not match the approved receipt pins')
    }
    await built.validated.assertReleaseEvidenceStillValid(runtime.now())
    assertCode(bindings.config, await runtime.codeState(), true)
    const releaseRecord = {
      schemaVersion: 1, kind: 'catalogue-import-release-intent', recordedAt: runtime.now().toISOString(),
      codeHead: bindings.code.head, configDigest: bindings.configFile.contentDigest, target: bindings.target,
      operationId: bindings.config.operationId, activationAt: bindings.config.activationAt,
      planRecordDigest: bindings.planRecordFile.contentDigest, planFingerprint: built.plan.fingerprint,
      receiptFingerprint: built.receipt.fingerprint, receiptFileSha256: bindings.receipt.descriptor.sha256,
      releaseEvidence: built.validated.releaseEvidence,
      note: 'Supplementary pre-apply validation record; it is not evidence of human approval or successful application.',
    }
    const releaseFile = await runtime.writeRecord(required(flags, 'release-record'), releaseRecord)
    assertCode(bindings.config, await runtime.codeState(), true)
    const result = await runtime.apply(connection.db, { validated: built.validated, plan: built.plan, receipt: bindings.receipt.receipt })
    runtime.stdout(JSON.stringify({ command, target: bindings.target, operationId: result.operationId, receiptFingerprint: result.fingerprint, releaseRecordSha256: releaseFile.sha256 }))
    return { receipt: result, releaseFile }
  } finally { await connection.disconnect() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCatalogueImportCli(process.argv.slice(2)).catch((error) => {
    const message = error instanceof Error ? error.message : 'unknown catalogue import failure'
    const connectionString = process.env.DATABASE_URL
    console.error(connectionString ? message.split(connectionString).join('[DATABASE_URL redacted]') : message)
    process.exitCode = 1
  })
}
