import { mkdtempSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ApiDriver, FilesDriver, jobName, parseJson, type Job } from './driver'
import { AUDIT2, ECO2, F5_TEMPLATES, V1, VARIANTS, auditPrompt, userPrompt } from './prompts'
import { missingTemplates, validate, validateAudit } from './validate'
import grill from '../../scripts/prose-grill/sheets.json'

const REGION = 'Mainz-Bingen'
const lines = [{ id: 'F1', key: 'diet', source: 'AmphiBIO', text: 'Nahrung: Gliederfüßer.' }, { id: 'F2', key: 'globi.eatenBy', source: 'GloBI', text: 'wird gefressen von: Barrenringelnatter (Natrix helvetica) — 10 GloBI-Belege.' }, { id: 'F3', key: 'months.Mainz-Bingen', source: 'GBIF occurrences', text: 'Region Mainz-Bingen: 48 Meldungen.' }]
const good = { paragraphs: [{ sentences: [{ text: 'Der Feuersalamander frisst Gliederfüßer.', cites: ['F1'] }, { text: 'Als Fressfeind ist die Barrenringelnatter verzeichnet.', cites: ['F2'] }] }] }

describe('parseJson (common.mjs port, 0026 shapes + 0027 F4)', () => {
  it('clean JSON, also fenced', () => {
    expect(parseJson(JSON.stringify(good))).toEqual({ json: good, repaired: false })
    expect(parseJson('```json\n' + JSON.stringify(good) + '\n```')).toEqual({ json: good, repaired: false })
  })
  it('the stray `{"paragraphs":[]}[0],` token between two paragraphs', () => {
    const two = { paragraphs: [good.paragraphs[0], { sentences: [{ text: 'Zweiter Absatz.', cites: ['F3'] }] }] }
    const text = JSON.stringify(two).replace('},{"sentences"', '},{"paragraphs":[]}[0],{"sentences"')
    expect(parseJson(text)).toEqual({ json: two, repaired: 'token' })
  })
  it('a broken first attempt, "Wait, ich korrigiere das Format:" and a complete second JSON → the last object that parses', () => {
    const text = `{"paragraphs":[{"sentences":[{"text":"kaputt","cites":["F1"]\n\nWait, ich korrigiere das Format:\n${JSON.stringify(good)}`
    expect(parseJson(text)).toEqual({ json: good, repaired: 'last-object' })
  })
  it('a dropped last brace is closed; trailing commas cut', () => {
    const text = JSON.stringify(good).slice(0, -1).replace(']}]', '],}],')
    expect(parseJson(text)).toEqual({ json: good, repaired: 'last-object' })
  })
  it('F4: an element without sentences inside the array goes', () => {
    const text = JSON.stringify({ paragraphs: [good.paragraphs[0], { paragraphs: [] }, null] })
    expect(parseJson(text)).toEqual({ json: good, repaired: 'stray-paragraph' })
  })
  it('no JSON at all → null', () => {
    expect(parseJson('Ich kann das nicht beantworten.')).toEqual({ json: null, repaired: false })
  })
})

describe('validate (0019 + F4) and validateAudit', () => {
  it('one paragraph is a complete text; every sentence cites a known id; the caps', () => {
    expect(validate(good, lines, VARIANTS.full)).toEqual([])
    expect(validate(good, lines, VARIANTS.eco)).toEqual([])
    expect(validate({ paragraphs: [] }, lines, VARIANTS.full)).toEqual(['no paragraphs'])
    expect(validate({ paragraphs: [{ sentences: [{ text: 'x', cites: [] }, { text: '', cites: ['F9'] }] }, { sentences: [] }] }, lines, VARIANTS.eco)).toEqual(expect.arrayContaining(['2 paragraphs, expected ≤ 1', 'p2: no sentences', 'p1s1: no citation', 'p1s2: empty or invalid text', 'p1s2: unknown citation']))
    expect(validate({ paragraphs: [{ sentences: [{ text: Array(111).fill('Wort').join(' '), cites: ['F1'] }] }] }, lines, VARIANTS.eco)).toEqual(['111 words'])
  })
  it('the audit has one verdict per sentence, from the three', () => {
    expect(validateAudit({ sentences: [{ n: 1, verdict: 'supported' }, { n: 2, verdict: 'partial', why: 'x' }] }, 2)).toEqual([])
    expect(validateAudit({ sentences: [{ verdict: 'yes' }] }, 2)).toEqual(['audit has 1 sentences, draft 2', 's1: verdict "yes"'])
    expect(validateAudit({}, 1)).toEqual(['no sentences'])
  })
})

describe('prompts (verbatim from scripts/prose-grill/prose.mjs)', () => {
  const src = readFileSync(join(__dirname, '../../scripts/prose-grill/prose.mjs'), 'utf8')
  const JSON_SHAPE = 'Answer with JSON only:\n{"paragraphs":[{"sentences":[{"text":"<one sentence>","cites":["F3","F7"]}, ...]}, {"sentences":[...]}]}'
  const literal = (name: string) => src.match(new RegExp(`const ${name} = \`([^\`]*)\``))![1]!.replace(/\$\{REGION\}/g, REGION).replace('${JSON_SHAPE}', JSON_SHAPE)
  it('V1 and AUDIT2 are the grill\'s', () => {
    expect(V1(REGION)).toBe(literal('V1'))
    const audit = literal('AUDIT')
    const rule3 = src.match(/const AUDIT2 = AUDIT\.replace\(\/\^3\\\. Decide\/m, `([^`]*)`\)/)![1]!
    // 0028 (after the merge): parasiteOf joined the direction rule; the grill's text otherwise verbatim.
    const rule3b = rule3.replace('states the species visits P.', 'states the species visits P, "Parasit von: Z" states the species parasitises Z.')
    expect(AUDIT2).toBe(audit.replace(/^3\. Decide/m, rule3b).replace(/^4\. "claims"/m, '5. "claims"'))
  })
  it('ECO2 is ECO with rule 2 replaced by the F5 templates, one per line kind', () => {
    const eco = literal('ECO')
    const rule2 = src.match(/const ECO2 = ECO\.replace\(\/\^2\\\. \.\*\$\/m, `([^`]*)`\)/)![1]!
    // 0028 (after the merge): one template more than the grill, parasiteOf, after pollinates.
    const rule2b = rule2.replace(`   - ${F5_TEMPLATES.pollinates}\n`, `   - ${F5_TEMPLATES.pollinates}\n   - ${F5_TEMPLATES.parasiteOf}\n`)
    expect(ECO2(REGION)).toBe(eco.replace(/^2\. .*$/m, rule2b))
    for (const t of Object.values(F5_TEMPLATES)) expect(ECO2(REGION)).toContain(t)
  })
  it('every eco sheet of the twenty (de + en) finds its F5 templates in ECO2; parasiteOf got its template after the merge', () => {
    const system = ECO2(REGION)
    for (const [name, f] of Object.entries(grill.sheets as unknown as Record<string, { sheets: Record<'de' | 'en', { eco: { id: string; key: string; source: string; text: string }[] }> }>))
      for (const lang of ['de', 'en'] as const) expect(missingTemplates(system, f.sheets[lang].eco), `${name} ${lang}`).toEqual([])
    expect(missingTemplates(system, [{ id: 'F1', key: 'globi.parasiteOf', source: 'GloBI', text: 'x' }])).toEqual([])
    expect(missingTemplates(system, [{ id: 'F1', key: 'globi.livesOn', source: 'GloBI', text: 'x' }])).toEqual(['livesOn'])
  })
  it('the user prompts carry language, species with its name, region and the numbered lines', () => {
    const u = userPrompt('Salamandra salamandra', { de: 'Feuersalamander' }, 'de', REGION, lines)
    expect(u).toBe(`Sprache: Deutsch (kein Du; neutral oder ohne Anrede).\nArt: Salamandra salamandra (Feuersalamander).\nRegion des Lesers: Mainz-Bingen.\n\nFAKTEN:\nF1 [AmphiBIO] Nahrung: Gliederfüßer.\nF2 [GloBI] wird gefressen von: Barrenringelnatter (Natrix helvetica) — 10 GloBI-Belege.\nF3 [GBIF occurrences] Region Mainz-Bingen: 48 Meldungen.`)
    expect(userPrompt('Salamandra salamandra', {}, 'en', REGION, lines.slice(0, 1))).toBe(`Language: English.\nSpecies: Salamandra salamandra.\nRegion of the reader: Mainz-Bingen.\n\nFACTS:\nF1 [AmphiBIO] Nahrung: Gliederfüßer.`)
    expect(auditPrompt(lines.slice(0, 1), good.paragraphs[0]!.sentences)).toBe(`FACTS:\nF1 [AmphiBIO] Nahrung: Gliederfüßer.\n\nTEXT (sentence n, cited ids, text):\n1. [F1] Der Feuersalamander frisst Gliederfüßer.\n2. [F2] Als Fressfeind ist die Barrenringelnatter verzeichnet.`)
  })
})

describe('files driver (the 0027 file protocol) and the api seam', () => {
  const dirs: string[] = []
  const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'prose-')); dirs.push(d); return d }
  afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }) })
  const job: Job = { gbifKey: 2431776, lang: 'de', variant: 'eco', system: ECO2(REGION), user: userPrompt('Salamandra salamandra', {}, 'de', REGION, lines), maxTokens: 1200 }

  it('draft: writes <gbifKey>-<lang>[-eco].md once, returns null while the answer is missing, then the parsed answer', async () => {
    const root = tmp()
    const d = new FilesDriver('r1', true, root)
    expect(await d.draft(job)).toBeNull()
    const prompt = join(root, 'r1', 'prompts', '2431776-de-eco.md')
    expect(existsSync(prompt)).toBe(true)
    expect(readFileSync(prompt, 'utf8')).toContain('## System\n\n' + ECO2(REGION))
    expect(readFileSync(prompt, 'utf8')).toContain('written to `r1/answers/2431776-de-eco.json`')
    expect(d.written).toEqual(['r1/prompts/2431776-de-eco.md'])
    expect(d.pending).toEqual({ drafts: ['r1/prompts/2431776-de-eco.md'], audits: [] })
    writeFileSync(join(root, 'r1', 'answers', '2431776-de-eco.json'), JSON.stringify(good))
    const d2 = new FilesDriver('r1', true, root)
    const a = await d2.draft(job)
    expect(a?.json).toEqual(good)
    expect(a?.repaired).toBe(false)
    expect(d2.written).toEqual([]) // unchanged prompt: not rewritten
    expect(d2.pending.drafts).toEqual([])
  })
  it('audit: the -audit pair; write=false (--load) reads only', async () => {
    const root = tmp()
    const d = new FilesDriver('r1', true, root)
    expect(await d.audit({ ...job, system: AUDIT2, user: auditPrompt(lines, good.paragraphs[0]!.sentences), maxTokens: 2000 })).toBeNull()
    expect(readdirSync(join(root, 'r1', 'prompts'))).toEqual(['2431776-de-eco-audit.md'])
    expect(d.pending.audits).toEqual(['r1/prompts/2431776-de-eco-audit.md'])
    const ro = new FilesDriver('r2', false, root)
    expect(await ro.draft({ ...job, lang: 'en', variant: 'full' })).toBeNull()
    expect(existsSync(join(root, 'r2'))).toBe(false)
    expect(jobName({ gbifKey: 1, lang: 'en', variant: 'full' })).toBe('1-en')
    expect(jobName({ gbifKey: 1, lang: 'en', variant: 'full' }, true)).toBe('1-en-audit')
  })
  it('never reuses a supported answer after its prompt inputs change, including read-only import', async () => {
    for (const audit of [false, true]) {
      const root = tmp(), writer = new FilesDriver('r1', true, root)
      const exchange = (d: FilesDriver, j: Job) => audit ? d.audit(j) : d.draft(j)
      await exchange(writer, job)
      const answer = writer.answerFile(job, audit)
      writeFileSync(answer, JSON.stringify(good))
      expect((await exchange(writer, job))?.json).toEqual(good)
      const changed = { ...job, user: job.user + '\nUpdated fact sheet or draft.' }
      expect(await exchange(new FilesDriver('r1', false, root), changed)).toBeNull()
      expect(await exchange(writer, changed)).toBeNull()
      expect(readdirSync(join(root, 'r1', 'answers')).some((file) => file.includes('.stale-'))).toBe(true)
      writeFileSync(answer, JSON.stringify(good))
      expect((await exchange(new FilesDriver('r1', false, root), changed))?.json).toEqual(good)
    }
  })
  it('api: off without PROSE_API_KEY, and never a call in 0028', () => {
    delete process.env.PROSE_API_KEY
    expect(() => new ApiDriver()).toThrow('prose: the api driver is off (CLAUDE.md)')
    const src = readFileSync(join(__dirname, 'driver.ts'), 'utf8') + readFileSync(join(__dirname, 'step.ts'), 'utf8')
    expect(src).not.toMatch(/api\.anthropic\.com|@anthropic-ai|process\.env\.ANTHROPIC/)
  })
})
