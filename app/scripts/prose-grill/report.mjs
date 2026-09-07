// Step 3 of the prose grill (0026; re-grill 0027): the numbers behind the findings from results.json (0027, subagent
// answers) next to 0026's results.json (git, e58e14e), the F1–F4 counts from sheets.json, the hand read from marks.json,
// the subagent count and wall time per run, and drafts.md with every text marked sentence by sentence (cites, ⚠️ partial,
// ❌ unsupported, 🟠 orphan claims, 🙈 hand mark). No API calls, no dollars.
// Run from app/: node scripts/prose-grill/report.mjs
import { join } from 'node:path'
import { existsSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { HERE, PER_AGENT, MODEL, readJson, md } from './common.mjs'

const now = readJson(join(HERE, 'results.json'))
const { sheets, table: sheetTable } = readJson(join(HERE, 'sheets.json'))
const marks = existsSync(join(HERE, 'marks.json')) ? readJson(join(HERE, 'marks.json')) : {}
const OLD_AT = 'e58e14e'
const old = JSON.parse(execFileSync('git', ['show', `${OLD_AT}:app/scripts/prose-grill/results.json`], { cwd: HERE, maxBuffer: 256 << 20 }))
const R = Object.values(now.runs)
const O = Object.values(old.runs)
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '—')
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN }
const words = (r) => (r.draft?.paragraphs ?? []).flatMap((p) => p.sentences ?? []).map((s) => s.text ?? '').join(' ').split(/\s+/).filter(Boolean).length
const INSECTS = new Set(Object.keys(sheets).filter((n) => sheets[n].tile === 'insect' && !['Lycaena phlaeas', 'Zoropsis spinimana', 'Lucanus cervus'].includes(n)))

/** The measures of a set of runs: validator, judge, claims, words. */
function measure(rs) {
  const audited = rs.filter((r) => r.audit)
  const S = audited.flatMap((r) => r.audit)
  const C = S.flatMap((s) => s.claims ?? [])
  const n = S.length, sup = S.filter((s) => s.verdict === 'supported').length, par = S.filter((s) => s.verdict === 'partial').length, uns = S.filter((s) => s.verdict === 'unsupported').length
  const orphans = C.filter((c) => !c.fact).length
  return { runs: rs.length, valid: rs.filter((r) => !r.problems.length).length, species: new Set(rs.map((r) => r.sciName)).size, sentences: n, sup, par, uns, supPct: (100 * sup) / n, parPct: (100 * par) / n, unsPct: (100 * uns) / n, claims: C.length, orphans, orphans100: (100 * orphans) / C.length, words: median(rs.map(words)), unsRuns: audited.filter((r) => r.audit.some((s) => s.verdict === 'unsupported')).length, repaired: rs.filter((r) => r.repaired).length, auditRepaired: rs.filter((r) => r.auditRepaired).length }
}
const row = (label, m) => [label, `${m.valid} / ${m.runs}`, m.sentences, `${m.sup} (${f1(m.supPct)} %)`, `${m.par} (${f1(m.parPct)} %)`, `**${m.uns} (${f1(m.unsPct)} %)**`, `${m.unsRuns} / ${m.runs}`, m.claims, `${m.orphans} (${f1(m.orphans100)} / 100)`, m.words, `${m.repaired} / ${m.auditRepaired}`]
const HEAD = ['run', 'validator ✓', 'sentences', 'supported', 'partial', 'unsupported', 'texts with ❌', 'claims', 'orphans', 'words (median)', 'JSON repaired draft / audit']
const splits = [['de', (r) => r.lang === 'de'], ['en', (r) => r.lang === 'en'], ['0019 ten', (r) => !INSECTS.has(r.sciName)], ['insects', (r) => INSECTS.has(r.sciName)]]
const sel = (rs, variant, f = () => true) => rs.filter((r) => r.variant === variant && r.model === 'sonnet' && f(r))

/** Subagents (nominal: ⌈prompts / 5⌉ per stage) and wall time per run from the file times; retries are counted by hand in the findings. */
function stage(run) {
  const rs = R.filter((r) => r.variant === { P1: 'V1', P2: 'ECO', P3: 'ECO2' }[run])
  const t0 = now.stages?.[`${run} prompts`]
  const dEnd = rs.map((r) => r.draftAt).filter(Boolean).sort().at(-1)
  const aStart = rs.map((r) => r.auditAt).filter(Boolean).sort()[0], aEnd = rs.map((r) => r.auditAt).filter(Boolean).sort().at(-1)
  const mins = (a, b) => (a && b ? ((new Date(b) - new Date(a)) / 60000).toFixed(1) : '—')
  const audited = rs.filter((r) => r.audit).length
  return [run, rs.length, Math.ceil(rs.length / PER_AGENT), mins(t0, dEnd), audited, Math.ceil(audited / PER_AGENT), mins(aStart, aEnd), mins(t0, aEnd)]
}

const out = []
out.push(`# 📊 0027 prose re-grill · report\n\nModel ${MODEL} as Claude Code subagents (\`model: "sonnet"\`), ${PER_AGENT} prompts per agent, drafts and audits in separate agents. 0026 columns from \`${OLD_AT}\` (API, Sonnet 5). No dollars: no API call was made.\n`)

// F1–F4
out.push(`## 🔧 F1–F4 · edges per species\n`)
out.push(`\`full\` = the V1 sheet's GloBI lines (all DB edges of the species), \`eco\` = the ECO sheet's candidates (named partner, in-set or ≥ 2 records, 0026's rule). F1 = eats/eatenBy whose studies are all metawebs (Reji Chacko trophiCH, Maiorano TETRA-EU). F2 = ≤ 1 real record from ≤ 1 real study. "eco kept" = after the cap of 8; in brackets 0026's kept count.\n`)
out.push(sheetTable)
const zero = Object.entries(sheets).filter(([, s]) => s.zeroRecords).map(([n, s]) => `${n} ${s.zeroRecords}`).join(', ')
const tot = (k, r) => Object.values(sheets).reduce((s, x) => s + x.counts[k][r], 0)
out.push(`\nTotals: DB edges ${tot('full', 'before')} · full −F1 ${tot('full', 'F1')} −F2 ${tot('full', 'F2')} → ${tot('full', 'after')} · eco candidates ${tot('eco', 'before')} −F1 ${tot('eco', 'F1')} −F2 ${tot('eco', 'F2')} → ${tot('eco', 'after')}. F2 drops with 0 GloBI records (the DB edge is not in GloBI's answer for the pair): ${zero || 'none'}. F3 and F4 are prompt and validator rules; their effect is the ❌ classification and the validator column below.`)

// P2'
const eco = sel(R, 'ECO'), ecoOld = sel(O, 'ECO')
out.push(`\n## 🌿 P2' · Ökologie paragraph, ${eco.length / 2} species × de + en (0026: ${ecoOld.length / 2} species)\n`)
const eco2 = sel(R, 'ECO2')
out.push(md(HEAD, [row("ECO 0027 (P2')", measure(eco)), ...(eco2.length ? [row("ECO2 0027 (P3, F5 direction)", measure(eco2))] : []), row('ECO 0026', measure(ecoOld)), ...splits.flatMap(([l, f]) => [row(`0027 ${l}`, measure(sel(R, 'ECO', f))), ...(eco2.length ? [row(`0027 F5 ${l}`, measure(sel(R, 'ECO2', f)))] : []), row(`0026 ${l}`, measure(sel(O, 'ECO', f)))])]))
for (const [pre, label] of [['ECO-', "P2'"], ['ECO2-', 'P3 (F5 direction)']]) {
const handRead = Object.entries(marks).filter(([k]) => k.startsWith(pre) && now.runs[k])
if (handRead.length) {
  const emb = handRead.reduce((s, [, m]) => s + (m.embarrassing ?? []).length, 0)
  const odd = handRead.reduce((s, [, m]) => s + (m.odd ?? []).length, 0)
  const total = handRead.reduce((s, [k]) => s + (now.runs[k].audit?.length ?? 0), 0)
  out.push(`\n### 👓 ${label} hand read · ${handRead.length} paragraphs, ${total} sentences · 🙈 embarrassing **${emb}** · 🤔 odd ${odd}\n`)
  out.push(md(['species · lang', '🙈 embarrassing', '🤔 odd', 'note'], handRead.map(([k, m]) => { const r = now.runs[k]; return [`${r.names?.de ?? r.sciName} · ${r.lang}`, (m.embarrassing ?? []).map((n) => `s${n}`).join(', ') || '—', (m.odd ?? []).map((n) => `s${n}`).join(', ') || '—', m.note ?? ''] })))
}
}

// P1'
const v1 = sel(R, 'V1'), v1Old = sel(O, 'V1')
out.push(`\n## ✍️ P1' · V1 closed world, ${v1.length / 2} species × de + en\n`)
out.push(md(HEAD, [row("V1 0027 (P1')", measure(v1)), row('V1 0026', measure(v1Old)), ...splits.flatMap(([l, f]) => [row(`0027 ${l}`, measure(sel(R, 'V1', f))), row(`0026 ${l}`, measure(sel(O, 'V1', f)))])]))
const bad = R.filter((r) => r.audit?.some((s) => s.verdict === 'unsupported')).flatMap((r) => r.audit.map((s, i) => ({ r, s, i })).filter(({ s }) => s.verdict === 'unsupported'))
out.push(`\n### ❌ every unsupported sentence, both runs (${bad.length})\n`)
out.push(md(['run', 'species · lang', 's', 'text', 'judge'], bad.map(({ r, s, i }) => [r.variant, `${r.names?.de ?? r.sciName} · ${r.lang}`, i + 1, (r.draft.paragraphs.flatMap((p) => p.sentences)[i]?.text ?? '').replace(/\|/g, '/'), (s.why ?? '').replace(/\|/g, '/')])))
const failed = R.filter((r) => r.problems.length)
out.push(`\n### validator failures (${failed.length})\n`)
out.push(failed.length ? md(['run', 'species · lang', 'problems'], failed.map((r) => [r.variant, `${r.names?.de ?? r.sciName} · ${r.lang}`, r.problems.join('; ')])) : 'none')

// Subagents and wall time
out.push(`\n## ⏱️ Subagents and wall time (nominal ⌈n / ${PER_AGENT}⌉; retries in the findings)\n`)
out.push(md(['run', 'drafts', 'draft agents', 'draft wall min', 'audits', 'audit agents', 'audit wall min', 'prompts → last audit min'], [stage('P2'), stage('P1'), stage('P3')]))

// The plan instead of P4
const perSpecies = 2, auditPer = 2
const taxa = 2414, region = 300
const agents = (n) => Math.ceil((n * perSpecies) / PER_AGENT) + Math.ceil((n * auditPer) / PER_AGENT)
out.push(`\n## 📈 The production run on the plan (was P4)\n`)
out.push(md(['scope', 'taxa', 'drafts (de+en)', 'audits', 'subagents (5 each)', 'subagent minutes at 1 min each'], [['one region', region, region * 2, region * 2, agents(region), agents(region)], ['Neon today', taxa, taxa * 2, taxa * 2, agents(taxa), agents(taxa)], ['rewrite 20 % / year', Math.round(taxa * 0.2), Math.round(taxa * 0.2) * 2, Math.round(taxa * 0.2) * 2, agents(Math.round(taxa * 0.2)), agents(Math.round(taxa * 0.2))]]))
writeFileSync(join(HERE, 'report.md'), out.join('\n') + '\n')
console.log(out.join('\n'))

// drafts.md: every text, marked.
const mark = (v) => (v === 'unsupported' ? ' ❌' : v === 'partial' ? ' ⚠️' : '')
const D = [`# ✍️ drafts · 0027 prose re-grill\n\nEvery draft, sentence by sentence: \`[F3,F7]\` cited lines · ⚠️ audit "partial" · ❌ audit "unsupported" · 🟠 orphan claim (no line states it) · 🙈 hand mark (would embarrass the app) · 🤔 hand mark (odd, not wrong). Draft and audit: ${MODEL} subagents. Region ${now.region}.\n`]
for (const variant of ['ECO', 'ECO2', 'V1']) {
  D.push(`\n## ${variant} (${{ ECO: "P2'", ECO2: 'P3 · F5 direction', V1: "P1'" }[variant]})\n`)
  for (const sciName of Object.keys(sheets)) for (const lang of ['de', 'en']) {
    const r = R.find((x) => x.variant === variant && x.sciName === sciName && x.lang === lang)
    if (!r) continue
    const key = `${variant}-sonnet-${sheets[sciName].gbifKey}-${lang}`
    const hm = marks[key] ?? {}
    D.push(`### ${sheets[sciName].names?.de ?? sciName} · *${sciName}* · ${lang} (${sheets[sciName].tile}, ${r.lines} lines) · validator ${r.problems.length ? '✗ ' + r.problems.join('; ') : '✓'}${r.audit ? ` · judge ${r.audit.map((s) => (s.verdict ?? '?')[0]).join('')} · orphans ${r.audit.flatMap((s) => s.claims ?? []).filter((c) => !c.fact).length}` : ''}`)
    if (!r.draft?.paragraphs) { D.push(`> (no draft)\n`); continue }
    let n = 0
    const notes = []
    D.push(r.draft.paragraphs.map((p) => '> ' + (p.sentences ?? []).map((s) => { n++; const a = r.audit?.[n - 1]; const orph = (a?.claims ?? []).filter((c) => !c.fact); if (a && a.verdict !== 'supported') notes.push(`- s${n} ${a.verdict}: ${a.why}`); if (orph.length) notes.push(`- s${n} 🟠 ${orph.map((c) => c.claim).join(' · ')}`); const e = (hm.embarrassing ?? []).includes(n), o = (hm.odd ?? []).includes(n); if (e || o) notes.push(`- s${n} ${e ? '🙈' : '🤔'} ${hm.note ?? ''}`); return `${s.text} [${(s.cites ?? []).join(',')}]${mark(a?.verdict)}${orph.length ? ' 🟠' : ''}${e ? ' 🙈' : ''}${o ? ' 🤔' : ''}` }).join(' ')).join('\n>\n'))
    if (notes.length) D.push(notes.join('\n'))
    D.push('')
  }
}
writeFileSync(join(HERE, 'drafts.md'), D.join('\n'))
console.log(`drafts.md: ${R.length} drafts`)
