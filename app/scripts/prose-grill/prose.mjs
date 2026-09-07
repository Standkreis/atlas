// Step 2 of the prose grill (0026; re-grill 0027): the prompts per variant × species × language from sheets.json, the
// 0019 validator, and the audit prompt per draft. No API (CLAUDE.md): the model is a Claude Code subagent on the plan.
//   prompts P2   ECO on the eco sheet, species with ≥ 3 eco lines, de + en → prompts/P2/<species>-<lang>.md
//   prompts P1   V1 (closed world) on the full sheet, all 20, de + en → prompts/P1/…
//   collect P2   reads answers/P2/…json, validates (F4: one paragraph is fine), writes prompts/audit-P2/… for every
//                valid draft, reads answers/audit-P2/…json where present → results.json
// The coordinator spawns subagents (five prompts each, drafts and audits never in the same agent) between the two steps.
// 0027: F3 the judge grants the record words a GloBI line carries; verdict first, `why` ≤ 25 words, never re-argued;
// F4 the validator takes one paragraph. V0, V2 and P3 (Opus, Haiku) are not rerun; their prompts stay for the record.
// Run from app/: node scripts/prose-grill/prose.mjs prompts|collect P1|P2 [--only 'Turdus merula']
import { join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { HERE, REGION, MODEL, PER_AGENT, promptFile, answerFile, readAnswer, rel, readJson, writeJson } from './common.mjs'

const args = process.argv.slice(2)
const STEP = args.find((a) => /^(prompts|collect)$/.test(a))
const RUN = args.find((a) => /^(P1|P2|P3)$/.test(a))
if (!STEP || !RUN) { console.error('usage: prose.mjs prompts|collect P1|P2|P3'); process.exit(1) }
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const { sheets } = readJson(join(HERE, 'sheets.json'))
const RESULTS = join(HERE, 'results.json')
const results = existsSync(RESULTS) ? readJson(RESULTS) : { at: null, session: '0027', region: REGION, model: MODEL, prompts: {}, runs: {}, stages: {} }

const JSON_SHAPE = `Answer with JSON only:
{"paragraphs":[{"sentences":[{"text":"<one sentence>","cites":["F3","F7"]}, ...]}, {"sentences":[...]}]}`

// V0: the 0019 prompt, verbatim (steckbrief-probe/prose.mjs:17-32). Not rerun in 0027; kept as the baseline text.
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
// 0027 F3: rule 4 names the record wording the judge grants (beobachtet / verzeichnet / recorded), the same list as AUDIT 2.
const V1 = `You write the "Steckbrief" text of one species page in a small nature atlas for people who walk in their own Landkreis.

The closed world:
1. You know nothing about this species beyond the numbered fact lines you are given. Not its colour, shape, pattern, size, sound, behaviour, habitat, history or reputation. If no line says it, it is not true for this text, even when you are sure of it.
2. Every sentence cites the ids of the lines it rests on, and every claim in the sentence must be found in one of those lines. A claim without a line behind it is a defect.
3. No adjectives of appearance or character ("striking", "shy", "small", "black", "typical", "well known", "common"). No inference: a diet word "omnivore" does not become "feeds on worms and berries"; a partner list does not become "important food plant"; a month profile becomes "most reports in …" and says nothing about breeding, hibernation, flight periods or migration unless a line does.
4. GloBI lines are records of observed interactions, not habits. Write them as records: "wurde beim Fressen von X beobachtet", "als Fressfeind verzeichnet ist Y" / "has been recorded eating X", "Y is recorded as a predator". Name at most four partners per sentence, prefer partners with a common name, name a partner as the sheet names it, and leave out a partner that contradicts biology as the other lines describe it. Do not add a life stage (Raupe, larva, adult) or a frequency the line does not carry.
5. Numbers keep their unit as given; round for the reader, never convert.
6. When the sheet is thin, the text is short. Two sentences are a complete text. One paragraph is a complete text. Never fill.
7. At most two paragraphs, together at most 140 words. First: what a walker meets — group, size, status, when in ${REGION} (the month line of ${REGION}; other regions only if it is missing). Second: how it lives — food, partners, reproduction, lifespan. Plain, warm, precise. No headings, bullets or emoji, no "according to the data". Do not repeat the species name in every sentence.
8. Write in the language of the sheet. Names stay as the sheet gives them; do not translate a partner name.

${JSON_SHAPE}`

// V2: extraction. Not rerun in 0027.
const V2 = `You turn a numbered fact sheet into readable sentences for a species page. This is extraction, not writing.

1. Every sentence is a rewrite of exactly one or two fact lines. You may join two lines into one sentence, reorder lines, leave lines out, and shorten a list to its first four names. You may not add content: no adjective, no cause, no "therefore", no "typical", no season or habitat word the line does not contain, no unit conversion, no inference from a code word.
2. Each sentence cites the one or two ids it rewrites, nothing else.
3. A line you cannot rewrite without adding content is left out. A sheet with three usable lines gives three sentences.
4. GloBI lines become record sentences: "Als Nahrung verzeichnet sind …", "Verzeichnet als Fressfeinde: …" / "Recorded food plants include …", "Recorded predators include …".
5. Two paragraphs: the taxon, names, status, size and the month profile of ${REGION} first; food, partners, reproduction, lifespan second. At most 8 sentences and 120 words in total. Plain language, no headings, bullets or emoji.
6. Write in the language of the sheet; names stay as given.

${JSON_SHAPE}`

// ECO: one paragraph "Ökologie" from the hard-filtered sheet, closed world. 0027 F3: rule 2 names the record wording.
const ECO = `You write the paragraph "Ökologie" / "Ecology" of one species page in a small nature atlas: what the species eats, who eats it, whose flowers it visits or pollinates, what it hosts, and the diet, habitat and activity words the sheet holds — from the numbered lines only.

1. You know nothing about this species beyond the lines. A claim without a line behind it is a defect. No adjectives of appearance or character, no "important", "main", "typical", "preferred", "often" unless a line says so.
2. GloBI lines are records of observed interactions ("n GloBI-Belege" / "n GloBI records"), not habits: write them as records ("wurde beim Fressen von X beobachtet", "als Fressfeind verzeichnet ist Y" / "has been recorded eating X", "Y is recorded as a predator"). Name a partner as the sheet names it. You may leave a partner out when it contradicts biology as the other lines describe it; you may not add one. Do not add a life stage (Raupe, larva, adult) or a frequency the line does not carry.
3. Every sentence cites the ids it rests on; every claim in it must be in one of those lines.
4. One paragraph, at most 5 sentences and 90 words. The diet, habitat and activity lines may open it; the month line may say when in ${REGION} the reader meets the species, nothing more. Plain, warm, precise. No headings, bullets or emoji, no "according to the data".
5. Write in the language of the sheet.

Answer with JSON only:
{"paragraphs":[{"sentences":[{"text":"<one sentence>","cites":["F1","F4"]}, ...]}]}`

// The audit: 0019's judge, sentence by sentence, plus the claim extractor in the same reading. 0027 F3: a GloBI line
// grants the words that only restate the record ("beobachtet", "verzeichnet", "Fressfeind", "predator"); the species'
// own name and group word are not claims. Verdict first and final; `why` short and never against the verdict (0026 doubt 7).
const AUDIT = `You audit a species text against the numbered fact lines it was written from. For every sentence give:
1. "verdict": "supported" (every claim in the sentence follows from the cited lines), "partial" (some claim goes beyond the cited lines or rests on an uncited line), "unsupported" (a claim that no line states, or that contradicts a line). Be strict: rounding is fine, a unit change is fine; an added adjective of colour, size, behaviour or place, a cause, a season, a habit or preference read out of a record, a "typical" or "important" is not.
2. A GloBI line ("n GloBI-Belege" / "n GloBI records") is the record of an observed interaction. It grants every wording that only restates the record or names its kind: "beobachtet", "verzeichnet", "registriert", "nachgewiesen", "Fressfeind", "Beute", "Nahrung", "Wirt", "Blütenbesucher", "Bestäuber" / "observed", "recorded", "documented", "predator", "prey", "food", "host", "flower visitor", "pollinator". It does not grant a habit, a frequency, a life stage, a preference or a partner the line does not name. The species' own name and a plain group word for it (Falter, Vogel, Pilz / butterfly, bird, fungus) are not claims, like the region.
3. Decide the verdict first and keep it. "why" has at most 25 words, explains the verdict and never argues against it; if you notice while writing that the sentence is supported, the verdict is "supported".
4. "claims": every atomic claim in the sentence (one fact per claim, at most 12 words, in the language of the text), each with "fact": the id of the line that states it (any line, cited or not), or null when no line states it. Names, group words and the region are not claims; "it is nocturnal" is a claim.
Answer with JSON only, the verdict before anything else in each sentence:
{"sentences":[{"n":1,"verdict":"supported|partial|unsupported","why":"<≤ 25 words; empty when supported>","claims":[{"claim":"<text>","fact":"F3"}, {"claim":"<text>","fact":null}]}]}`

// P3 (0027 F5): the P2' hand read found two direction reversals in German ("Sie wurde beim Fressen von Tagpfauenauge
// beobachtet" for a "wird gefressen von" line; "Als Wirt verzeichnet sind <die Pilze>" for "Wirt von"), both scored supported.
// ECO2 = ECO with rule 2 giving one template per line kind, the species always the subject; AUDIT2 makes direction a claim.
const ECO2 = ECO.replace(/^2\. .*$/m, `2. GloBI lines are records of observed interactions ("n GloBI-Belege" / "n GloBI records"), not habits, and the species of the text is always the subject of the sentence. One template per line kind, keep the direction:
   - "frisst: X" / "eats: X" → "wurde beim Fressen von X beobachtet" / "has been recorded eating X"
   - "wird gefressen von: Y" / "is eaten by: Y" → "als Fressfeind ist Y verzeichnet" / "Y is recorded as a predator"
   - "Wirt von: Z" / "host of: Z" → "ist als Wirt von Z verzeichnet" / "is recorded as a host of Z"
   - "besucht Blüten von: P" / "visits flowers of: P" → "wurde beim Blütenbesuch an P beobachtet" / "has been recorded visiting the flowers of P"
   - "bestäubt: P" / "pollinates: P" → "ist als Bestäuber von P verzeichnet" / "is recorded as a pollinator of P"
   Never a sentence in which the partner takes the species' role (the plant eating the butterfly, the fungus hosting the tree). Name a partner as the sheet names it. You may leave a partner out when it contradicts biology as the other lines describe it; you may not add one. Do not add a life stage (Raupe, larva, adult) or a frequency the line does not carry.`)
const AUDIT2 = AUDIT.replace(/^3\. Decide/m, `3. Direction is a claim: "frisst: X" states the species eats X, "wird gefressen von: Y" states Y eats the species, "Wirt von: Z" states the species hosts Z, "besucht Blüten von: P" states the species visits P. A sentence whose grammar reverses who eats, hosts or visits whom ("Sie wurde beim Fressen von Y beobachtet" for an "is eaten by" line; "Als Wirt verzeichnet sind Z" for a "host of" line) contradicts the line: "unsupported", whatever the vocabulary.
4. Decide`).replace(/^4\. "claims"/m, '5. "claims"')

export const VARIANTS = { V0: { system: V0, paragraphs: 2, words: 170, sheet: 'full' }, V1: { system: V1, paragraphs: 2, words: 170, sheet: 'full' }, V2: { system: V2, paragraphs: 2, words: 150, sheet: 'full' }, ECO: { system: ECO, paragraphs: 1, words: 110, sheet: 'eco' }, ECO2: { system: ECO2, paragraphs: 1, words: 110, sheet: 'eco', audit: AUDIT2 } }
const RUNS = { P1: { variant: 'V1', pick: () => true }, P2: { variant: 'ECO', pick: (n) => sheets[n].sheets.de.eco.length >= 3 }, P3: { variant: 'ECO2', pick: (n) => sheets[n].sheets.de.eco.length >= 3 } }
results.prompts = { V0, V1, V2, ECO, ECO2, AUDIT, AUDIT2 }

/**
 * 0019's validator: every sentence cites, every cite exists, the paragraph count, a word cap. 0027 F4: one paragraph is
 * accepted whatever the sheet's size (`paragraphs` is a maximum). 0026's seven V1 failures give no line threshold: six were
 * the stray `{"paragraphs":[]}` element (now cut by parseJson), the seventh (Urtica dioica en) a real one-paragraph draft
 * on a 14-line sheet, the thickest of the seven; the thin sheets (6 and 8 lines) all passed. So N is not a number: any sheet.
 */
export function validate(draft, facts, { paragraphs, words }) {
  const ids = new Set(facts.map((f) => f.id)), problems = []
  const ps = draft?.paragraphs
  if (!Array.isArray(ps) || ps.length < 1) return ['no paragraphs']
  if (ps.length > paragraphs) problems.push(`${ps.length} paragraphs, expected ≤ ${paragraphs}`)
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
const userPrompt = (sciName, sheet, lang, lines) => `${lang === 'de' ? 'Sprache: Deutsch (kein Du; neutral oder ohne Anrede).' : 'Language: English.'}\n${lang === 'de' ? 'Art' : 'Species'}: ${sciName}${sheet.names?.[lang] ? ` (${sheet.names[lang]})` : ''}.\n${lang === 'de' ? 'Region des Lesers' : 'Region of the reader'}: ${REGION}.\n\n${lang === 'de' ? 'FAKTEN' : 'FACTS'}:\n${factsBlock(lines)}`

/** One self-contained prompt file: what the API call would have carried (model, max_tokens, system, user) plus where the answer goes. */
const promptDoc = ({ file, answer, system, user, max_tokens }) => `# ${rel(file)}

Model \`${MODEL}\`, thinking disabled, max_tokens ${max_tokens}. The answer is the JSON object the model would return, nothing else, written to \`${rel(answer)}\`.

## System

${system}

## User

${user}
`

const key = ({ variant, sciName, lang }) => `${variant}-sonnet-${sheets[sciName].gbifKey}-${lang}`
const jobs = () => {
  const { variant, pick } = RUNS[RUN]
  const only = opt('--only', null)
  return Object.keys(sheets).filter((n) => pick(n) && (!only || n === only)).flatMap((sciName) => ['de', 'en'].map((lang) => ({ variant, sciName, lang, sheet: sheets[sciName], lines: sheets[sciName].sheets[lang][VARIANTS[variant].sheet] })))
}
const batches = (files) => Array.from({ length: Math.ceil(files.length / PER_AGENT) }, (_, i) => files.slice(i * PER_AGENT, (i + 1) * PER_AGENT))

if (STEP === 'prompts') {
  const J = jobs()
  mkdirSync(join(HERE, 'prompts', RUN), { recursive: true })
  mkdirSync(join(HERE, 'answers', RUN), { recursive: true })
  for (const j of J) {
    const file = promptFile(RUN, j.sciName, j.lang), answer = answerFile(RUN, j.sciName, j.lang)
    writeFileSync(file, promptDoc({ file, answer, system: VARIANTS[j.variant].system, user: userPrompt(j.sciName, j.sheet, j.lang, j.lines), max_tokens: 1200 }))
    results.runs[key(j)] ??= { variant: j.variant, model: 'sonnet', sciName: j.sciName, lang: j.lang, tile: j.sheet.tile, names: j.sheet.names, lines: j.lines.length, prompt: rel(file), answer: rel(answer), draft: null, problems: ['no answer'], audit: null }
  }
  results.stages[`${RUN} prompts`] = new Date().toISOString()
  console.log(`${RUN}: ${J.length} prompts in prompts/${RUN}/ → ${batches(J).length} subagents of ≤ ${PER_AGENT}`)
  batches(J).forEach((b, i) => console.log(`  agent ${i + 1}: ${b.map((j) => rel(promptFile(RUN, j.sciName, j.lang))).join(' ')}`))
}

if (STEP === 'collect') {
  const J = jobs()
  const AUD = `audit-${RUN}`
  mkdirSync(join(HERE, 'prompts', AUD), { recursive: true })
  mkdirSync(join(HERE, 'answers', AUD), { recursive: true })
  let drafts = 0, valid = 0, audits = 0, newAudits = []
  for (const j of J) {
    const k = key(j)
    const r = results.runs[k]
    const a = readAnswer(answerFile(RUN, j.sciName, j.lang))
    if (!a) { r.draft = null; r.problems = ['no answer']; continue }
    drafts++
    r.draft = a.json; r.repaired = a.repaired ?? false; r.draftAt = a.at
    r.problems = a.json ? validate(a.json, j.lines, VARIANTS[j.variant]) : ['no JSON']
    if (!a.json || r.problems.some((p) => p.startsWith('no'))) { r.audit = null; continue }
    valid++
    const sentences = a.json.paragraphs.flatMap((p) => p.sentences ?? [])
    const user2 = `FACTS:\n${factsBlock(j.lines)}\n\nTEXT (sentence n, cited ids, text):\n${sentences.map((s, i) => `${i + 1}. [${(s.cites ?? []).join(',')}] ${s.text}`).join('\n')}`
    const file = promptFile(AUD, j.sciName, j.lang), answer = answerFile(AUD, j.sciName, j.lang)
    const doc = promptDoc({ file, answer, system: VARIANTS[j.variant].audit ?? AUDIT, user: user2, max_tokens: 2000 })
    if (!existsSync(file) || readFileSync(file, 'utf8') !== doc) { writeFileSync(file, doc); newAudits.push(file) }
    r.auditPrompt = rel(file); r.auditAnswer = rel(answer)
    const au = readAnswer(answer)
    r.audit = au?.json?.sentences ?? null
    r.auditRepaired = au?.repaired ?? false
    r.auditAt = au?.at ?? null
    if (r.audit) { audits++; if (r.audit.length !== sentences.length) r.problems.push(`audit has ${r.audit.length} sentences, draft ${sentences.length}`) }
    const verdicts = r.audit ? r.audit.map((s) => (s.verdict ?? '?')[0]).join('') : '—'
    console.log(`${k}: ${r.problems.length ? '✗ ' + r.problems.join('; ') : '✓'} · judge ${verdicts}`)
  }
  results.stages[`${RUN} drafts`] = drafts; results.stages[`${RUN} audits`] = audits
  const pending = J.filter((j) => existsSync(promptFile(AUD, j.sciName, j.lang)) && !existsSync(answerFile(AUD, j.sciName, j.lang))).map((j) => promptFile(AUD, j.sciName, j.lang))
  console.log(`${RUN}: ${drafts}/${J.length} answers · ${valid} valid · ${audits} audited · ${newAudits.length} audit prompts (re)written · ${pending.length} audits pending → ${batches(pending).length} subagents`)
  batches(pending).forEach((b, i) => console.log(`  agent ${i + 1}: ${b.map(rel).join(' ')}`))
}
results.at = new Date().toISOString()
writeJson(RESULTS, results)
