// The validators (handoff 0028): 0019's draft check with 0027 F4 (one paragraph is fine), the audit's shape, and the F5
// guard: an eco prompt carries one direction template per line kind (prompts.ts F5_TEMPLATES).
import { F5_TEMPLATES } from './prompts'
import type { Line } from './sheet'

export type Draft = { paragraphs: { sentences: { text: string; cites: string[] }[] }[] }
export type Verdict = 'supported' | 'partial' | 'unsupported'
export type Audit = { sentences: { n?: number; verdict: Verdict; why?: string; claims?: { claim: string; fact: string | null }[] }[] }

/**
 * 0019's validator: every sentence cites, every cite exists, the paragraph count, a word cap. 0027 F4: one paragraph is
 * accepted whatever the sheet's size (`paragraphs` is a maximum). 0026's seven V1 failures give no line threshold: six were
 * the stray `{"paragraphs":[]}` element (now cut by parseJson), the seventh (Urtica dioica en) a real one-paragraph draft
 * on a 14-line sheet, the thickest of the seven; the thin sheets (6 and 8 lines) all passed. So N is not a number: any sheet.
 */
export function validate(draft: unknown, facts: Line[], { paragraphs, words }: { paragraphs: number; words: number }): string[] {
  const ids = new Set(facts.map((f) => f.id)), problems: string[] = []
  const ps = (draft as Partial<Draft> | null)?.paragraphs
  if (!Array.isArray(ps) || ps.length < 1) return ['no paragraphs']
  if (ps.length > paragraphs) problems.push(`${ps.length} paragraphs, expected ≤ ${paragraphs}`)
  const texts: string[] = []
  ps.forEach((p, i) => {
    if (!p || !Array.isArray(p.sentences) || !p.sentences.length) { problems.push(`p${i + 1}: no sentences`); return }
    p.sentences.forEach((s, j) => {
      if (!s || typeof s.text !== 'string' || !s.text.trim()) problems.push(`p${i + 1}s${j + 1}: empty or invalid text`)
      else texts.push(s.text)
      if (!s || !Array.isArray(s.cites) || !s.cites.length) { problems.push(`p${i + 1}s${j + 1}: no citation`); return }
      for (const c of s.cites) if (typeof c !== 'string' || !ids.has(c)) problems.push(`p${i + 1}s${j + 1}: unknown citation`)
    })
  })
  const n = texts.join(' ').split(/\s+/).filter(Boolean).length
  if (n > words) problems.push(`${n} words`)
  return problems
}

export const VERDICTS: Verdict[] = ['supported', 'partial', 'unsupported']
/** The audit answers one verdict per sentence of the draft, in order. */
export function validateAudit(audit: unknown, sentences: number): string[] {
  const ss = (audit as Partial<Audit> | null)?.sentences
  if (!Array.isArray(ss)) return ['no sentences']
  const problems: string[] = []
  if (ss.length !== sentences) problems.push(`audit has ${ss.length} sentences, draft ${sentences}`)
  ss.forEach((s, i) => { if (!VERDICTS.includes(s?.verdict)) problems.push(`s${i + 1}: verdict ${JSON.stringify(s?.verdict ?? null)}`) })
  return problems
}

/** The line kinds an eco sheet holds that have no F5 template in the system prompt — must be empty for every eco job. */
export const missingTemplates = (system: string, lines: Line[]) => [...new Set(lines.map((l) => l.key).filter((k) => k.startsWith('globi.')).map((k) => k.slice(6)))].filter((kind) => !F5_TEMPLATES[kind] || !system.includes(F5_TEMPLATES[kind]))

/** Shape-valid audits may still reject publication. Partial claims need a corrected draft and a new audit. */
export function publicationProblems(audit: unknown, sentences: number): string[] {
  const problems = validateAudit(audit, sentences)
  if (problems.length) return problems
  return (audit as Audit).sentences.flatMap((sentence, i) => sentence.verdict === 'supported' ? [] : [`s${i + 1}: ${sentence.verdict}; revise and re-audit`])
}
