// Step 2 of the prose grill (0026): drafts per variant × model × species × language from sheets.json, the 0019
// validator, and one audit call per draft (Sonnet 5 always) that judges every sentence as in 0019 and lists its atomic
// claims with the fact line behind each, so the orphan count (claims no line states) comes from the same reading.
//   P1  Sonnet 5 · V0 (0019's prompt verbatim) · V1 (closed world) · V2 (extractive) · 20 species · de + en
//   P2  Sonnet 5 · ECO (one Ökologie paragraph from the hard-filtered sheet) · species with ≥ 3 eco lines · de + en
//   P3  Opus 5 and Haiku 4.5 · the P1 variant with the lowest unsupported rate (or --variant) · 20 · de + en
// Every answer is cached under .cache/ (a rerun is free); every paid call lands in grill.json; the 8 $ cap stops the run.
// Run from app/: node scripts/prose-grill/prose.mjs [P1|P2|P3|all] [--variant V1] [--variants V1,V2] [--only 'Turdus merula'] [--concurrency 3]
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { HERE, REGION, claude, readJson, writeJson, spent } from './common.mjs'

const args = process.argv.slice(2)
const PART = args.find((a) => /^(P1|P2|P3|all)$/.test(a)) ?? 'all'
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const CONC = Number(opt('--concurrency', 3))
const { sheets } = readJson(join(HERE, 'sheets.json'))
const RESULTS = join(HERE, 'results.json')
const results = existsSync(RESULTS) ? readJson(RESULTS) : { at: null, region: REGION, prompts: {}, runs: {} }

const JSON_SHAPE = `Answer with JSON only:
{"paragraphs":[{"sentences":[{"text":"<one sentence>","cites":["F3","F7"]}, ...]}, {"sentences":[...]}]}`

// V0: the 0019 prompt, verbatim (steckbrief-probe/prose.mjs:17-32), on today's sheet. The baseline moved?
const V0 = `You are the editor of a small nature atlas for people who walk in their own Landkreis. You write the "Steckbrief" text of one species page.

Hard rules:
1. Write ONLY from the numbered facts you are given. No outside knowledge, no Wikipedia, nothing you "know" about the species. If the facts do not say it, you do not say it.
2. Every sentence cites at least one fact id it rests on. A sentence that rests on nothing is not allowed. Do not invent ids.
3. Facts can be noisy database rows. Leave out a fact that is implausible or contradicts biology as the other facts describe it (for example a plant listed as "eating" animals, or an interaction partner from another continent). Prefer partners that carry a German name; they are the ones the reader can meet.
4. Numbers keep their unit. If a value's unit is unclear (the sheet says so), leave it out. Round sensibly for a reader (102.7 g → "rund 100 g").
5. Two paragraphs, together at most 140 words. Paragraph one: what the reader can see, how big, when and where in ${REGION} (use the month profile of ${REGION}; the other regions only if ${REGION} is missing). Paragraph two: how it lives: food, partners, reproduction, lifespan, status. Plain, warm, precise. No headings, no bullet points, no "according to the data".
6. Do not repeat the species' names in every sentence. No emoji.

${JSON_SHAPE}`

// V1: the closed world. The model is told it knows nothing; a claim without a line is a defect; no appearance words.
const V1 = `You write the "Steckbrief" text of one species page in a small nature atlas for people who walk in their own Landkreis.

The closed world:
1. You know nothing about this species beyond the numbered fact lines you are given. Not its colour, shape, pattern, size, sound, behaviour, habitat, history or reputation. If no line says it, it is not true for this text, even when you are sure of it.
2. Every sentence cites the ids of the lines it rests on, and every claim in the sentence must be found in one of those lines. A claim without a line behind it is a defect.
3. No adjectives of appearance or character ("striking", "shy", "small", "black", "typical", "well known", "common"). No inference: a diet word "omnivore" does not become "feeds on worms and berries"; a partner list does not become "important food plant"; a month profile becomes "most reports in …" and says nothing about breeding, hibernation, flight periods or migration unless a line does.
4. GloBI lines are records of single interactions, not habits. Write them as observations ("wurde beim Fressen von X beobachtet", "has been recorded eating X"), name at most four partners per sentence, prefer partners with a common name, and leave out a partner that contradicts biology as the other lines describe it.
5. Numbers keep their unit as given; round for the reader, never convert.
6. When the sheet is thin, the text is short. Two sentences are a complete text. Never fill.
7. Two paragraphs, together at most 140 words. First: what a walker meets — group, size, status, when in ${REGION} (the month line of ${REGION}; other regions only if it is missing). Second: how it lives — food, partners, reproduction, lifespan. Plain, warm, precise. No headings, bullets or emoji, no "according to the data". Do not repeat the species name in every sentence.
8. Write in the language of the sheet. Names stay as the sheet gives them; do not translate a partner name.

${JSON_SHAPE}`

// V2: extraction. Every sentence rewrites one or two lines; the model may join, reorder, drop, shorten — never add.
const V2 = `You turn a numbered fact sheet into readable sentences for a species page. This is extraction, not writing.

1. Every sentence is a rewrite of exactly one or two fact lines. You may join two lines into one sentence, reorder lines, leave lines out, and shorten a list to its first four names. You may not add content: no adjective, no cause, no "therefore", no "typical", no season or habitat word the line does not contain, no unit conversion, no inference from a code word.
2. Each sentence cites the one or two ids it rewrites, nothing else.
3. A line you cannot rewrite without adding content is left out. A sheet with three usable lines gives three sentences.
4. GloBI lines become record sentences: "Als Nahrung verzeichnet sind …", "Verzeichnet als Fressfeinde: …" / "Recorded food plants include …", "Recorded predators include …".
5. Two paragraphs: the taxon, names, status, size and the month profile of ${REGION} first; food, partners, reproduction, lifespan second. At most 8 sentences and 120 words in total. Plain language, no headings, bullets or emoji.
6. Write in the language of the sheet; names stay as given.

${JSON_SHAPE}`

// ECO: one paragraph "Ökologie" from the hard-filtered sheet, closed world.
const ECO = `You write the paragraph "Ökologie" / "Ecology" of one species page in a small nature atlas: what the species eats, who eats it, whose flowers it visits or pollinates, what it hosts, and the diet, habitat and activity words the sheet holds — from the numbered lines only.

1. You know nothing about this species beyond the lines. A claim without a line behind it is a defect. No adjectives of appearance or character, no "important", "main", "typical", "preferred", "often" unless a line says so.
2. GloBI lines are records ("n GloBI-Belege"), not habits: write them as observations ("wurde beim Fressen von X beobachtet", "als Fressfeind verzeichnet ist Y" / "has been recorded eating X", "Y is recorded as a predator"). Name a partner as the sheet names it. You may leave a partner out when it contradicts biology as the other lines describe it; you may not add one.
3. Every sentence cites the ids it rests on; every claim in it must be in one of those lines.
4. One paragraph, at most 5 sentences and 90 words. The diet, habitat and activity lines may open it; the month line may say when in ${REGION} the reader meets the species, nothing more. Plain, warm, precise. No headings, bullets or emoji, no "according to the data".
5. Write in the language of the sheet.

Answer with JSON only:
{"paragraphs":[{"sentences":[{"text":"<one sentence>","cites":["F1","F4"]}, ...]}]}`

// The audit: 0019's judge, sentence by sentence, plus the claim extractor in the same reading.
const AUDIT = `You audit a species text against the numbered fact lines it was written from. For every sentence give:
1. "verdict": "supported" (every claim in the sentence follows from the cited lines), "partial" (some claim goes beyond the cited lines or rests on an uncited line), "unsupported" (a claim that no line states, or that contradicts a line). Be strict: rounding is fine, a unit change is fine; an added adjective of colour, size, behaviour or place, a cause, a season, a habit or preference read out of a record, a "typical" or "important" is not.
2. "claims": every atomic claim in the sentence (one fact per claim, at most 12 words, in the language of the text), each with "fact": the id of the line that states it (any line, cited or not), or null when no line states it. Names and the region are not claims; "it is a bird" is a claim.
Answer with JSON only:
{"sentences":[{"n":1,"verdict":"supported|partial|unsupported","why":"<short; empty when supported>","claims":[{"claim":"<text>","fact":"F3"}, {"claim":"<text>","fact":null}]}]}`

export const VARIANTS = { V0: { system: V0, paragraphs: 2, words: 170, sheet: 'full' }, V1: { system: V1, paragraphs: 2, words: 170, sheet: 'full' }, V2: { system: V2, paragraphs: 2, words: 150, sheet: 'full' }, ECO: { system: ECO, paragraphs: 1, words: 110, sheet: 'eco' } }
results.prompts = { V0, V1, V2, ECO, AUDIT }

/** 0019's validator: every sentence cites, every cite exists, the paragraph count, a word cap. */
export function validate(draft, facts, { paragraphs, words }) {
  const ids = new Set(facts.map((f) => f.id)), problems = []
  const ps = draft?.paragraphs
  if (!Array.isArray(ps) || ps.length < 1) return ['no paragraphs']
  if (ps.length !== paragraphs) problems.push(`${ps.length} paragraphs, expected ${paragraphs}`)
  ps.forEach((p, i) => { if (!Array.isArray(p.sentences) || !p.sentences.length) problems.push(`p${i + 1}: no sentences`) })
  ps.forEach((p, i) => (p.sentences ?? []).forEach((s, j) => {
    if (!s.text?.trim()) problems.push(`p${i + 1}s${j + 1}: empty`)
    if (!Array.isArray(s.cites) || !s.cites.length) problems.push(`p${i + 1}s${j + 1}: no citation`)
    for (const c of s.cites ?? []) if (!ids.has(c)) problems.push(`p${i + 1}s${j + 1}: unknown id ${c}`)
  }))
  const n = ps.flatMap((p) => p.sentences ?? []).map((s) => s.text ?? '').join(' ').split(/\s+/).filter(Boolean).length
  if (n > words) problems.push(`${n} words`)
  return problems
}

const factsBlock = (lines) => lines.map((f) => `${f.id} [${f.source}] ${f.text}`).join('\n')

async function draftOne({ variant, model, sciName, lang }) {
  const sheet = sheets[sciName]
  const lines = sheet.sheets[lang][VARIANTS[variant].sheet]
  const key = `${variant}-${model}-${sheet.gbifKey}-${lang}`
  const user = `${lang === 'de' ? 'Sprache: Deutsch (kein Du; neutral oder ohne Anrede).' : 'Language: English.'}\n${lang === 'de' ? 'Art' : 'Species'}: ${sciName}${sheet.names?.[lang] ? ` (${sheet.names[lang]})` : ''}.\n${lang === 'de' ? 'Region des Lesers' : 'Region of the reader'}: ${REGION}.\n\n${lang === 'de' ? 'FAKTEN' : 'FACTS'}:\n${factsBlock(lines)}`
  const r = await claude({ id: `draft-${key}`, model, system: VARIANTS[variant].system, user, max_tokens: 1200 })
  const problems = r.json ? validate(r.json, lines, VARIANTS[variant]) : ['no JSON']
  let audit = null, auditCall = null
  if (r.json && !problems.some((p) => p.startsWith('no'))) {
    const sentences = r.json.paragraphs.flatMap((p) => p.sentences ?? [])
    const user2 = `FACTS:\n${factsBlock(lines)}\n\nTEXT (sentence n, cited ids, text):\n${sentences.map((s, i) => `${i + 1}. [${(s.cites ?? []).join(',')}] ${s.text}`).join('\n')}`
    const a = await claude({ id: `audit-${key}`, model: 'sonnet', system: AUDIT, user: user2, max_tokens: 2000 })
    audit = a.json?.sentences ?? null
    auditCall = { usd: a.usd, usage: a.usage, ms: a.ms, stop: a.stop }
  }
  const verdicts = audit ? audit.map((s) => (s.verdict ?? '?')[0]).join('') : '?'
  const orphans = audit ? audit.flatMap((s) => s.claims ?? []).filter((c) => !c.fact).length : null
  console.log(`${key}: ${problems.length ? '✗ ' + problems.join('; ') : '✓'} · judge ${verdicts} · orphans ${orphans ?? '?'} · ${(100 * (r.usd + (auditCall?.usd ?? 0))).toFixed(2)} ¢`)
  results.runs[key] = { variant, model, sciName, lang, tile: sheet.tile, names: sheet.names, lines: lines.length, draft: r.json, problems, audit, usage: r.usage, usd: r.usd, ms: r.ms, stop: r.stop, auditCall }
}

async function pool(jobs) {
  let i = 0
  const worker = async () => { while (i < jobs.length) { const j = jobs[i++]; await draftOne(j); results.at = new Date().toISOString(); writeJson(RESULTS, results) } }
  await Promise.all(Array.from({ length: Math.min(CONC, jobs.length) }, worker))
}
const twenty = Object.keys(sheets).filter((n) => !opt('--only', null) || n === opt('--only', null))
const cross = (variants, models, names) => variants.flatMap((variant) => models.flatMap((model) => names.flatMap((sciName) => ['de', 'en'].map((lang) => ({ variant, model, sciName, lang })))))
const unsupportedRate = (variant, model) => { const rs = Object.values(results.runs).filter((r) => r.variant === variant && r.model === model && r.audit); const all = rs.flatMap((r) => r.audit); return all.length ? all.filter((s) => s.verdict === 'unsupported').length / all.length : NaN }

const P1_VARIANTS = opt('--variants', 'V0,V1,V2').split(',')
if (PART === 'P1' || PART === 'all') await pool(cross(P1_VARIANTS, ['sonnet'], twenty))
if (PART === 'P2' || PART === 'all') await pool(cross(['ECO'], ['sonnet'], twenty.filter((n) => sheets[n].sheets.de.eco.length >= 3)))
if (PART === 'P3' || PART === 'all') {
  const best = opt('--variant', null) ?? ['V0', 'V1', 'V2'].map((v) => [v, unsupportedRate(v, 'sonnet')]).sort((a, b) => a[1] - b[1])[0][0]
  console.log(`P3 on variant ${best} (Sonnet unsupported: ${['V0', 'V1', 'V2'].map((v) => `${v} ${(100 * unsupportedRate(v, 'sonnet')).toFixed(1)} %`).join(' · ')})`)
  results.p3Variant = best
  await pool(cross([best], ['opus', 'haiku'], twenty))
}
results.at = new Date().toISOString()
writeJson(RESULTS, results)
console.log(`spent so far ${spent().toFixed(3)} $ (cap 8)`)
