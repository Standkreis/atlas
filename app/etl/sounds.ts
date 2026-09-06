// The `sounds` step (handoff 0021 D5, grill 0019 S2): one xeno-canto clip per bird, frog, grasshopper and bat in a
// region's set. API v3 with XENO_CANTO_API_KEY from the shell (never printed; absent → the step says so and skips).
// Per taxon one name search (`sp:"Turdus merula" grp:birds q:A len:5-30`, a second without the length filter when it
// finds nothing): song over call, ≤ 30 s preferred, the shortest of those, never under 5 s, never an ND licence
// (cropping is forbidden there and nothing is cropped anyway), MP3 files only (a WAV of a grasshopper is 20 MB). The clip is downloaded once and put through the
// photos.ts seam as `sounds/<gbifKey>.mp3`; one Asset row `kind: 'sound'` carries recordist, licence, the recording
// page and `meta { xcId, type, length, quality }`. A taxon with a sound Asset is skipped: idempotent.
import { randomUUID } from 'node:crypto'
import { soundExists, soundUrl, writeSound } from '../src/server/photos'
import { db } from './db'
import { isMp3, isND, licenceName, pickClip, seconds, type Recording } from './clip'
import { get, requests } from './fetch'

export type SoundsOpts = { region?: string; keys?: number[]; limit?: number; log?: (s: string) => void }
export type SoundsResult = { taxa: number; stored: number; skipped: number; none: number; nd: number; wav: number; failed: number; bytes: number; seconds: number; keyPresent: boolean; requests: ReturnType<typeof requests> }

const GROUP = (t: { tile: string; order: string | null }) => (t.tile === 'bird' ? 'birds' : t.order === 'Anura' ? 'frogs' : t.order === 'Orthoptera' ? 'grasshoppers' : t.order === 'Chiroptera' ? 'bats' : null)

export async function runSounds(opts: SoundsOpts): Promise<SoundsResult> {
  const log = opts.log ?? console.log
  const t0 = Date.now()
  const key = process.env.XENO_CANTO_API_KEY
  const r: SoundsResult = { taxa: 0, stored: 0, skipped: 0, none: 0, nd: 0, wav: 0, failed: 0, bytes: 0, seconds: 0, keyPresent: !!key, requests: requests() }
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
  log(`sounds: ${taxa.length} taxa in the xeno-canto groups, ${taxa.filter((t) => t.assets.length).length} with a clip already`)

  for (const t of taxa) {
    if (t.assets.length) { r.skipped++; continue }
    const grp = GROUP(t)!
    try {
      const search = async (extra: string) => {
        const j = await get<{ recordings?: Recording[] }>(`https://xeno-canto.org/api/3/recordings?query=${encodeURIComponent(`sp:"${t.sciName}" grp:${grp} q:A${extra}`)}&per_page=100&key=${key}`)
        return j?.recordings ?? []
      }
      let recs = await search(' len:5-30')
      if (!pickClip(recs)) recs = await search('')
      const best = pickClip(recs)
      if (!best) {
        if (recs.some((x) => x.q === 'A' && isND(x.lic ?? ''))) r.nd++
        if (recs.some((x) => x.q === 'A' && !isMp3(x))) r.wav++
        r.none++
        continue
      }
      let bytes: Uint8Array | null = null
      if (!(await soundExists(t.gbifKey))) {
        bytes = await get(best.file, { bytes: true })
        if (!bytes?.length) throw new Error(`empty download for XC${best.id}`)
        await writeSound(t.gbifKey, bytes)
        r.bytes += bytes.length
      }
      const id = randomUUID()
      await db.asset.create({
        data: {
          id, kind: 'sound', url: soundUrl(id), author: best.rec, licence: licenceName(best.lic), licenceUrl: best.lic, sourceUrl: best.url, origin: 'xeno-canto',
          caption: best.en || t.sciName, meta: { xcId: Number(best.id), type: best.type, length: seconds(best.length), quality: best.q }, taxonId: t.id,
        },
      })
      r.stored++
      log(`  ♪ ${t.sciName}: XC${best.id} ${best.type} ${best.length} ${licenceName(best.lic)} ${best.rec}${bytes ? ` · ${(bytes.length / 1024).toFixed(0)} KB` : ' · blob existed'}`)
    } catch (e) {
      r.failed++
      log(`  ✗ ${t.sciName} (${t.gbifKey}): ${e instanceof Error ? e.message : e}`)
    }
  }
  r.seconds = (Date.now() - t0) / 1000
  r.requests = requests()
  return r
}
