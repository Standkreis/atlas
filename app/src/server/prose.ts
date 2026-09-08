/**
 * `Taxon.prose` (handoff 0028 §🗄️): the generated Steckbrief and Ökologie paragraphs with the fact lines they cite.
 * Track B owns this file; Track A's writer imports the same type after the merge. Shared by the router and the page, so
 * it carries no server import.
 */

/** One numbered line of the fact sheet the model wrote from ("F5 [AmphiBIO] Nahrung: Gliederfüßer."). */
export type ProseFact = { id: string; source: string; text: string }
export type ProseSentence = { text: string; cites: string[] }
export type ProseText = { paragraphs: { sentences: ProseSentence[] }[] }
export type ProseJudged = { supported: number; partial: number; unsupported: number }
type Lang = 'de' | 'en'

export type Prose = {
  de: ProseText | null
  en: ProseText | null
  eco: { de: ProseText | null; en: ProseText | null }
  /**
   * The sheet's lines per language, so the ⓘ resolves after the facts change. The handoff writes `facts: Line[]`; the
   * sheet is bilingual (`sheets.mjs` writes `de.full` and `en.full`, different words), so `parseProse` accepts both a
   * flat list (used for both languages) and `{ de, en }`.
   */
  facts: Record<Lang, ProseFact[]>
  /** The eco sheet numbers its lines on its own (F1–F6 in 0027's prompts); null means the eco cites resolve against `facts`. */
  ecoFacts: Record<Lang, ProseFact[]> | null
  inputHash: string
  model: string
  judged: ProseJudged | null
  at: string
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v : null)

const parseText = (v: unknown): ProseText | null => {
  if (!isRecord(v) || !Array.isArray(v.paragraphs)) return null
  const paragraphs: ProseText['paragraphs'] = []
  for (const p of v.paragraphs) {
    if (!isRecord(p) || !Array.isArray(p.sentences)) return null
    const sentences: ProseSentence[] = []
    for (const s of p.sentences) {
      if (!isRecord(s) || typeof s.text !== 'string' || !Array.isArray(s.cites)) return null
      if (!s.cites.every((c) => typeof c === 'string')) return null
      sentences.push({ text: s.text, cites: s.cites as string[] })
    }
    if (sentences.length) paragraphs.push({ sentences })
  }
  return paragraphs.length ? { paragraphs } : null
}

const parseFacts = (v: unknown): ProseFact[] | null => {
  if (!Array.isArray(v)) return null
  const out: ProseFact[] = []
  for (const f of v) {
    if (!isRecord(f) || typeof f.id !== 'string' || typeof f.text !== 'string') return null
    out.push({ id: f.id, source: str(f.source) ?? '', text: f.text })
  }
  return out
}

const parseFactsByLang = (v: unknown): Record<Lang, ProseFact[]> | null => {
  const flat = parseFacts(v)
  if (flat) return { de: flat, en: flat }
  if (!isRecord(v)) return null
  const de = parseFacts(v.de), en = parseFacts(v.en)
  return de && en ? { de, en } : null
}

const parseJudged = (v: unknown): ProseJudged | null => {
  if (!isRecord(v)) return null
  const n = (k: string) => (typeof v[k] === 'number' && Number.isFinite(v[k]) ? (v[k] as number) : null)
  const supported = n('supported'), partial = n('partial'), unsupported = n('unsupported')
  return supported === null || partial === null || unsupported === null ? null : { supported, partial, unsupported }
}

/**
 * The guard between the column and the page. Null for anything that is not the 0028 shape: an old persisted query
 * without `prose`, a half-written row, a shape from a later migration. The species query is `meta.persist` (0025
 * lesson: a reader of a cached shape renders nothing, never throws).
 */
export function parseProse(v: unknown): Prose | null {
  if (!isRecord(v)) return null
  const de = parseText(v.de), en = parseText(v.en)
  const eco = isRecord(v.eco) ? { de: parseText(v.eco.de), en: parseText(v.eco.en) } : { de: null, en: null }
  const facts = parseFactsByLang(v.facts)
  if (!facts) return null
  if (!de && !en && !eco.de && !eco.en) return null
  return {
    de, en, eco, facts,
    ecoFacts: parseFactsByLang(v.ecoFacts),
    inputHash: str(v.inputHash) ?? '',
    model: str(v.model) ?? '',
    judged: parseJudged(v.judged),
    at: str(v.at) ?? '',
  }
}

/** The lines a text cites, in the order the prose first cites them, each once; an id the sheet no longer holds is skipped. */
export function citedFacts(text: ProseText, facts: ProseFact[]): ProseFact[] {
  const byId = new Map(facts.map((f) => [f.id, f]))
  const out: ProseFact[] = []
  const seen = new Set<string>()
  for (const p of text.paragraphs) for (const s of p.sentences) for (const id of s.cites) {
    const f = byId.get(id)
    if (f && !seen.has(id)) { seen.add(id); out.push(f) }
  }
  return out
}

/** Only a region-matched, publication-gated version may reach the reader. Legacy global prose must be reimported. */
export function parseProseForRegion(value: unknown, regionId?: string): Prose | null {
  if (!regionId || !isRecord(value) || value.version !== 1 || !isRecord(value.regions)) return null
  const prose = parseProse(value.regions[regionId])
  if (!prose?.judged || prose.judged.partial !== 0 || prose.judged.unsupported !== 0) return null
  const texts = [prose.de, prose.en, prose.eco.de, prose.eco.en]
  const count = texts.reduce((sum, text) => sum + (text?.paragraphs.reduce((n, p) => n + p.sentences.length, 0) ?? 0), 0)
  if (!count || prose.judged.supported !== count) return null
  for (const lang of ['de', 'en'] as const) for (const eco of [false, true]) {
    const text = eco ? prose.eco[lang] : prose[lang]
    const facts = new Set((eco ? (prose.ecoFacts ?? prose.facts) : prose.facts)[lang].map((f) => f.id))
    if (text?.paragraphs.some((p) => p.sentences.some((s) => !s.text.trim() || !s.cites.length || s.cites.some((id) => !facts.has(id))))) return null
  }
  return prose
}
