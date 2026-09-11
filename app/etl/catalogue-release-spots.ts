/** Versioned release-time availability evidence; not a replacement for the complete frozen audit. */
import { z } from 'zod'
import { contentDigest } from './catalogue-gallery-transfer'
import { reusableCheck } from './gallery-network-audit'

const sha = z.string().regex(/^[a-f\d]{64}$/)
const instant = z.string().refine((value) => {
  const at = new Date(value)
  return Number.isFinite(at.getTime()) && at.toISOString() === value
}, 'must be a real millisecond UTC timestamp')
export const releaseSpotContractSchema = z.strictObject({
  catalogueId: z.string().min(1), unionFingerprint: sha, contentFingerprint: sha,
  sourceFilesFingerprint: sha, sourcePinsFingerprint: sha, auditUrlReportSha256: sha,
  fullTargetsFingerprint: sha, reviewedTargetsFingerprint: sha,
  targets: z.array(z.strictObject({ assetId: z.string().min(1), url: z.string().min(1) })),
})
const reportSchema = z.strictObject({
  schemaVersion: z.literal(1), kind: z.literal('catalogue-release-image-spots'),
  contract: releaseSpotContractSchema, generatedAt: instant,
  checks: z.array(z.strictObject({ url: z.string(), checkedAt: instant, ok: z.boolean(),
    status: z.number().int().nullable(), method: z.enum(['HEAD', 'GET']),
    contentType: z.string().nullable(), finalUrl: z.string().nullable(), reason: z.string().nullable() })),
  attempted: z.number().int().nonnegative(), networkRequests: z.number().int().nonnegative(),
  reused: z.number().int().nonnegative(), limitation: z.string().min(1),
})
export type ReleaseSpotContract = z.infer<typeof releaseSpotContractSchema>
export type ReleaseSpotReport = z.infer<typeof reportSchema>
export const parseReleaseSpotReport = (value: unknown) => reportSchema.parse(value)

export function validateReleaseSpotReport(value: unknown, expected: ReleaseSpotContract, now: Date): ReleaseSpotReport {
  const report = parseReleaseSpotReport(value)
  if (contentDigest(report.contract) !== contentDigest(expected)) throw new Error('release spot report contract mismatch')
  const at = now.getTime(), generatedAt = Date.parse(report.generatedAt)
  if (!Number.isFinite(at) || generatedAt > at || at - generatedAt >= 24 * 60 * 60_000) throw new Error('release spot report stale or from the future')
  const urls = new Set(expected.targets.map((target) => target.url)), seen = new Set<string>()
  for (const check of report.checks) {
    if (!urls.has(check.url) || seen.has(check.url) || Date.parse(check.checkedAt) > generatedAt || !reusableCheck(check, at)) {
      throw new Error('release spot report has an invalid, duplicate, stale, or unbound check')
    }
    seen.add(check.url)
  }
  if (seen.size !== urls.size) throw new Error('release spot report missing required checks')
  return report
}
