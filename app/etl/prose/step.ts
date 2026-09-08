// The prose step (handoff 0028): for each taxon of a region with ≥ 3 full lines, skip when `inputHash` is unchanged,
// draft de + en (+ eco when ≥ 3 eco lines), validate (F4), audit each, store `Taxon.prose` with `judged`. With the
// `files` driver a taxon whose answers are missing is pending, counted, not an error; a run dir remembers its region so
// `prose --load --run <name>` can rebuild the same sheets without one.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Prisma } from '../../src/generated/prisma/client'
import { regionByName } from '../content'
import { db } from '../db'
import { storeRegionalProse } from './store'
import { ApiDriver, FilesDriver, RUNS, type Driver, type Job } from './driver'
import { loadTaxa, type ProseTaxon } from './load'
import { MODEL, PER_AGENT, VARIANTS, auditPrompt, userPrompt, type Variant } from './prompts'
import { MIN_LINES, inputHash, sheetsFor, type Lang, type Line, type Sheets } from './sheet'
import { missingTemplates, validate, publicationProblems, type Audit, type Draft, type Verdict } from './validate'
import { parseProseForRegion, type Prose, type ProseFact, type ProseText } from '../../src/server/prose'
export type { Prose, ProseFact, ProseText }

export type ProseOpts = { region?: string; run?: string; driver?: 'files' | 'api'; keys?: number[]; load?: boolean; log?: (s: string) => void }
export type ProseResult = {
  taxa: number
  /** Taxa whose `inputHash` is unchanged (already written from these sheets). */
  skipped: number
  /** Taxa with < 3 full lines: no text. */
  thin: number
  /** Prompt files (re)written this run. */
  written: number
  /** Taxa with a draft or audit still missing, or a draft that failed validation. */
  pending: number
  /** Drafts and audits that did not validate (their prompt is pending again). */
  invalid: number
  /** Taxa stored. */
  loaded: number
  /** Eco jobs whose sheet holds a line kind without an F5 template (parasiteOf). */
  noTemplate: number
  /** Edges that entered a sheet without studies (fetched before 0028): F2 never fired on them. */
  unfetched: number
  /** Prompt files waiting for an answer, for the coordinator's subagent batches (five per agent, drafts and audits apart). */
  batches: { drafts: string[][]; audits: string[][] }
  seconds: number
}

// What `Taxon.prose` holds (handoff 0028 §🗄️): the shape of src/server/prose.ts, whose `parseProse` is the reader. The
// full sheet and the eco sheet each number their own lines (F1…), so the cites stay as the model wrote them and resolve
// against `facts[lang]` for de/en and `ecoFacts[lang]` for eco.de/eco.en; `ecoFacts` is null when there is no eco text.
export const runSlug = (region: string) => region.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-')
const runMeta = (run: string) => join(RUNS, run, 'run.json')
const batches = (files: string[]) => Array.from({ length: Math.ceil(files.length / PER_AGENT) }, (_, i) => files.slice(i * PER_AGENT, (i + 1) * PER_AGENT))

export async function runProse(opts: ProseOpts): Promise<ProseResult> {
  const log = opts.log ?? console.log
  const t0 = Date.now()
  // `--load` reads the region from the run dir; `--region` names it and writes the run dir.
  let region: string
  let run = opts.run
  if (opts.load) {
    if (!run) throw new Error('prose --load needs --run <name>')
    if (!existsSync(runMeta(run))) throw new Error(`no run "${run}" under etl/prose/runs/ (run prose --region first)`)
    region = (JSON.parse(readFileSync(runMeta(run), 'utf8')) as { region: string }).region
  } else {
    if (!opts.region) throw new Error('prose needs --region <name> (or --load --run <name>)')
    region = (await regionByName(opts.region)).name
    run ??= runSlug(region)
    mkdirSync(join(RUNS, run), { recursive: true })
    writeFileSync(runMeta(run), JSON.stringify({ region, at: new Date().toISOString() }, null, 2) + '\n')
  }
  const regionRow = await regionByName(region)
  const driver: Driver = opts.driver === 'api' ? new ApiDriver() : new FilesDriver(run!, !opts.load)
  // `--load`: only the taxa whose answers are in the run dir.
  const keys = opts.load ? [...new Set(readdirSync(join(RUNS, run!, 'answers')).map((f) => Number(f.split('-')[0])).filter(Number.isFinite))] : opts.keys
  const taxa = await loadTaxa({ regionId: regionRow.id, keys })
  const r: ProseResult = { taxa: taxa.length, skipped: 0, thin: 0, written: 0, pending: 0, invalid: 0, loaded: 0, noTemplate: 0, unfetched: 0, batches: { drafts: [], audits: [] }, seconds: 0 }
  log(`prose: ${taxa.length} taxa of ${region} · driver ${driver.name} · run ${run}`)
  for (const t of taxa) {
    const sheets = sheetsFor(t, region)
    const hash = inputHash(sheets)
    r.unfetched += sheets.de.unfetched
    if (parseProseForRegion(t.prose, regionRow.id)?.inputHash === hash) { r.skipped++; continue }
    if (sheets.de.full.length < MIN_LINES) { r.thin++; continue }
    const out = await proseFor(t, sheets, region, driver, (s) => log(`  · ${t.sciName}: ${s}`))
    r.invalid += out.invalid
    r.noTemplate += out.noTemplate
    if (!out.prose) { r.pending++; continue }
    await storeRegionalProse(db, t.id, regionRow.id, { ...out.prose, inputHash: hash })
    r.loaded++
  }
  if (driver instanceof FilesDriver) {
    r.written = driver.written.length
    r.batches = { drafts: batches(driver.pending.drafts), audits: batches(driver.pending.audits) }
  }
  r.seconds = (Date.now() - t0) / 1000
  return r
}

type Text = { lang: Lang; variant: Variant; lines: Line[] }

/** One taxon through the driver: the prose to store, or null while a draft or an audit is missing or invalid. */
export async function proseFor(t: ProseTaxon, sheets: Sheets, region: string, driver: Driver, log: (s: string) => void): Promise<{ prose: Omit<Prose, 'inputHash'> | null; invalid: number; noTemplate: number }> {
  const texts: Text[] = [{ lang: 'de', variant: 'full', lines: sheets.de.full }, { lang: 'en', variant: 'full', lines: sheets.en.full }]
  if (sheets.de.eco.length >= MIN_LINES) texts.push({ lang: 'de', variant: 'eco', lines: sheets.de.eco }, { lang: 'en', variant: 'eco', lines: sheets.en.eco })
  let invalid = 0, noTemplate = 0, complete = true
  const drafts = new Map<Text, Draft>(), audits = new Map<Text, Audit>()
  for (const x of texts) {
    const V = VARIANTS[x.variant]
    const system = V.system(region)
    if (x.variant === 'eco' && missingTemplates(system, x.lines).length) { noTemplate++; invalid++; complete = false; log(`${x.lang} eco: missing direction template; publication blocked`); continue }
    const job: Job = { gbifKey: t.gbifKey, lang: x.lang, variant: x.variant, system, user: userPrompt(t.sciName, t.commonNames, x.lang, region, x.lines), maxTokens: V.maxTokens }
    const a = await driver.draft(job)
    if (!a) { complete = false; continue }
    const problems = a.json ? validate(a.json, x.lines, V) : ['no JSON']
    if (problems.length) { invalid++; complete = false; log(`${x.lang}${x.variant === 'eco' ? ' eco' : ''} draft invalid: ${problems.join('; ')}`); continue }
    drafts.set(x, a.json as unknown as Draft)
  }
  // The audits only over valid drafts; a taxon is stored when every text has both.
  for (const [x, d] of drafts) {
    const V = VARIANTS[x.variant]
    const sentences = d.paragraphs.flatMap((p) => p.sentences)
    const job: Job = { gbifKey: t.gbifKey, lang: x.lang, variant: x.variant, system: V.audit, user: auditPrompt(x.lines, sentences), maxTokens: 2000 }
    const a = await driver.audit(job)
    if (!a) { complete = false; continue }
    const problems = a.json ? publicationProblems(a.json, sentences.length) : ['no JSON']
    if (problems.length) { invalid++; complete = false; log(`${x.lang}${x.variant === 'eco' ? ' eco' : ''} audit invalid: ${problems.join('; ')}`); continue }
    audits.set(x, a.json as unknown as Audit)
  }
  if (!complete) return { prose: null, invalid, noTemplate }
  return { prose: assemble(sheets, [...drafts].map(([x, draft]) => ({ lang: x.lang, variant: x.variant, draft, audit: audits.get(x)! }))), invalid, noTemplate }
}

export type Written = { lang: Lang; variant: Variant; draft: Draft; audit: Audit }
/** The stored object from the sheets and the validated drafts with their audits: text and cites verbatim, `judged` summed over every audit. */
export function assemble(sheets: Sheets, written: Written[], at = new Date().toISOString()): Omit<Prose, 'inputHash'> {
  const text = (lang: Lang, variant: Variant): ProseText | null => {
    const w = written.find((x) => x.lang === lang && x.variant === variant)
    return w ? { paragraphs: w.draft.paragraphs.map((p) => ({ sentences: p.sentences.map((s) => ({ text: s.text, cites: [...s.cites] })) })) } : null
  }
  const facts = (variant: Variant): Record<Lang, ProseFact[]> => ({ de: sheets.de[variant].map(fact), en: sheets.en[variant].map(fact) })
  const judged: Record<Verdict, number> = { supported: 0, partial: 0, unsupported: 0 }
  for (const w of written) for (const s of w.audit.sentences) judged[s.verdict]++
  return {
    de: text('de', 'full'), en: text('en', 'full'),
    eco: { de: text('de', 'eco'), en: text('en', 'eco') },
    facts: facts('full'), ecoFacts: written.some((w) => w.variant === 'eco') ? facts('eco') : null,
    model: MODEL, judged, at,
  }
}
const fact = (l: Line): ProseFact => ({ id: l.id, source: l.source, text: l.text })

/** `prose --purge [--region <name>]`: `Taxon.prose` back to null; the run dirs stay. */
export async function purgeProse(region?: string): Promise<number> {
  if (region) {
    const id = (await regionByName(region)).id
    return db.$executeRaw`UPDATE "Taxon" SET prose = prose #- ARRAY['regions', ${id}]::text[] WHERE prose->>'version' = '1' AND prose->'regions' ? ${id}`
  }
  const { count } = await db.taxon.updateMany({ where: { prose: { not: Prisma.DbNull } }, data: { prose: Prisma.DbNull } })
  return count
}
