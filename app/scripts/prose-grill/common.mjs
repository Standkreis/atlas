// Shared bits of the prose grill (0026; re-grill 0027): paths, the GloBI disk cache under scripts/prose-grill/.cache
// (git-ignored), the JSON repair for model answers, and the 0027 file protocol. No model API is called from here or
// anywhere in this folder (CLAUDE.md, 2026-09-07): a draft is a prompt file under prompts/<run>/<species>-<lang>.md that a
// Claude Code subagent answers into answers/<run>/<species>-<lang>.json; the audit of that draft is prompts/audit-<run>/…
// answered into answers/audit-<run>/…. 0026's API answers stay in .cache as evidence for the 0026 numbers only.
// Env handling, JSON helpers and the markdown table come from the 0019 probe (steckbrief-probe/lib.mjs), by import.
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { readJson, writeJson, md, DEV_DB, norm, pct } from '../steckbrief-probe/lib.mjs'

export { readJson, writeJson, md, DEV_DB, norm, pct }
export const HERE = new URL('.', import.meta.url).pathname
export const CACHE = join(HERE, '.cache')
mkdirSync(CACHE, { recursive: true })
export const PROMPTS = join(HERE, 'prompts')
export const ANSWERS = join(HERE, 'answers')
export const SESSION = '0027'
export const REGION = 'Mainz-Bingen'
/** The model every prompt names; subagents are spawned with `model: "sonnet"`, which is this model on the plan. */
export const MODEL = 'claude-sonnet-5'
/** Prompts per subagent (the brief: five, drafts and audits never in the same agent). */
export const PER_AGENT = 5

export const cachePath = (name) => join(CACHE, name)
export const cached = (key) => { const f = cachePath(key + '.json'); return existsSync(f) ? readJson(f) : null }
export const store = (key, v) => writeJson(cachePath(key + '.json'), v)
export const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12)

/** GET JSON with cache keyed by URL hash (GloBI only). */
export async function getJson(url) {
  const key = 'http-' + sha(url)
  const hit = cached(key)
  if (hit) return hit.data
  const r = await fetch(url, { headers: { 'user-agent': 'standkreis-dex/0027-prose-grill (https://github.com/svreiser/standkreis-dex; svreiser@gmail.com)' } })
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`)
  const data = await r.json()
  store(key, { url, at: new Date().toISOString(), data })
  return data
}

// ── the file protocol ────────────────────────────────────────────────────────────────────────────────────────────
export const slug = (sciName) => sciName.replace(/\s+/g, '-')
export const promptFile = (run, sciName, lang) => join(PROMPTS, run, `${slug(sciName)}-${lang}.md`)
export const answerFile = (run, sciName, lang) => join(ANSWERS, run, `${slug(sciName)}-${lang}.json`)
export const rel = (f) => f.replace(HERE, '')
/** The answer file read and repaired: `{ text, json, repaired, at }` or null when it is not there yet. */
export function readAnswer(file) {
  if (!existsSync(file)) return null
  const text = readFileSync(file, 'utf8')
  return { ...parseJson(text), text, at: statSync(file).mtime.toISOString() }
}

/**
 * The answer as JSON. Sonnet 5 without thinking stumbled (0026) on the two-paragraph shape in ~1 of 6 drafts: a stray
 * `{"paragraphs":[]}[0],` between the paragraphs, or a broken first attempt followed by "Wait, ich korrigiere das
 * Format:" and a complete second JSON. The sentences are intact, so: whole text → stray token cut out → the last
 * balanced top-level object that parses (unclosed braces closed). `repaired` says which path was taken; a build must expect this.
 */
export function parseJson(text) {
  const r = parseRaw(text)
  // 0027 F4: Sonnet's stray `{"paragraphs":[]}` (or null) often lands *inside* the array, valid JSON, so the validator saw
  // three paragraphs and an empty second one (6 of the 7 V1 failures in 0026). Elements without sentences go.
  if (Array.isArray(r.json?.paragraphs) && r.json.paragraphs.some((p) => !Array.isArray(p?.sentences)) && r.json.paragraphs.some((p) => Array.isArray(p?.sentences))) {
    r.json = { ...r.json, paragraphs: r.json.paragraphs.filter((p) => Array.isArray(p?.sentences)) }
    r.repaired = r.repaired ? `${r.repaired}+stray-paragraph` : 'stray-paragraph'
  }
  return r
}
function parseRaw(text) {
  const raw = (text ?? '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
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
