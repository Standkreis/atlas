/** Read-only frozen-file/CDN check. No database connection, provider API or image mirroring. */
import { appendFile, lstat, mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseCatalogueImportExecutionConfig } from './catalogue-import-cli'
import { validateCatalogueImportBundle, validateFrozenReleaseEvidence } from './catalogue-import-validation'
import { writeCanonicalExclusiveFile } from './catalogue-import-receipt-file'
import { contentDigest } from './catalogue-gallery-transfer'
import { checkReferenceUrl, nextUrlChecks, recordedCheck, reusableCheck, type NetworkCheck } from './gallery-network-audit'
import { validateReleaseSpotReport, type ReleaseSpotContract, type ReleaseSpotReport } from './catalogue-release-spots'

export function parseReleaseSpotArgs(args: string[]) {
  const flags = new Map<string, string>()
  for (let index = 0; index < args.length; index++) {
    const key = args[index]!, value = args[++index]
    if (!['--config', '--checkpoint', '--output', '--limit'].includes(key) || flags.has(key) || !value || value.startsWith('--')) throw new Error('invalid release-spot arguments')
    flags.set(key, value)
  }
  const config = flags.get('--config'), checkpoint = flags.get('--checkpoint'), output = flags.get('--output')
  const limit = flags.has('--limit') ? Number(flags.get('--limit')) : Infinity
  if (!config || !checkpoint || !output || (flags.has('--limit') && (!Number.isSafeInteger(limit) || limit < 1))) throw new Error('requires --config, --checkpoint, --output and optional positive --limit')
  const paths = [config, checkpoint, output].map((path) => resolve(path))
  if (new Set(paths).size !== paths.length) throw new Error('config, checkpoint and output must be different files')
  return { config: paths[0]!, checkpoint: paths[1]!, output: paths[2]!, limit }
}

export async function checkReleaseSpots(contract: ReleaseSpotContract, options: { checkpoint: string; limit: number },
  runtime: { check?: typeof checkReferenceUrl; now?: () => Date; pause?: (ms: number) => Promise<void> } = {}) {
  const now = runtime.now ?? (() => new Date()), check = runtime.check ?? checkReferenceUrl
  const pause = runtime.pause ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)))
  const fingerprint = contentDigest(contract), urls = [...new Set(contract.targets.map((target) => target.url))].sort()
  const history = new Map<string, NetworkCheck>()
  await mkdir(dirname(options.checkpoint), { recursive: true })
  try {
    const text = await readFile(options.checkpoint, 'utf8')
    if (text && !text.endsWith('\n')) await appendFile(options.checkpoint, '\n')
    for (const line of text.split('\n').filter(Boolean)) {
      try {
        const row = JSON.parse(line)
        if (row.contractFingerprint === fingerprint && recordedCheck(row.check, now().getTime()) && urls.includes(row.check.url) &&
          (!history.has(row.check.url) || Date.parse(row.check.checkedAt) >= Date.parse(history.get(row.check.url)!.checkedAt))) history.set(row.check.url, row.check)
      } catch { /* Retain interrupted records; never treat them as successful evidence. */ }
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  const pending = nextUrlChecks(urls, history, options.limit, now().getTime())
  const reused = urls.filter((url) => reusableCheck(history.get(url), now().getTime())).length
  let nextRequest = 0, networkRequests = 0
  // One worker is bounded below the existing four-worker checker; every retry/redirect is paced.
  const beforeRequest = async () => {
    const delay = Math.max(0, nextRequest - now().getTime())
    if (delay) await pause(delay)
    nextRequest = now().getTime() + 200
    networkRequests++
  }
  for (const url of pending) {
    const result = await check(url, { now, pause, beforeRequest })
    history.set(url, result)
    await appendFile(options.checkpoint, `${JSON.stringify({ contractFingerprint: fingerprint, check: result })}\n`, { mode: 0o600 })
  }
  const report: ReleaseSpotReport = {
    schemaVersion: 1, kind: 'catalogue-release-image-spots', contract, generatedAt: now().toISOString(),
    checks: urls.flatMap((url) => history.has(url) ? [history.get(url)!] : []),
    attempted: pending.length, reused, networkRequests,
    limitation: 'Representative HTTP status/image MIME only; the immutable complete audit remains required. Not decoding, scientific/licensing proof or a guarantee of future availability. No image bytes retained.',
  }
  // An interrupted/limited/failed sample remains checkpoint evidence, never a release report.
  validateReleaseSpotReport(report, contract, now())
  return report
}

export async function runReleaseSpotAudit(options: ReturnType<typeof parseReleaseSpotArgs>) {
  if ((await stat(options.config)).size > 32 * 1024 * 1024) throw new Error('execution config exceeds 32 MiB')
  const config = parseCatalogueImportExecutionConfig(JSON.parse(await readFile(options.config, 'utf8')))
  const protectedPaths = [config.frozenBundle.base, config.frozenBundle.gallery].flatMap((bundle) => [bundle.audit.path, bundle.manifest.path, bundle.artifact.path])
  protectedPaths.push(options.config, config.releaseEvidence.networkReview.path, config.releaseEvidence.auditUrlReport.path, config.galleryReview.document.path)
  if (protectedPaths.some((path) => [options.checkpoint, options.output].includes(resolve(path)))) throw new Error('spot output/checkpoint cannot overwrite frozen evidence')
  try {
    const checkpoint = await lstat(options.checkpoint)
    if (!checkpoint.isFile() || checkpoint.size > 32 * 1024 * 1024) throw new Error('spot checkpoint must be a regular file no larger than 32 MiB')
    for (const path of protectedPaths) {
      const input = await stat(path)
      if (checkpoint.dev === input.dev && checkpoint.ino === input.ino) throw new Error('spot checkpoint aliases protected input')
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  // Output is exclusive; fail before issuing requests if the chosen report already exists.
  try { await stat(options.output); throw new Error('spot output already exists; choose a new report path') }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  const source = await validateCatalogueImportBundle(config.frozenBundle)
  const { spotContract } = await validateFrozenReleaseEvidence(source, config.releaseEvidence)
  console.error(`release spots: ${spotContract.targets.length} reviewed assets, ${new Set(spotContract.targets.map((target) => target.url)).size} unique image URLs`)
  const report = await checkReleaseSpots(spotContract, options)
  await source.assertStillValid()
  await mkdir(dirname(options.output), { recursive: true })
  await writeCanonicalExclusiveFile(options.output, report)
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runReleaseSpotAudit(parseReleaseSpotArgs(process.argv.slice(2))).then((report) => {
    console.log(`release spots passed: ${report.checks.length} URLs (${report.networkRequests} requests, ${report.reused} reused)`)
  }).catch((error) => { console.error(error instanceof Error ? error.message : 'release spot check failed'); process.exitCode = 1 })
}
