// The prompts (handoff 0028): V1 (Steckbrief, closed world), ECO2 (Ökologie, 0027 F5 templates) and AUDIT2 (verdict
// first, direction is a claim), verbatim from scripts/prose-grill/prose.mjs with the region as a parameter. The user
// prompt, the audit's user prompt and the self-contained prompt file are the grill's too.
import type { Lang, Line } from './sheet'

/** The model every prompt names; the coordinator spawns subagents with `model: "sonnet"`, which is this model on the plan. */
export const MODEL = 'claude-sonnet-5'
/** Prompts per subagent (the brief: five, drafts and audits never in the same agent). */
export const PER_AGENT = 5

const JSON_SHAPE = `Answer with JSON only:
{"paragraphs":[{"sentences":[{"text":"<one sentence>","cites":["F3","F7"]}, ...]}, {"sentences":[...]}]}`

// V1: the closed world. The model is told it knows nothing; a claim without a line is a defect; no appearance words.
// 0027 F3: rule 4 names the record wording the judge grants (beobachtet / verzeichnet / recorded), the same list as AUDIT 2.
export const V1 = (REGION: string) => `You write the "Steckbrief" text of one species page in a small nature atlas for people who walk in their own Landkreis.

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

// ECO: one paragraph "Ökologie" from the hard-filtered sheet, closed world. 0027 F3: rule 2 names the record wording.
const ECO = (REGION: string) => `You write the paragraph "Ökologie" / "Ecology" of one species page in a small nature atlas: what the species eats, who eats it, whose flowers it visits or pollinates, what it hosts, and the diet, habitat and activity words the sheet holds — from the numbered lines only.

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

/** 0027 F5: one template per line kind, the species always the subject. `parasiteOf` has none (the grill's sheets carried no such line; doubt in the 0028 A findings). */
export const F5_TEMPLATES: Record<string, string> = {
  eats: '"frisst: X" / "eats: X" → "wurde beim Fressen von X beobachtet" / "has been recorded eating X"',
  eatenBy: '"wird gefressen von: Y" / "is eaten by: Y" → "als Fressfeind ist Y verzeichnet" / "Y is recorded as a predator"',
  hostOf: '"Wirt von: Z" / "host of: Z" → "ist als Wirt von Z verzeichnet" / "is recorded as a host of Z"',
  visitsFlowersOf: '"besucht Blüten von: P" / "visits flowers of: P" → "wurde beim Blütenbesuch an P beobachtet" / "has been recorded visiting the flowers of P"',
  pollinates: '"bestäubt: P" / "pollinates: P" → "ist als Bestäuber von P verzeichnet" / "is recorded as a pollinator of P"',
  // 0028 A doubt 2: the grill never saw the kind; 9 Mainz-Bingen taxa carry it.
  parasiteOf: '"Parasit von: Z" / "parasite of: Z" → "ist als Parasit von Z verzeichnet" / "is recorded as a parasite of Z"',
}

// P3 (0027 F5): the P2' hand read found two direction reversals in German ("Sie wurde beim Fressen von Tagpfauenauge
// beobachtet" for a "wird gefressen von" line; "Als Wirt verzeichnet sind <die Pilze>" for "Wirt von"), both scored supported.
// ECO2 = ECO with rule 2 giving one template per line kind, the species always the subject; AUDIT2 makes direction a claim.
export const ECO2 = (REGION: string) => ECO(REGION).replace(/^2\. .*$/m, `2. GloBI lines are records of observed interactions ("n GloBI-Belege" / "n GloBI records"), not habits, and the species of the text is always the subject of the sentence. One template per line kind, keep the direction:
   - ${F5_TEMPLATES.eats}
   - ${F5_TEMPLATES.eatenBy}
   - ${F5_TEMPLATES.hostOf}
   - ${F5_TEMPLATES.visitsFlowersOf}
   - ${F5_TEMPLATES.pollinates}
   - ${F5_TEMPLATES.parasiteOf}
   Never a sentence in which the partner takes the species' role (the plant eating the butterfly, the fungus hosting the tree). Name a partner as the sheet names it. You may leave a partner out when it contradicts biology as the other lines describe it; you may not add one. Do not add a life stage (Raupe, larva, adult) or a frequency the line does not carry.`)
export const AUDIT2 = AUDIT.replace(/^3\. Decide/m, `3. Direction is a claim: "frisst: X" states the species eats X, "wird gefressen von: Y" states Y eats the species, "Wirt von: Z" states the species hosts Z, "besucht Blüten von: P" states the species visits P, "Parasit von: Z" states the species parasitises Z. A sentence whose grammar reverses who eats, hosts or visits whom ("Sie wurde beim Fressen von Y beobachtet" for an "is eaten by" line; "Als Wirt verzeichnet sind Z" for a "host of" line) contradicts the line: "unsupported", whatever the vocabulary.
4. Decide`).replace(/^4\. "claims"/m, '5. "claims"')

/** The two variants the step runs: the full sheet under V1 (≤ 2 paragraphs, 170 words), the eco sheet under ECO2 (1 paragraph, 110 words); both judged by AUDIT2. */
export const VARIANTS = {
  full: { system: V1, paragraphs: 2, words: 170, audit: AUDIT2, maxTokens: 1200 },
  eco: { system: ECO2, paragraphs: 1, words: 110, audit: AUDIT2, maxTokens: 1200 },
} as const
export type Variant = keyof typeof VARIANTS

export const factsBlock = (lines: Line[]) => lines.map((f) => `${f.id} [${f.source}] ${f.text}`).join('\n')
export const userPrompt = (sciName: string, names: Record<string, string>, lang: Lang, region: string, lines: Line[]) =>
  `${lang === 'de' ? 'Sprache: Deutsch (kein Du; neutral oder ohne Anrede).' : 'Language: English.'}\n${lang === 'de' ? 'Art' : 'Species'}: ${sciName}${names?.[lang] ? ` (${names[lang]})` : ''}.\n${lang === 'de' ? 'Region des Lesers' : 'Region of the reader'}: ${region}.\n\n${lang === 'de' ? 'FAKTEN' : 'FACTS'}:\n${factsBlock(lines)}`
export type Sentence = { text: string; cites: string[] }
export const auditPrompt = (lines: Line[], sentences: Sentence[]) => `FACTS:\n${factsBlock(lines)}\n\nTEXT (sentence n, cited ids, text):\n${sentences.map((s, i) => `${i + 1}. [${(s.cites ?? []).join(',')}] ${s.text}`).join('\n')}`

/** One self-contained prompt file: what the API call would have carried (model, max_tokens, system, user) plus where the answer goes. */
export const promptDoc = ({ file, answer, system, user, maxTokens }: { file: string; answer: string; system: string; user: string; maxTokens: number }) => `# ${file}

Model \`${MODEL}\`, thinking disabled, max_tokens ${maxTokens}. The answer is the JSON object the model would return, nothing else, written to \`${answer}\`.

## System

${system}

## User

${user}
`
