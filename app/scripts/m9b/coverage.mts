// Handoff 0021 C1: the Steckbrief coverage per key per tile over the set members of every region in the DB (plus the
// English names and the sound clips). Reads the DB only. usage: DATABASE_URL=… npx tsx scripts/m9b/coverage.mts
import { db } from '../../etl/db'

const KEYS = ['mass', 'wingspan', 'length', 'migration', 'habitat', 'diet', 'activity', 'lifespan', 'reproduction', 'flowering', 'height', 'pollination', 'lifeform', 'edibility', 'sporePrint']
const TILES = ['insect', 'plant', 'bird', 'fungus', 'fish', 'mammal', 'amphibian', 'reptile']
const taxa = await db.taxon.findMany({ where: { plausibility: { some: {} } }, select: { tile: true, facts: true, commonNames: true, factsAt: true, assets: { where: { kind: 'sound' }, select: { id: true } } } })
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)} %` : '–')
const rows: string[] = []
const by = (tile: string) => taxa.filter((t) => t.tile === tile)
rows.push(`| key | ${TILES.map((t) => `${t} (${by(t).length})`).join(' | ')} | all (${taxa.length}) |`)
rows.push(`| --- | ${TILES.map(() => '---').join(' | ')} | --- |`)
const line = (label: string, has: (t: (typeof taxa)[number]) => boolean) => rows.push(`| ${label} | ${TILES.map((tile) => pct(by(tile).filter(has).length, by(tile).length)).join(' | ')} | ${pct(taxa.filter(has).length, taxa.length)} |`)
for (const k of KEYS) line(k, (t) => !!(t.facts as Record<string, unknown> | null)?.[k])
line('any fact', (t) => Object.keys((t.facts as object | null) ?? {}).length > 0)
line('names.en', (t) => !!(t.commonNames as Record<string, string>)?.en)
line('names.de', (t) => !!(t.commonNames as Record<string, string>)?.de)
line('factsAt set', (t) => !!t.factsAt)
line('sound clip', (t) => t.assets.length > 0)
console.log(rows.join('\n'))
await db.$disconnect()
