// The content job (spec §🗃️ D–I, record 0002 E6–E9, handoff 0006 Track A): for every taxon in any region's set or with
// a sighting and no content yet: GBIF species → Wikidata batch (P846, then name) → image ladder (iNat → Commons P18 →
// next iNat → none) → Wikipedia de → en → GloBI pruned and capped. Runs once per taxon (`contentAt`); `--purge <gbifKey>`
// re-fetches one. A failure on one taxon logs and continues. Handoff 0028: every edge carries its GloBI studies and its
// real record count and is marked `prose: false` when 0027 F1/F2 drops it from the prose sheet; `--force` refetches only
// the edges of taxa already filled (a full re-run would drop their sound Assets and re-key their images).
import { Prisma } from '../src/generated/prisma/client'
import { db } from './db'
import { pool, requests } from './fetch'
import { gbifMatch, gbifSpecies, type Species } from './gbif'
import { capEdges, globiEdges, globiPair, type Edge } from './globi'
import { iucnCode, pickNames, pruneForProse } from './prune'
import { tileOf } from './rules'
import { anageFacts, commonsAsset, commonsInfo, inatDefault, inatNext, inatTaxon, wikipediaIntro, type AssetDraft, type Fact, type Intro } from './sources'
import { wikidataFor, type WdMatch } from './wikidata'

export type ContentOpts = { purge?: number; limit?: number; region?: string; keys?: number[]; force?: boolean; log?: (s: string) => void }
export type ContentResult = {
  taxa: number
  done: number
  failed: number
  seconds: number
  ladder: Record<string, number>
  intro: Record<string, number>
  wikidata: Record<string, number>
  edges: number
  /** 0028: edges the prose sheet skips, per rule (0027 F1/F2), and species whose GloBI answer was cut at 50 pages. */
  prose: { F1: number; F2: number; truncated: number }
  targetsCreated: number
  requests: ReturnType<typeof requests>
}

type Target = { id: string; gbifKey: number; inSet: boolean }
type Taxon = { id: string; gbifKey: number; sciName: string }

/** A region by name (case-insensitive, so the CLI's `mainz-bingen` finds "Mainz-Bingen") or gadmGid. */
export async function regionByName(region: string) {
  const row = await db.region.findFirst({ where: { OR: [{ name: { equals: region, mode: 'insensitive' } }, { gadmGid: region }] }, select: { id: true, name: true } })
  if (!row) throw new Error(`no region "${region}"`)
  return row
}

/** The taxa the job works on: no content yet, and in a set or logged (E13). Never GloBI's out-of-set targets. `keys` = just these (the log's in-process kick, handoff 0008; with `force`, `content --force --keys`). `force`: the filled ones instead, for the edge refetch. */
async function selectTaxa({ purge, limit, region, keys, force }: ContentOpts): Promise<Taxon[]> {
  const select = { id: true, gbifKey: true, sciName: true }
  if (purge) {
    const t = await db.taxon.findUnique({ where: { gbifKey: purge }, select })
    if (!t) throw new Error(`no taxon with gbifKey ${purge}`)
    await db.$transaction([
      db.asset.deleteMany({ where: { taxonId: t.id, sightingId: null } }),
      db.interaction.deleteMany({ where: { sourceId: t.id } }),
      db.taxon.update({ where: { id: t.id }, data: { contentAt: null, factsAt: null, intro: Prisma.DbNull, facts: Prisma.DbNull, prose: Prisma.DbNull, wikidataId: null, iucn: null, namePath: null, commonNames: {} } }),
    ])
    return [t]
  }
  // `keys` with `force` (0028): the edges of just these filled taxa again, e.g. the ones a long refetch logged with ✗.
  if (keys) return db.taxon.findMany({ where: { contentAt: force ? { not: null } : null, gbifKey: { in: keys } }, select, orderBy: { gbifKey: 'asc' } })
  const regionRow = region ? await regionByName(region) : null
  return db.taxon.findMany({
    where: { contentAt: force ? { not: null } : null, OR: [{ plausibility: { some: regionRow ? { regionId: regionRow.id } : {} } }, { sightings: { some: {} } }] },
    select,
    orderBy: { gbifKey: 'asc' },
    take: limit,
  })
}

export async function runContent(opts: ContentOpts): Promise<ContentResult> {
  const log = opts.log ?? console.log
  const t0 = Date.now()
  const taxa = await selectTaxa(opts)
  log(`content: ${taxa.length} taxa to fill`)
  const r: ContentResult = { taxa: taxa.length, done: 0, failed: 0, seconds: 0, ladder: {}, intro: {}, wikidata: {}, edges: 0, prose: { F1: 0, F2: 0, truncated: 0 }, targetsCreated: 0, requests: requests() }
  if (!taxa.length) return r
  const count = (bucket: Record<string, number>, k: string) => (bucket[k] = (bucket[k] ?? 0) + 1)

  // Batches first: Wikidata (≈ 8 calls per 929), Commons file info for every P18 (≈ 22 calls). Not for the edge refetch.
  const wd = opts.force ? new Map<number, WdMatch>() : await wikidataFor(taxa)
  const commons = opts.force ? new Map() as Awaited<ReturnType<typeof commonsInfo>> : await commonsInfo([...wd.values()].map((m) => m.item?.img).filter((x): x is string => !!x))
  if (!opts.force) log(`wikidata ${[...wd.values()].filter((m) => m.item).length} items · commons ${commons.size} files`)

  // Every set member anywhere, by name and key: GloBI targets in a set come first and never get a new row.
  const members = await db.taxon.findMany({ where: { plausibility: { some: {} } }, select: { id: true, gbifKey: true, sciName: true } })
  const setByName = new Map(members.map((m) => [m.sciName, { id: m.id, gbifKey: m.gbifKey, inSet: true }]))
  const setByKey = new Map(members.map((m) => [m.gbifKey, { id: m.id, gbifKey: m.gbifKey, inSet: true }]))
  const targetCache = new Map<string, Promise<Target | null>>()
  // Fetches run four taxa wide; writes go one at a time. Four parallel transactions touching Taxon deadlocked in Postgres.
  let chain: Promise<unknown> = Promise.resolve()
  const serial = <T,>(fn: () => Promise<T>): Promise<T> => {
    const next = chain.then(fn, fn)
    chain = next.catch(() => undefined)
    return next
  }

  /** A GloBI target name → the Taxon row it lands on: a set member by name or key, else a new row from GBIF match. */
  const resolveTarget = (name: string, sourceKey: number): Promise<Target | null> => {
    const hit = setByName.get(name)
    if (hit) return Promise.resolve(hit)
    let p = targetCache.get(name)
    if (!p) {
      p = (async () => {
        const m = await gbifMatch(name)
        if (!m?.usageKey || m.matchType !== 'EXACT' || m.usageKey === sourceKey) return null
        const inSet = setByKey.get(m.usageKey)
        if (inSet) return inSet
        const tile = tileOf(m)
        if (!tile) return null
        const row = await serial(() =>
          db.taxon.upsert({
            where: { gbifKey: m.usageKey! },
            create: { gbifKey: m.usageKey!, sciName: m.canonicalName ?? name, rank: (m.rank ?? 'UNRANKED').toLowerCase(), tile, class: m.class ?? null, order: m.order ?? null, genus: m.genus ?? null },
            update: {},
            select: { id: true },
          }),
        )
        return { id: row.id, gbifKey: m.usageKey, inSet: false }
      })()
      targetCache.set(name, p)
    }
    return p
  }

  let n = 0
  await pool(taxa, 4, async (t) => {
    try {
      const targets = { inSet: (name: string) => setByName.has(name), resolve: (name: string) => resolveTarget(name, t.gbifKey), serial }
      const out = opts.force ? await refetchEdges(t, targets, log) : await fillOne(t, wd.get(t.gbifKey) ?? { path: 'none', item: null }, commons, targets, log)
      if (!opts.force) {
        const full = out as Awaited<ReturnType<typeof fillOne>>
        count(r.ladder, full.ladder)
        count(r.intro, full.intro)
        count(r.wikidata, full.wikidata)
      }
      r.edges += out.edges
      r.prose.F1 += out.prose.F1
      r.prose.F2 += out.prose.F2
      if (out.prose.truncated) r.prose.truncated++
      r.targetsCreated += out.targetsCreated
      r.done++
    } catch (e) {
      r.failed++
      log(`  ✗ ${t.sciName} (${t.gbifKey}): ${e instanceof Error ? e.message : e}`)
    }
    if (++n % 25 === 0 || n === taxa.length) log(`  ${n}/${taxa.length} · ${((Date.now() - t0) / 60_000).toFixed(1)} min · ${JSON.stringify(requests().perHost)}`)
  })
  // The Steckbrief keys (handoff 0021 D3) for the taxa this run filled: bulk files, GIFT, the mycomorphbox, GBIF names.
  if (!opts.force) {
    const { runFacts } = await import('./facts')
    const f = await runFacts({ keys: taxa.map((t) => t.gbifKey), force: true, log })
    log(`  facts: ${f.written} written, ${f.namesFilled} English names filled, ${f.failed} failed`)
  }
  // The prose (handoff 0028) after facts and edges: with the `files` driver a taxon without answers is pending, not failed.
  if (opts.region && !opts.force) {
    const { runProse } = await import('./prose/step')
    const p = await runProse({ region: opts.region, keys: taxa.map((t) => t.gbifKey), log })
    log(`  prose: ${p.written} prompts written · ${p.pending} taxa pending · ${p.loaded} loaded · ${p.skipped} skipped`)
  }
  r.seconds = (Date.now() - t0) / 1000
  r.requests = requests()
  return r
}

type Targets = { inSet: (name: string) => boolean; resolve: (name: string) => Promise<Target | null>; serial: <T>(fn: () => Promise<T>) => Promise<T> }
type EdgeRow = { sourceId: string; targetId: string; kind: Edge['kind']; origin: string; studies: Record<string, number>; real: number; prose: boolean }

/**
 * GloBI (E9, 0028): fold, cap with in-set first, refine the kept pairs when the answer was cut at 50 pages, resolve the
 * targets, mark F1/F2 (`prose: false`; the tile keeps the edge).
 */
async function edgesFor(t: Taxon, sciName: string, targets: Targets) {
  const globi = await globiEdges(sciName)
  let kept: Edge[] = capEdges(globi.edges, targets.inSet)
  if (globi.truncated) {
    const wanted = new Set(kept.map((e) => `${e.kind}|${e.target}`))
    const byPair = (await Promise.all([...new Set(kept.map((e) => e.target))].map((target) => globiPair(sciName, target)))).flat()
    kept = byPair.filter((e) => wanted.delete(`${e.kind}|${e.target}`))
  }
  const resolved = await Promise.all(kept.map(async (e) => ({ e, target: await targets.resolve(e.target) })))
  const prose = { F1: 0, F2: 0, truncated: globi.truncated }
  const interactions: EdgeRow[] = resolved
    .filter((x): x is { e: Edge; target: Target } => !!x.target && x.target.id !== t.id)
    .map((x) => {
      const drop = pruneForProse(x.e)
      if (drop) prose[drop]++
      return { sourceId: t.id, targetId: x.target.id, kind: x.e.kind, origin: 'GloBI', studies: x.e.studies, real: x.e.real, prose: !drop }
    })
  return { interactions, prose, targetsCreated: resolved.filter((x) => x.target && !x.target.inSet).length }
}

/** `--force`: the edges of a filled taxon again, nothing else touched (0028: studies, real, F1/F2 on every edge). */
async function refetchEdges(t: Taxon, targets: Targets, log: (s: string) => void) {
  const { interactions, prose, targetsCreated } = await edgesFor(t, t.sciName, targets)
  await targets.serial(() =>
    db.$transaction(async (tx) => {
      await tx.interaction.deleteMany({ where: { sourceId: t.id } })
      if (interactions.length) await tx.interaction.createMany({ data: interactions, skipDuplicates: true })
    }),
  )
  if (prose.truncated) log(`  · ${t.sciName}: GloBI cut at 50 pages, ${interactions.length} pairs asked one by one`)
  return { edges: interactions.length, prose, targetsCreated }
}

/** One taxon, every source, one transaction. */
async function fillOne(t: Taxon, wd: WdMatch, commons: Awaited<ReturnType<typeof commonsInfo>>, targets: Targets, log: (s: string) => void) {
  const s: Species | null = await gbifSpecies(t.gbifKey)
  const sciName = s?.canonicalName ?? t.sciName
  const item = wd.item
  if (wd.note) log(`  · ${sciName}: ${wd.note}`)
  const names = pickNames({ sciName, deLabel: item?.deLabel, enLabel: item?.enLabel, jaLabel: item?.jaLabel, dewiki: item?.dewiki, enwiki: item?.enwiki })

  // Image ladder (E7): iNat default if licensed → Commons P18 unless rejected → next licensed iNat → none (tile icon).
  const inat = await inatTaxon(sciName)
  let asset: AssetDraft | null = inatDefault(inat, sciName)
  let ladder = 'inat'
  if (!asset) {
    asset = commonsAsset(commons, item?.img, sciName)
    ladder = 'commons'
  }
  if (!asset && inat) {
    asset = await inatNext(inat, sciName)
    ladder = 'inatNext'
  }
  if (!asset) ladder = 'none'

  // Intro de → en (E8, E12), facts from AnAge (E8).
  const intro: Intro | null = (await wikipediaIntro(item?.dewiki, 'de')) ?? (await wikipediaIntro(item?.enwiki, 'en'))
  const facts: Record<string, Fact> = await anageFacts(item?.anage)

  const { interactions, prose, targetsCreated } = await edgesFor(t, sciName, targets)

  const data = {
    sciName,
    rank: (s?.rank ?? 'species').toLowerCase(),
    class: s?.class ?? undefined,
    order: s?.order ?? undefined,
    genus: s?.genus ?? undefined,
    commonNames: names,
    iucn: iucnCode(item?.iucn),
    intro: intro ?? undefined,
    facts: Object.keys(facts).length ? facts : undefined,
    namePath: wd.path,
    contentAt: new Date(),
  }
  const write = (wikidataId: string | null) =>
    targets.serial(() =>
      db.$transaction(async (tx) => {
        await tx.asset.deleteMany({ where: { taxonId: t.id, sightingId: null } })
        await tx.interaction.deleteMany({ where: { sourceId: t.id } })
        if (asset) await tx.asset.create({ data: { ...asset, kind: 'image', taxonId: t.id } })
        if (interactions.length) await tx.interaction.createMany({ data: interactions, skipDuplicates: true })
        await tx.taxon.update({ where: { id: t.id }, data: { ...data, wikidataId } })
      }),
    )
  try {
    await write(item?.qid ?? null)
  } catch (e) {
    // Two GBIF keys on one Wikidata item (a synonym pair): the second keeps the content, not the id.
    if (!(e instanceof Error && 'code' in e && e.code === 'P2002' && item)) throw e
    log(`  · ${sciName}: ${item.qid} already belongs to another taxon, stored without wikidataId`)
    await write(null)
  }
  return { ladder, intro: intro?.lang ?? 'none', wikidata: wd.path, edges: interactions.length, prose, targetsCreated }
}
