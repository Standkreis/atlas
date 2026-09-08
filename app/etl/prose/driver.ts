// The driver seam (handoff 0028): one interface, two implementations. `files` is the plan's file protocol from 0027:
// a draft is a prompt file under runs/<run>/prompts/<gbifKey>-<lang>[-eco].md that a Claude Code subagent answers into
// runs/<run>/answers/<same>.json; the audit of that draft is <same>-audit.md / .json. `api` is a seam only: it throws
// unless PROSE_API_KEY is set, and nothing in this milestone sets it, reads the app's ANTHROPIC_API_KEY, or imports the
// Anthropic SDK (CLAUDE.md "Never"). `parseJson` is common.mjs's repair (+ 0027 F4), ported.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, renameSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promptDoc } from './prompts'
import type { Lang } from './sheet'

export type Job = { gbifKey: number; lang: Lang; variant: 'full' | 'eco'; system: string; user: string; maxTokens: number }
export type Answer = { json: Json | null; repaired: string | false; at: string }
export type Json = Record<string, unknown>
export interface Driver {
  readonly name: 'files' | 'api'
  /** The draft for a job: the model's JSON, or null when it is not there yet (pending). */
  draft(job: Job): Promise<Answer | null>
  /** The audit of a draft, same shape and rule. */
  audit(job: Job): Promise<Answer | null>
}

export const RUNS = join(dirname(fileURLToPath(import.meta.url)), 'runs')
export const jobName = (j: Pick<Job, 'gbifKey' | 'lang' | 'variant'>, audit = false) => `${j.gbifKey}-${j.lang}${j.variant === 'eco' ? '-eco' : ''}${audit ? '-audit' : ''}`

/**
 * `files`: writes the prompt (only when its text changed, so mtimes mean something), reads the answer. `write: false`
 * (`prose --load`) reads only. `written` and `pending` are what the CLI prints for the coordinator's subagent batches.
 */
export class FilesDriver implements Driver {
  readonly name = 'files' as const
  readonly dir: string
  readonly written: string[] = []
  readonly pending: { drafts: string[]; audits: string[] } = { drafts: [], audits: [] }
  constructor(run: string, private readonly write = true, private readonly root = RUNS) {
    this.dir = join(root, run)
  }
  promptFile = (j: Job, audit = false) => join(this.dir, 'prompts', `${jobName(j, audit)}.md`)
  answerFile = (j: Job, audit = false) => join(this.dir, 'answers', `${jobName(j, audit)}.json`)
  draft(job: Job) { return this.exchange(job, false) }
  audit(job: Job) { return this.exchange(job, true) }
  private async exchange(job: Job, audit: boolean): Promise<Answer | null> {
    const file = this.promptFile(job, audit), answer = this.answerFile(job, audit)
    const rel = (f: string) => relative(this.root, f)
    const doc = promptDoc({ file: rel(file), answer: rel(answer), system: job.system, user: job.user, maxTokens: job.maxTokens })
    const matches = existsSync(file) && readFileSync(file, 'utf8') === doc
    if (this.write) {
      mkdirSync(dirname(file), { recursive: true })
      mkdirSync(dirname(answer), { recursive: true })
      if (!matches) {
        // An old supported audit is not evidence for a changed draft or fact sheet. Preserve it as a backup.
        if (existsSync(answer)) renameSync(answer, `${answer}.stale-${randomUUID()}`)
        writeFileSync(file, doc); this.written.push(rel(file))
      }
    }
    const a = (matches || this.write) && existsSync(answer) && existsSync(file) && statSync(answer).mtimeMs >= statSync(file).mtimeMs ? readAnswer(answer) : null
    if (!a) (audit ? this.pending.audits : this.pending.drafts).push(rel(file))
    return a
  }
}

/** The answer file read and repaired, or null when it is not there yet. */
export function readAnswer(file: string): Answer | null {
  if (!existsSync(file)) return null
  return { ...parseJson(readFileSync(file, 'utf8')), at: statSync(file).mtime.toISOString() }
}

/** `api`: the seam. Same interface; off unless the owner sets `PROSE_API_KEY` for it, and even then nothing in 0028 calls out. */
export class ApiDriver implements Driver {
  readonly name = 'api' as const
  constructor() {
    if (!process.env.PROSE_API_KEY) throw new Error('prose: the api driver is off (CLAUDE.md)')
  }
  draft(): Promise<Answer | null> { return Promise.reject(new Error('prose: the api driver is a seam in 0028; no code calls the API yet')) }
  audit(): Promise<Answer | null> { return this.draft() }
}

/**
 * The answer as JSON. Sonnet 5 without thinking stumbled (0026) on the two-paragraph shape in ~1 of 6 drafts: a stray
 * `{"paragraphs":[]}[0],` between the paragraphs, or a broken first attempt followed by "Wait, ich korrigiere das
 * Format:" and a complete second JSON. The sentences are intact, so: whole text → stray token cut out → the last
 * balanced top-level object that parses (unclosed braces closed). `repaired` says which path was taken; a build must expect this.
 */
export function parseJson(text: string): { json: Json | null; repaired: string | false } {
  const r = parseRaw(text)
  // 0027 F4: Sonnet's stray `{"paragraphs":[]}` (or null) often lands *inside* the array, valid JSON, so the validator saw
  // three paragraphs and an empty second one (6 of the 7 V1 failures in 0026). Elements without sentences go.
  const ps = r.json?.paragraphs
  if (Array.isArray(ps) && ps.some((p) => !Array.isArray(p?.sentences)) && ps.some((p) => Array.isArray(p?.sentences))) {
    r.json = { ...r.json, paragraphs: ps.filter((p) => Array.isArray(p?.sentences)) }
    r.repaired = r.repaired ? `${r.repaired}+stray-paragraph` : 'stray-paragraph'
  }
  return r
}
function parseRaw(text: string): { json: Json | null; repaired: string | false } {
  const raw = (text ?? '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  const tryParse = (t: string): Json | null => { try { return JSON.parse(t) } catch { return null } }
  let json = tryParse(raw)
  if (json) return { json, repaired: false }
  json = tryParse(raw.replace(/,\s*\{"paragraphs2?":(?:\[\]|null)\}(?:\[0\])?\s*,/g, ','))
  if (json) return { json, repaired: 'token' }
  // Every `{"paragraphs"` start, scanned to its balanced end (a missing brace in a first attempt would otherwise swallow
  // the corrected second one); trailing commas cut; the last candidate that parses wins.
  const starts = (re: RegExp) => [...raw.matchAll(re)].map((m) => m.index!).reverse()
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
