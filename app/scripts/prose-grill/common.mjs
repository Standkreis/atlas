// Shared bits of the prose grill (handoff 0026): paths, a disk cache under scripts/prose-grill/.cache (git-ignored),
// the Messages API over fetch with thinking disabled, prices per model, a cost log in grill.json and the 8 $ cap.
// Env handling, JSON helpers and the markdown table come from the 0019 probe (steckbrief-probe/lib.mjs), by import.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { keyOrNull, readJson, writeJson, md, DEV_DB, norm, pct } from '../steckbrief-probe/lib.mjs'

export { keyOrNull, readJson, writeJson, md, DEV_DB, norm, pct }
export const HERE = new URL('.', import.meta.url).pathname
export const CACHE = join(HERE, '.cache')
mkdirSync(CACHE, { recursive: true })
export const GRILL = join(HERE, 'grill.json')
export const CAP_USD = 8
export const REGION = 'Mainz-Bingen'

/** $ per MTok, platform.claude.com/docs/en/about-claude/pricing (0015 §💸 for Sonnet and Opus; Haiku 4.5 read 2026-09-07). */
export const MODELS = {
  sonnet: { id: 'claude-sonnet-5', input: 2, output: 10 },
  opus: { id: 'claude-opus-5', input: 5, output: 25 },
  haiku: { id: 'claude-haiku-4-5-20251001', input: 1, output: 5 },
}
export const BATCH_DISCOUNT = 0.5

export const cachePath = (name) => join(CACHE, name)
export const cached = (key) => { const f = cachePath(key + '.json'); return existsSync(f) ? readJson(f) : null }
export const store = (key, v) => writeJson(cachePath(key + '.json'), v)
export const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12)

/** GET JSON with cache keyed by URL hash (GloBI). */
export async function getJson(url) {
  const key = 'http-' + sha(url)
  const hit = cached(key)
  if (hit) return hit.data
  const r = await fetch(url, { headers: { 'user-agent': 'standkreis-dex/0026-prose-grill (https://github.com/svreiser/standkreis-dex; svreiser@gmail.com)' } })
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`)
  const data = await r.json()
  store(key, { url, at: new Date().toISOString(), data })
  return data
}

// ── the cost log ─────────────────────────────────────────────────────────────────────────────────────────────────
export const grill = () => (existsSync(GRILL) ? readJson(GRILL) : { at: null, cap: CAP_USD, total: 0, calls: [] })
export const spent = () => grill().calls.reduce((s, c) => s + c.usd, 0)
function logCall(row) {
  const g = grill()
  g.calls = g.calls.filter((c) => c.id !== row.id)
  g.calls.push(row)
  g.total = g.calls.reduce((s, c) => s + c.usd, 0)
  g.at = new Date().toISOString()
  writeJson(GRILL, g)
  return g.total
}

/**
 * The answer as JSON. Sonnet 5 without thinking stumbles on the two-paragraph shape in ~1 of 6 drafts: a stray
 * `{"paragraphs":[]}[0],` between the paragraphs, or a broken first attempt followed by "Wait, ich korrigiere das
 * Format:" and a complete second JSON. The sentences are intact, so: whole text → stray token cut out → the last
 * balanced top-level object that parses (unclosed braces closed). `repaired` says which path was taken; a build must expect this.
 */
export function parseJson(text) {
  const raw = (text ?? '').replace(/^```(?:json)?\s*|\s*```$/g, '')
  const tryParse = (t) => { try { return JSON.parse(t) } catch { return null } }
  let json = tryParse(raw)
  if (json) return { json, repaired: false }
  json = tryParse(raw.replace(/,\s*\{"paragraphs2?":(?:\[\]|null)\}(?:\[0\])?\s*,/g, ','))
  if (json) return { json, repaired: 'token' }
  // Every `{"paragraphs"` start, scanned to its balanced end (a missing brace in a first attempt would otherwise swallow
  // the corrected second one); trailing commas cut; the last candidate that parses wins.
  const starts = (re) => [...raw.matchAll(re)].map((m) => m.index).reverse()
  for (const start of [...starts(/\{"paragraphs":\s*\[/g), ...starts(/\{"sentences":\s*\[/g)]) {
    let end = raw.length, depth = 0
    for (let i = start, str = false; i < raw.length; i++) {
      const ch = raw[i]
      if (str) { if (ch === '\\') i++; else if (ch === '"') str = false; continue }
      if (ch === '"') str = true
      else if (ch === '{') depth++
      else if (ch === '}' && --depth === 0) { end = i + 1; break }
    }
    // Opus 5 dropped the last `}` on 3 of 40 drafts (stop_reason end_turn): close what is open.
    json = tryParse(raw.slice(start, end).replace(/,\s*([\]}])/g, '$1') + '}'.repeat(Math.max(0, depth)))
    if (json?.paragraphs || json?.sentences) return { json, repaired: 'last-object' }
  }
  return { json: null, repaired: false }
}

let key = null
/**
 * One Messages API call, cached by id (a cached answer costs nothing and is not logged again). `thinking` disabled,
 * system block marked for caching (moot under 1 024 tokens, harmless). Stops at the cap before sending.
 */
export async function claude({ id, model = 'sonnet', system, user, max_tokens = 1200 }) {
  const hit = cached(id)
  if (hit && hit.status === 200) {
    if (hit.text) { const p = parseJson(hit.text); if (JSON.stringify(p.json) !== JSON.stringify(hit.json)) { hit.json = p.json; hit.repaired = p.repaired; store(id, hit) } } // the parser may have learnt since
    if (hit.json) return hit
  }
  if (spent() >= CAP_USD) throw new Error(`spend cap ${CAP_USD} $ reached (${spent().toFixed(3)} $)`)
  if (!key) { key = keyOrNull('ANTHROPIC_API_KEY'); if (!key) throw new Error('no key') }
  const m = MODELS[model]
  const body = { model: m.id, max_tokens, thinking: { type: 'disabled' }, system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: user }] }
  const t0 = performance.now()
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const text = await r.text()
  if (r.status === 401 || r.status === 403) { console.error(`ANTHROPIC_API_KEY rejected: HTTP ${r.status}`); process.exit(2) }
  let res; try { res = JSON.parse(text) } catch { res = { raw: text } }
  const u = res.usage ?? {}
  const inTok = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)
  const usd = ((u.input_tokens ?? 0) * m.input + (u.cache_creation_input_tokens ?? 0) * m.input * 1.25 + (u.cache_read_input_tokens ?? 0) * m.input * 0.1 + (u.output_tokens ?? 0) * m.output) / 1e6
  const out = { id, model: m.id, status: r.status, ms: Math.round(performance.now() - t0), at: new Date().toISOString(), usage: res.usage ?? null, usd, stop: res.stop_reason ?? null, text: res.content?.map((c) => c.text ?? '').join('') ?? null, error: res.error ?? (r.ok ? null : res) }
  Object.assign(out, parseJson(out.text))
  store(id, out)
  if (r.status === 200) {
    const total = logCall({ id, model: m.id, input: inTok, output: u.output_tokens ?? 0, cents: +(100 * usd).toFixed(3), usd, ms: out.ms, at: out.at })
    console.log(`  ${id}: ${inTok} in · ${u.output_tokens ?? 0} out · ${(100 * usd).toFixed(2)} ¢ · ${out.ms} ms · total ${total.toFixed(3)} $${out.json ? '' : ' · NO JSON (' + out.stop + ')'}`)
  } else console.log(`  ${id}: HTTP ${r.status} ${JSON.stringify(out.error).slice(0, 200)}`)
  return out
}
