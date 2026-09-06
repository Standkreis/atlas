// GIFT, the Global Inventory of Floras and Traits (Göttingen; Weigelt, König & Kreft 2020, J. Biogeogr.), for the plants
// (handoff 0021 D3, grill 0019 S1). Open API, no key: one call for the species list (380 k rows, 30 MB), one per trait
// with `limit` above the 10 000-row default, all cached on disk by fetch.ts. No licence line on the API: attributed as
// "GIFT (Weigelt et al.)", the owner mails the group (0021 §🔒).
import { get } from './fetch'
import type { Fact } from './sources'
import { binomial, metres } from './traits'

const API = 'https://gift.uni-goettingen.de/api/extended/index.php?query='
export const GIFT = { source: 'GIFT (Weigelt et al.)', url: 'https://gift.uni-goettingen.de' }
const TRAITS = { floweringStart: '3.7.1', floweringEnd: '3.7.2', height: '1.6.2', pollination: '3.6.2', lifeform: '2.3.1' } as const
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** The ETL writes months in German like the year strip's `words` (record 0002 E3); the client swaps the four that differ. */
const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const POLLINATION = new Set(['insect', 'wind', 'water', 'bird', 'bat', 'other'])
const LIFEFORM = new Set(['phanerophyte', 'chamaephyte', 'hemicryptophyte', 'cryptophyte', 'therophyte'])

type SpeciesRow = { work_ID: number | string; work_species: string }
type TraitRow = { work_ID: number | string; trait_value: string }
type Index = { idOf: Map<string, string>; traits: Record<keyof typeof TRAITS, Map<string, string>> }

let index: Promise<Index> | null = null
/** Species list and the five trait tables, fetched once per process. */
export function giftIndex(): Promise<Index> {
  return (index ??= (async () => {
    const species = (await get<SpeciesRow[]>(API + 'species')) ?? []
    const idOf = new Map<string, string>()
    for (const s of species) { const k = binomial(s.work_species ?? ''); if (k && !idOf.has(k)) idOf.set(k, String(s.work_ID)) }
    const traits = {} as Index['traits']
    for (const [name, id] of Object.entries(TRAITS) as [keyof typeof TRAITS, string][]) {
      const rows = (await get<TraitRow[]>(`${API}traits&traitid=${id}&limit=1000000`)) ?? []
      traits[name] = new Map(rows.map((r) => [String(r.work_ID), r.trait_value]))
    }
    return { idOf, traits }
  })())
}

/** "Mai–Okt" from GIFT's "May" and "Oct"; one month when they agree; null on "variable" or a miss. */
export function floweringWords(start: string | undefined, end: string | undefined): string | null {
  const a = MONTHS_EN.indexOf(start ?? ''), b = MONTHS_EN.indexOf(end ?? '')
  if (a < 0 && b < 0) return null
  if (a < 0 || b < 0 || a === b) return MONTHS_DE[a < 0 ? b : a]!
  return `${MONTHS_DE[a]}–${MONTHS_DE[b]}`
}

/** Blütezeit, Höhe, Bestäubung, Lebensform for one plant; empty when GIFT has no row under the binomial. */
export async function giftFacts(sciName: string): Promise<Record<string, Fact>> {
  const { idOf, traits } = await giftIndex()
  const id = idOf.get(binomial(sciName))
  if (!id) return {}
  const out: Record<string, Fact> = {}
  const fact = (key: string, value: string | null | undefined) => { if (value) out[key] = { value, ...GIFT } }
  fact('flowering', floweringWords(traits.floweringStart.get(id), traits.floweringEnd.get(id)))
  const h = Number(traits.height.get(id)); if (Number.isFinite(h) && h > 0) fact('height', metres(h))
  const p = traits.pollination.get(id); if (p && POLLINATION.has(p)) fact('pollination', p)
  const l = traits.lifeform.get(id); if (l && LIFEFORM.has(l)) fact('lifeform', l)
  return out
}
