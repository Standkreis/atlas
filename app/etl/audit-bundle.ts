/** Publish a complete audit directory once; interrupted attempts remain private staging evidence. */
import { lstat, mkdir, mkdtemp, rename, rmdir } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

async function requireAbsent(path: string) {
  try { await lstat(path) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  throw new Error(`audit output already exists; choose a new directory: ${path}`)
}

export async function publishAuditBundle<T>(output: string, prepare: (staging: string) => Promise<T>): Promise<T> {
  const destination = resolve(output), parent = dirname(destination)
  await mkdir(parent, { recursive: true })
  // Exclusive cooperative publication lock. A killed process leaves its lock/staging behind;
  // use a new output path, never treat that partial attempt as a released bundle.
  const lock = `${destination}.publishing`
  await mkdir(lock)
  let failure: unknown
  try {
    await requireAbsent(destination)
    const staging = await mkdtemp(join(parent, `.${basename(destination)}.pending-`))
    const result = await prepare(staging)
    await requireAbsent(destination)
    // Same-parent rename publishes artifact, audit, manifest and template together.
    await rename(staging, destination)
    return result
  } catch (error) {
    failure = error
    throw error
  } finally {
    try { await rmdir(lock) }
    catch (error) {
      if (failure) throw new AggregateError([failure, error], 'audit publication and lock cleanup failed')
      throw error
    }
  }
}
