// Step 3 of the prose grill (0026): the numbers behind the findings from results.json and grill.json, and drafts.md with
// every text marked sentence by sentence (cites, ⚠️ partial, ❌ unsupported, 🟠 orphan claims, 🙈 hand mark from
// marks.json). Prints the P1–P4 tables as markdown to report.md. No API calls.
// Run from app/: node scripts/prose-grill/report.mjs
import { join } from 'node:path'
import { existsSync, writeFileSync } from 'node:fs'
import { HERE, MODELS, BATCH_DISCOUNT, readJson, md, pct, grill } from './common.mjs'

const { runs, p3Variant, region } = readJson(join(HERE, 'results.json'))
const { sheets } = readJson(join(HERE, 'sheets.json'))
const marks = existsSync(join(HERE, 'marks.json')) ? readJson(join(HERE, 'marks.json')) : {}
const R = Object.values(runs)
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '—')
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '—')
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN }
const words = (r) => (r.draft?.paragraphs ?? []).flatMap((p) => p.sentences ?? []).map((s) => s.text ?? '').join(' ').split(/\s+/).filter(Boolean).length
const INSECTS = new Set(Object.keys(sheets).filter((n) => sheets[n].tile === 'insect' && !['Lycaena phlaeas', 'Zoropsis spinimana', 'Lucanus cervus'].includes(n)))

/** The measures of a set of runs: validator, judge, claims, cost per species (draft + audit, de + en). */
function measure(rs) {
  const audited = rs.filter((r) => r.audit)
  const S = audited.flatMap((r) => r.audit)
  const C = S.flatMap((s) => s.claims ?? [])
  const n = S.length, sup = S.filter((s) => s.verdict === 'supported').length, par = S.filter((s) => s.verdict === 'partial').length, uns = S.filter((s) => s.verdict === 'unsupported').length
  const orphans = C.filter((c) => !c.fact).length
  const species = new Set(rs.map((r) => r.sciName)).size
  const usd = rs.reduce((s, r) => s + r.usd + (r.auditCall?.usd ?? 0), 0)
  const draftUsd = rs.reduce((s, r) => s + r.usd, 0)
  return { runs: rs.length, valid: rs.filter((r) => !r.problems.length).length, species, sentences: n, sup, par, uns, supPct: (100 * sup) / n, parPct: (100 * par) / n, unsPct: (100 * uns) / n, claims: C.length, orphans, orphans100: (100 * orphans) / C.length, words: median(rs.map(words)), centsPerSpecies: (100 * usd) / species, draftCentsPerSpecies: (100 * draftUsd) / species, unsRuns: audited.filter((r) => r.audit.some((s) => s.verdict === 'unsupported')).length }
}
const row = (label, m) => [label, `${m.valid} / ${m.runs}`, m.sentences, `${m.sup} (${f1(m.supPct)} %)`, `${m.par} (${f1(m.parPct)} %)`, `**${m.uns} (${f1(m.unsPct)} %)**`, `${m.unsRuns} / ${m.runs}`, m.claims, `${m.orphans} (${f1(m.orphans100)} / 100)`, m.words, f1(m.centsPerSpecies)]
const HEAD = ['run', 'validator ✓', 'sentences', 'supported', 'partial', 'unsupported', 'texts with ❌', 'claims', 'orphans', 'words (median)', '¢ / species de+en+audit']

const out = []
out.push(`## P1 · Sonnet 5, three variants, 20 species × de + en\n`)
out.push(md(HEAD, ['V0', 'V1', 'V2'].map((v) => row(v, measure(R.filter((r) => r.variant === v && r.model === 'sonnet'))))))
out.push(`\n### P1 by language and by the 0019 ten vs the ten insects\n`)
out.push(md(HEAD, ['V0', 'V1', 'V2'].flatMap((v) => [['de', (r) => r.lang === 'de'], ['en', (r) => r.lang === 'en'], ['0019 ten', (r) => !INSECTS.has(r.sciName)], ['insects', (r) => INSECTS.has(r.sciName)]].map(([l, f]) => row(`${v} ${l}`, measure(R.filter((r) => r.variant === v && r.model === 'sonnet' && f(r))))))))
const eco = R.filter((r) => r.variant === 'ECO')
out.push(`\n## P2 · Ökologie paragraph, Sonnet 5, ${new Set(eco.map((r) => r.sciName)).size} species with ≥ 3 lines × de + en\n`)
out.push(md(HEAD, [row('ECO', measure(eco)), row('ECO de', measure(eco.filter((r) => r.lang === 'de'))), row('ECO en', measure(eco.filter((r) => r.lang === 'en'))), row('ECO insects', measure(eco.filter((r) => INSECTS.has(r.sciName)))), row('ECO 0019 ten', measure(eco.filter((r) => !INSECTS.has(r.sciName))))]))
const handRead = Object.entries(marks).filter(([k]) => k.startsWith('ECO-'))
if (handRead.length) {
  out.push(`\n### P2 hand read (${handRead.length} paragraphs)\n`)
  out.push(md(['species · lang', 'embarrassing sentences', 'note'], handRead.map(([k, m]) => { const r = runs[k]; return [`${r.names?.de ?? r.sciName} · ${r.lang}`, (m.embarrassing ?? []).length ? (m.embarrassing ?? []).map((n) => `s${n}`).join(', ') : '—', m.note ?? ''] })))
  out.push(`\nEmbarrassing sentences in the hand read: **${handRead.reduce((s, [, m]) => s + (m.embarrassing ?? []).length, 0)}** of ${handRead.reduce((s, [k]) => s + (runs[k].audit?.length ?? 0), 0)} sentences.`)
}
out.push(`\n## P3 · variant ${p3Variant ?? '?'} on three models, 20 species × de + en\n`)
const modelsRun = [...new Set(R.filter((r) => r.variant === p3Variant).map((r) => r.model))]
out.push(md(HEAD, modelsRun.map((m) => row(MODELS[m].id, measure(R.filter((r) => r.variant === p3Variant && r.model === m))))))
out.push(`\nAudit is Sonnet 5 on every model; "¢ / species" holds the draft on the model plus the Sonnet audit.`)
out.push(`\n### P3 median tokens and latency per draft\n`)
out.push(md(['model', 'input tokens', 'output tokens', 'ms', '¢ per draft', 'stop_reason ≠ end_turn'], modelsRun.map((m) => { const rs = R.filter((r) => r.variant === p3Variant && r.model === m); return [MODELS[m].id, median(rs.map((r) => r.usage?.input_tokens ?? 0)), median(rs.map((r) => r.usage?.output_tokens ?? 0)), median(rs.map((r) => r.ms)), f2(100 * median(rs.map((r) => r.usd))), rs.filter((r) => r.stop && r.stop !== 'end_turn').length] })))

// P4: cost at scale for every (variant, model) pair that ran, batch discount applied.
out.push(`\n## P4 · cost at scale (Batches API −${100 * BATCH_DISCOUNT} % on draft and audit)\n`)
const pairs = [...new Set(R.map((r) => `${r.variant}|${r.model}`))].map((s) => s.split('|'))
out.push(md(['variant · model', '¢ / species (API)', '¢ / species (Batches)', '2 414 taxa (Neon)', 'one region ≈ 300', 'rewrite 20 % / year of 2 414'], pairs.map(([v, m]) => { const c = measure(R.filter((r) => r.variant === v && r.model === m)).centsPerSpecies; const b = c * (1 - BATCH_DISCOUNT); return [`${v} · ${MODELS[m].id}`, f1(c), f1(b), `${(b * 2414 / 100).toFixed(2)} $`, `${(b * 300 / 100).toFixed(2)} $`, `${(b * 2414 * 0.2 / 100).toFixed(2)} $`] })))

// Spend
const g = grill()
out.push(`\n## 💸 Spend · ${g.calls.length} paid calls · **${g.total.toFixed(3)} $** of the ${g.cap} $ cap\n`)
const byModel = {}
for (const c of g.calls) { const k = `${c.model} · ${c.id.startsWith('audit') ? 'audit' : 'draft'}`; const b = (byModel[k] ??= { n: 0, input: 0, output: 0, usd: 0 }); b.n++; b.input += c.input; b.output += c.output; b.usd += c.usd }
out.push(md(['model · call', 'calls', 'input tokens', 'output tokens', '$'], Object.entries(byModel).map(([k, b]) => [k, b.n, b.input, b.output, b.usd.toFixed(3)])))
writeFileSync(join(HERE, 'report.md'), out.join('\n') + '\n')
console.log(out.join('\n'))

// drafts.md: every text, marked.
const mark = (v) => (v === 'unsupported' ? ' ❌' : v === 'partial' ? ' ⚠️' : '')
const D = [`# ✍️ drafts · 0026 prose grill\n\nEvery draft, sentence by sentence: \`[F3,F7]\` cited lines · ⚠️ audit "partial" · ❌ audit "unsupported" · 🟠 orphan claim (no line states it) · 🙈 hand mark (would embarrass the app). Audit = Sonnet 5. Region ${region}.\n`]
const order = ['V0', 'V1', 'V2', 'ECO']
for (const variant of order) for (const model of [...new Set(R.filter((r) => r.variant === variant).map((r) => r.model))]) {
  D.push(`\n## ${variant} · ${MODELS[model].id}\n`)
  for (const sciName of Object.keys(sheets)) for (const lang of ['de', 'en']) {
    const r = R.find((x) => x.variant === variant && x.model === model && x.sciName === sciName && x.lang === lang)
    if (!r) continue
    const key = `${variant}-${model}-${sheets[sciName].gbifKey}-${lang}`
    const hm = marks[key] ?? {}
    D.push(`### ${sheets[sciName].names?.de ?? sciName} · *${sciName}* · ${lang} (${sheets[sciName].tile}, ${r.lines} lines) · validator ${r.problems.length ? '✗ ' + r.problems.join('; ') : '✓'} · ${(100 * r.usd).toFixed(2)} ¢${r.audit ? ` · judge ${r.audit.map((s) => (s.verdict ?? '?')[0]).join('')} · orphans ${r.audit.flatMap((s) => s.claims ?? []).filter((c) => !c.fact).length}` : ''}`)
    if (!r.draft?.paragraphs) { D.push(`> (no draft: ${r.stop ?? 'no JSON'})\n`); continue }
    let n = 0
    const notes = []
    D.push(r.draft.paragraphs.map((p) => '> ' + (p.sentences ?? []).map((s) => { n++; const a = r.audit?.[n - 1]; const orph = (a?.claims ?? []).filter((c) => !c.fact); if (a && a.verdict !== 'supported') notes.push(`- s${n} ${a.verdict}: ${a.why}`); if (orph.length) notes.push(`- s${n} 🟠 ${orph.map((c) => c.claim).join(' · ')}`); if ((hm.embarrassing ?? []).includes(n)) notes.push(`- s${n} 🙈 ${hm.note ?? ''}`); return `${s.text} [${(s.cites ?? []).join(',')}]${mark(a?.verdict)}${orph.length ? ' 🟠' : ''}${(hm.embarrassing ?? []).includes(n) ? ' 🙈' : ''}` }).join(' ')).join('\n>\n'))
    if (notes.length) D.push(notes.join('\n'))
    D.push('')
  }
}
writeFileSync(join(HERE, 'drafts.md'), D.join('\n'))
console.log(`drafts.md: ${R.length} drafts`)
