// The ETL CLI (handoff 0006 Track A). npm run etl -- <command> [args]
//   region <prepared name | canonical key | gadmGid> query units → accepted-key aggregation → one regional set
//   registry --mapping <path> checked-in BKG registry + locally reviewed GADM mapping → versioned region rows
//   germany --registry <id> --run <key> [--concurrency 1] [--reuse-cache] [--json]
//                             resumable staged Germany catalogue → deduplicated national taxon union
//   names --catalogue <completed-id> [--region <key|name|uuid>] [--keys k1,k2] [--limit n] [--concurrency n] [--json]
//                             bounded Wikidata common-name enrichment over the completed catalogue union
//   refresh [--days 30]       re-run the region job for regions older than 30 days
//   content [--region <name>] [--purge <key>] [--limit n] [--force]
//                             fill Taxon content (names, intro, facts, assets, interactions) once per taxon; --force refetches only the GloBI edges of filled taxa (0028)
//   prose --region <name> [--driver files|api] [--run <name>]
//                             the Steckbrief and Ökologie texts (handoff 0028): writes the prompt files, loads the answered ones
//   prose --load --run <name> answers → DB only · prose --purge [--region <name>]
//   facts [--region <name>] [--purge] [--force] [--limit n]
//                             the Steckbrief keys (0021 D3): bulk files, GIFT, Wikidata mycomorphbox, GBIF English names
//   sounds [--region <name>] [--limit n]
//                             one xeno-canto clip per bird, frog, grasshopper, bat (0021 D5); needs XENO_CANTO_API_KEY
//   sweep                     what a server restart does (handoff 0009): restart queued regions, fill missing content, drop abandoned photos
import { db } from './db'
import { requests } from './fetch'
import { TILES } from './rules'

const [cmd, ...rest] = process.argv.slice(2)
const flag = (name: string) => { const i = rest.indexOf(`--${name}`); return i > -1 ? rest[i + 1] : undefined }
const positional = rest.filter((a, i) => !a.startsWith('--') && !rest[i - 1]?.startsWith('--'))

const TILE_ICON: Record<string, string> = { bird: '🐦', mammal: '🦌', amphibian: '🐸', reptile: '🦎', fish: '🐟', insect: '🦋', plant: '🌿', fungus: '🍄' }

async function main() {
  switch (cmd) {
    case 'registry': {
      const mappingPath = flag('mapping')
      if (!mappingPath) throw new Error('usage: etl registry --mapping <reviewed-local-json>')
      const { readFile } = await import('node:fs/promises')
      const { parseRegionQueryMapping } = await import('./registry-mapping')
      const { importRegionRegistry } = await import('./registry-import')
      const mapping = parseRegionQueryMapping(JSON.parse(await readFile(mappingPath, 'utf8')))
      const r = await importRegionRegistry({ mapping, log: console.log })
      console.log(`registry ${r.registryId}: ${r.regions} regions · ${r.sourceUnits} Kreis units · ${r.aliases} aliases · ${r.queryUnits} query units · ${r.created ? 'created' : 'verified'}`)
      break
    }
    case 'region': {
      const { runRegion } = await import('./region')
      const query = positional[0]
      if (!query) throw new Error('usage: etl region <prepared name | canonical key | gadmGid>')
      const r = await runRegion(query)
      const month = Number(flag('month') ?? new Date().getMonth() + 1)
      console.log(`\n${r.name} · ${r.total} obs · set ${r.set} · lookalike pairs ${r.lookalikes} · "nur jetzt" (month ${month}) ${r.nowInMonth(month)}`)
      console.log(TILES.map((t) => `${TILE_ICON[t]} ${r.perTile[t] ?? 0}`).join('  '))
      console.log(`${r.seconds.toFixed(1)} s · requests ${JSON.stringify(r.requests)}`)
      break
    }
    case 'germany': {
      const registryVersionId = flag('registry')
      const runKey = flag('run')
      if (!registryVersionId || !runKey) throw new Error('usage: etl germany --registry <version-id> --run <new-or-resumable-key> [--concurrency 1] [--json]')
      const { formatNationwideReport, runGermany } = await import('./nationwide')
      const json = rest.includes('--json')
      const reuseCache = rest.includes('--reuse-cache')
      if (reuseCache) console.error('Germany catalogue: reusing URL-keyed responses younger than 30 days; misses remain live, captured requests')
      const result = await runGermany({
        registryVersionId,
        runKey,
        concurrency: Number(flag('concurrency') ?? 1),
        fresh: reuseCache ? ((operation) => operation()) : undefined,
        log: json ? (message) => console.error(message) : console.log,
      })
      console.log(json ? JSON.stringify(result.report, null, 2) : `\n${formatNationwideReport(result.report)}`)
      if (result.report.catalogue.status !== 'complete') process.exitCode = 2
      break
    }
    case 'refresh': {
      const { refresh } = await import('./region')
      const n = await refresh(Number(flag('days') ?? 30))
      console.log(`refreshed ${n} region(s) · requests ${JSON.stringify(requests())}`)
      break
    }
    case 'gallery': {
      const { runGallery, formatGalleryReport, parseGalleryArgs } = await import('./gallery-work')
      const { json, ...options } = parseGalleryArgs(rest)
      const result = await runGallery({ ...options,
        log: json ? console.error : console.log,
      })
      console.log(json ? JSON.stringify(result, null, 2) : formatGalleryReport(result))
      if (result.failed || result.lost) process.exitCode = 2
      break
    }
    case 'names': {
      const { runNames, formatNamesReport, parseNamesArgs } = await import('./names-work')
      const { json, ...options } = parseNamesArgs(rest)
      const result = await runNames({ ...options, log: json ? console.error : console.log })
      console.log(json ? JSON.stringify(result, null, 2) : formatNamesReport(result))
      if (result.failed || result.lost) process.exitCode = 2
      break
    }
    case 'content': {
      const { runContent } = await import('./content')
      const keys = flag('keys')?.split(',').map(Number).filter(Number.isFinite)
      const r = await runContent({ region: flag('region'), keys, purge: flag('purge') ? Number(flag('purge')) : undefined, limit: flag('limit') ? Number(flag('limit')) : undefined, force: rest.includes('--force') })
      console.log(`\ncontent: ${r.done} filled, ${r.failed} failed of ${r.taxa} · ${(r.seconds / 60).toFixed(1)} min`)
      console.log(`ladder ${JSON.stringify(r.ladder)} · intro ${JSON.stringify(r.intro)} · wikidata ${JSON.stringify(r.wikidata)} · edges ${r.edges} (prose skips F1 ${r.prose.F1}, F2 ${r.prose.F2}; ${r.prose.truncated} species cut at 50 GloBI pages) · new target rows ${r.targetsCreated}`)
      console.log(`requests ${JSON.stringify(r.requests)}`)
      break
    }
    case 'facts': {
      const { runFacts } = await import('./facts')
      const r = await runFacts({ region: flag('region'), purge: rest.includes('--purge'), force: rest.includes('--force'), limit: flag('limit') ? Number(flag('limit')) : undefined })
      console.log(`\nfacts: ${r.written} written (${r.changed} changed), ${r.failed} failed of ${r.taxa} · ${r.namesFilled} English names filled · ${(r.seconds / 60).toFixed(1)} min`)
      for (const [tile, keys] of Object.entries(r.perKey)) console.log(`${TILE_ICON[tile] ?? tile} ${tile}: ${Object.entries(keys).map(([k, n]) => `${k} ${n}`).join(' · ')}`)
      console.log(`requests ${JSON.stringify(r.requests)}`)
      break
    }
    case 'recode': {
      const { runRecode } = await import('./facts')
      await runRecode()
      break
    }
    case 'sounds': {
      const { runSounds } = await import('./sounds')
      const r = await runSounds({ region: flag('region'), limit: flag('limit') ? Number(flag('limit')) : undefined })
      if (r.keyPresent) console.log(`\nsounds: ${r.stored} clips stored (${(r.bytes / 1024 / 1024).toFixed(1)} MB), ${r.skipped} had one, ${r.none} without a usable clip (${r.nd} with ND only, ${r.wav} with WAV only), ${r.failed} failed of ${r.taxa} · ${(r.seconds / 60).toFixed(1)} min · requests ${JSON.stringify(r.requests)}`)
      break
    }
    case 'prose': {
      const { runProse, purgeProse } = await import('./prose/step')
      if (rest.includes('--purge')) {
        const n = await purgeProse(flag('region'))
        console.log(`prose: purged ${n} taxa${flag('region') ? ` of ${flag('region')}` : ''}`)
        break
      }
      const driver = flag('driver')
      if (driver && driver !== 'files' && driver !== 'api') throw new Error('usage: prose --driver files|api')
      const keys = flag('keys')?.split(',').map(Number).filter(Number.isFinite)
      const r = await runProse({ region: flag('region'), run: flag('run'), driver: driver as 'files' | 'api' | undefined, keys, load: rest.includes('--load') })
      console.log(`\nprose: ${r.written} prompts written · ${r.pending} taxa pending · ${r.loaded} loaded · ${r.skipped} skipped (unchanged) · ${r.thin} thin (< 3 lines) of ${r.taxa} · ${r.invalid} invalid answers · ${r.seconds.toFixed(1)} s`)
      if (r.unfetched) console.log(`⚠ ${r.unfetched} edges without studies entered the sheets (fetched before 0028: F2 never fired on them) — run content --region <name> --force --keys <the ✗ keys> first`)
      if (r.noTemplate) console.log(`⚠ ${r.noTemplate} eco prompts hold a line kind without an F5 template`)
      for (const [kind, bs] of Object.entries(r.batches)) {
        if (!bs.length) continue
        console.log(`${kind} pending: ${bs.flat().length} prompts → ${bs.length} subagents of ≤ 5 (${kind} only, never mixed with ${kind === 'drafts' ? 'audits' : 'drafts'})`)
        bs.forEach((b, i) => console.log(`  agent ${i + 1}: ${b.join(' ')}`))
      }
      break
    }
    case 'sweep': {
      const { sweep } = await import('./sweep')
      const r = await sweep()
      console.log(r ? `sweep: regions ${r.regions.join(', ') || '–'} · content ${r.content} taxa (${r.contentDone} filled, ${r.contentFailed} failed) · photos ${r.photos} · ${r.seconds.toFixed(1)} s` : 'sweep: another process holds the lock')
      break
    }
    default:
      console.log('usage: npm run etl -- registry --mapping <reviewed-local-json> | germany --registry <version-id> --run <key> [--concurrency 1] [--reuse-cache] [--json] | names --catalogue <completed-id> [--region <key|name|uuid>] [--keys k1,k2] [--limit n] [--concurrency n] [--json] | region <prepared name | canonical key | gadmGid> [--month m] | refresh [--days 30] | content [--region <name>] [--purge <gbifKey>] [--limit n] [--force [--keys k1,k2]] | facts [--region <name>] [--purge] [--force] [--limit n] | sounds [--region <name>] [--limit n] | prose --region <name> [--driver files|api] [--run <name>] | prose --load --run <name> | prose --purge [--region <name>] | sweep')
      process.exitCode = 1
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => db.$disconnect())
