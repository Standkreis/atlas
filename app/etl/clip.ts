// The pure half of the `sounds` step (handoff 0021 D5): which xeno-canto recording a taxon gets. Kept apart from
// sounds.ts so the unit tests need no Prisma client or Blob token.
export type Recording = { id: string; en?: string; rec: string; type: string; url: string; file: string; 'file-name'?: string; lic: string; q: string; length: string }
export const seconds = (length: string) => length.split(':').reduce((a, b) => a * 60 + Number(b), 0)
/** "CC BY-NC-SA 4.0" from the deed URL xeno-canto sends; "CC0 1.0" for the public-domain deed. */
export const licenceName = (url: string) => { const m = url.match(/licenses\/([a-z-]+)\/(\d\.\d)/); return m ? `CC ${m[1]!.toUpperCase()} ${m[2]}` : /publicdomain\/zero/.test(url) ? 'CC0 1.0' : url }
export const isND = (lic: string) => /-nd\b/.test(lic)
export const isMp3 = (x: Recording) => /\.mp3$/i.test(x['file-name'] ?? '')
export const isWav = (x: Recording) => /\.wav$/i.test(x['file-name'] ?? '')
/** True when the clip must go through ffmpeg before it is stored (0025 C1): a WAV, never an MP3. */
export const needsTranscode = (x: Recording) => !isMp3(x)

// A sold product needs a licence filter here (findings 0021 F, accepted in 0025 C4): `licensed.some((l) => x.lic.includes(l))`,
// then a refill; today every usable clip is NC and that is fine for a personal atlas.
const usable = (x: Recording) => x.q === 'A' && !isND(x.lic ?? '') && seconds(x.length ?? '0') >= 5
const band = (n: number) => (n >= 10 && n <= 30 ? 0 : n < 10 ? 2_000 : 5_000)
const rank = (x: Recording) => (/song/i.test(x.type) ? 0 : /call/i.test(x.type) ? 1 : 2) * 10_000 + band(seconds(x.length)) + seconds(x.length)
const best = (recs: Recording[]) => [...recs].sort((a, b) => rank(a) - rank(b))[0] ?? null

/**
 * The clip the row gets: quality A only, song over call, 10–30 s when possible (a full phrase, not a snippet), else ≤ 30 s,
 * else the shortest, at least 5 s, no ND (the licence forbids the format change and the crop). MP3 files first; with
 * `wav: true` (ffmpeg at hand, 0025 C1) a WAV by the same rule when no MP3 qualifies, never over an MP3.
 */
export function pickClip(recs: Recording[], opts: { wav?: boolean } = {}): Recording | null {
  const ok = recs.filter(usable)
  return best(ok.filter(isMp3)) ?? (opts.wav ? best(ok.filter(isWav)) : null)
}
