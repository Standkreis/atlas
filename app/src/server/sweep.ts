import { db } from './db'
import { deleteAbandonedPhotos, retryPendingPhotoDeletes } from './photos'
import { cleanupQuotas } from './quotas'

// Runtime maintenance is deliberately bounded. Region/content preparation runs in the CLI,
// where a process can outlive a serverless request; no external ETL work or hour-long transaction here.
export type SweepResult = { regions: string[]; content: number; contentDone: number; contentFailed: number; photos: number; codes: number; seconds: number; cut: boolean }
export async function sweep(log: (s: string) => void = console.log, opts: { deadlineMs?: number } = {}): Promise<SweepResult> {
  const started = Date.now(), deadline = started + (opts.deadlineMs ?? 30_000)
  const photos = await deleteAbandonedPhotos()
  if (Date.now() < deadline) await retryPendingPhotoDeletes(10)
  const { count: codes } = await db.emailCode.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } } })
  await cleanupQuotas()
  const result = { regions: [], content: 0, contentDone: 0, contentFailed: 0, photos, codes, seconds: (Date.now() - started) / 1000, cut: Date.now() >= deadline }
  log(`cleanup: ${photos} abandoned photos, ${codes} expired codes; region/content work remains in npm run etl -- sweep`)
  return result
}
