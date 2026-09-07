// The `sounds` step (handoff 0021 D5, grill 0019 S2): one xeno-canto clip per bird, frog, grasshopper and bat in a
// region's set. API v3 with XENO_CANTO_API_KEY from the shell (never printed; absent → the step says so and skips).
// Per taxon one name search (`sp:"Turdus merula" grp:birds q:A len:5-30`, a second without the length filter when it
// finds nothing): song over call, ≤ 30 s preferred, the shortest of those, never under 5 s, never an ND licence
// (cropping is forbidden there and nothing is cropped anyway). MP3 files first; a WAV (a grasshopper's A recordings are
// often WAV only, 20 MB for 26 s) is taken when no MP3 qualifies and transcoded with `ffmpeg-static` to MP3 128 kbps
// mono, `meta.transcoded: true` (0025 C1); without the package the WAV is skipped with a log line. The clip is downloaded
// once and put through the photos.ts seam as `sounds/<gbifKey>.mp3`; one Asset row `kind: 'sound'` carries recordist,
// licence, the recording page and `meta { xcId, type, length, quality }`. A taxon with a sound Asset is skipped: idempotent.
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { soundExists, soundUrl, writeSound } from '../src/server/photos'
import { db } from './db'
import { isND, isWav, licenceName, needsTranscode, pickClip, seconds, type Recording } from './clip'
import { get, requests } from './fetch'

export type SoundsOpts = { region?: string; keys?: number[]; limit?: number; log?: (s: string) => void }
export type SoundsResult = { taxa: number; stored: number; transcoded: number; skipped: number; none: number; nd: number; wav: number; failed: number; bytes: number; seconds: number; keyPresent: boolean; requests: ReturnType<typeof requests> }

/** The ffmpeg binary of `ffmpeg-static`, null when the package is not installed (the ETL still runs, WAV-only taxa stay without a clip). */
export async function ffmpegPath(): Promise<string | null> {
  try { return ((await import('ffmpeg-static')) as { default: string | null }).default } catch { return null }
}
/** WAV bytes → MP3 128 kbps mono, nothing cropped; through two temp files, ffmpeg is quiet unless it fails. */
export async function transcode(ffmpeg: string, wav: Uint8Array): Promise<Uint8Array> {
  const dir = await mkdtemp(join(tmpdir(), 'dex-sound-'))
  try {
    const src = join(dir, 'in.wav'), dst = join(dir, 'out.mp3')
    await writeFile(src, wav)
    await promisify(execFile)(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '128k', dst], { maxBuffer: 1 << 20 })
    return new Uint8Array(await readFile(dst))
  } finally { await rm(dir, { recursive: true, force: true }) }
}

const GROUP = (t: { tile: string; order: string | null }) => (t.tile === 'bird' ? 'birds' : t.order === 'Anura' ? 'frogs' : t.order === 'Orthoptera' ? 'grasshoppers' : t.order === 'Chiroptera' ? 'bats' : null)

/** GBIF's binomial synonyms of a taxon, unique, for the name fallback (the same call `facts.ts` makes for the bulk files). */
async function synonyms(gbifKey: number): Promise<string[]> {
  const r = await get<{ results: { canonicalName?: string }[] }>(`https://api.gbif.org/v1/species/${gbifKey}/synonyms?limit=50`)
  return [...new Set((r?.results ?? []).map((s) => (s.canonicalName ?? '').split(/\s+/).slice(0, 2).join(' ')).filter((n) => /^\S+ \S+$/.test(n)))]
}

export async function runSounds(opts: SoundsOpts): Promise<SoundsResult> {
  const log = opts.log ?? console.log
  const t0 = Date.now()
  const key = process.env.XENO_CANTO_API_KEY
  const r: SoundsResult = { taxa: 0, stored: 0, transcoded: 0, skipped: 0, none: 0, nd: 0, wav: 0, failed: 0, bytes: 0, seconds: 0, keyPresent: !!key, requests: requests() }
  if (!key) {
    log('sounds: XENO_CANTO_API_KEY is not set, skipping the step (the account page at xeno-canto.org has it)')
    return r
  }
  const regionRow = opts.region ? await db.region.findFirst({ where: { OR: [{ name: opts.region }, { gadmGid: opts.region }] }, select: { id: true } }) : null
  if (opts.region && !regionRow) throw new Error(`no region "${opts.region}"`)
  const candidates = await db.taxon.findMany({
    where: {
      ...(opts.keys ? { gbifKey: { in: opts.keys } } : { plausibility: { some: regionRow ? { regionId: regionRow.id } : {} } }),
      OR: [{ tile: 'bird' }, { order: { in: ['Anura', 'Orthoptera', 'Chiroptera'] } }],
    },
    select: { id: true, gbifKey: true, sciName: true, tile: true, order: true, assets: { where: { kind: 'sound' }, select: { id: true } } },
    orderBy: { gbifKey: 'asc' },
    take: opts.limit,
  })
  const taxa = candidates.filter((t) => GROUP(t))
  r.taxa = taxa.length
  const ffmpeg = await ffmpegPath()
  log(`sounds: ${taxa.length} taxa in the xeno-canto groups, ${taxa.filter((t) => t.assets.length).length} with a clip already${ffmpeg ? '' : ' · ffmpeg-static not installed, WAV-only taxa are skipped'}`)

  for (const t of taxa) {
    if (t.assets.length) { r.skipped++; continue }
    const grp = GROUP(t)!
    try {
      const search = async (extra: string, name = t.sciName) => {
        const j = await get<{ recordings?: Recording[] }>(`https://xeno-canto.org/api/3/recordings?query=${encodeURIComponent(`sp:"${name}" grp:${grp} q:A${extra}`)}&per_page=100&key=${key}`)
        return j?.recordings ?? []
      }
      const pick = (xs: Recording[]) => pickClip(xs, { wav: !!ffmpeg })
      let recs = await search(' len:5-30')
      if (!pick(recs)) recs = await search('')
      // No recording under the GBIF name at all: xeno-canto may file the species under a synonym (Sylvia communis is
      // Curruca communis there, 4,900 recordings; 0025 C1). One GBIF call, then the binomial synonyms in turn.
      if (!recs.length) {
        for (const name of await synonyms(t.gbifKey)) {
          recs = await search('', name)
          if (recs.length) { log(`  · ${t.sciName} found as ${name}`); break }
        }
      }
      const best = pick(recs)
      if (!best) {
        if (recs.some((x) => x.q === 'A' && isND(x.lic ?? ''))) r.nd++
        if (recs.some((x) => x.q === 'A' && !isND(x.lic ?? '') && isWav(x))) r.wav++
        r.none++
        continue
      }
      const transcoded = needsTranscode(best)
      let bytes: Uint8Array | null = null
      let raw = 0
      if (!(await soundExists(t.gbifKey))) {
        bytes = await get(best.file, { bytes: true })
        if (!bytes?.length) throw new Error(`empty download for XC${best.id}`)
        raw = bytes.length
        if (transcoded) bytes = await transcode(ffmpeg!, bytes)
        await writeSound(t.gbifKey, bytes)
        r.bytes += bytes.length
      }
      if (transcoded) r.transcoded++
      const id = randomUUID()
      await db.asset.create({
        data: {
          id, kind: 'sound', url: soundUrl(id), author: best.rec, licence: licenceName(best.lic), licenceUrl: best.lic, sourceUrl: best.url, origin: 'xeno-canto',
          caption: best.en || t.sciName, meta: { xcId: Number(best.id), type: best.type, length: seconds(best.length), quality: best.q, ...(transcoded ? { transcoded: true } : {}) }, taxonId: t.id,
        },
      })
      r.stored++
      log(`  ♪ ${t.sciName}: XC${best.id} ${best.type} ${best.length} ${licenceName(best.lic)} ${best.rec}${bytes ? ` · ${(bytes.length / 1024).toFixed(0)} KB${transcoded ? ` (WAV ${(raw / 1024 / 1024).toFixed(1)} MB → MP3)` : ''}` : ' · blob existed'}`)
    } catch (e) {
      r.failed++
      log(`  ✗ ${t.sciName} (${t.gbifKey}): ${e instanceof Error ? e.message : e}`)
    }
  }
  r.seconds = (Date.now() - t0) / 1000
  r.requests = requests()
  return r
}
