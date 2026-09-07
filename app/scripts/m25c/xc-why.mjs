// Handoff 0025 C1: why a taxon still has no clip. Lists every xeno-canto recording of quality A for the names given, with
// format, licence and length, so the findings can name the ND-only and the empty ones. XENO_CANTO_API_KEY from the shell
// (`set -a; . ./.env.local; set +a`), never printed. usage: node scripts/m25c/xc-why.mjs "Calliptamus italicus" grasshoppers ...
const key = process.env.XENO_CANTO_API_KEY
if (!key) { console.error('XENO_CANTO_API_KEY is not set'); process.exit(1) }
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i += 2) {
  const [sp, grp] = [args[i], args[i + 1]]
  const r = await fetch(`https://xeno-canto.org/api/3/recordings?query=${encodeURIComponent(`sp:"${sp}" grp:${grp}`)}&per_page=100&key=${key}`)
  const j = await r.json()
  const recs = j.recordings ?? []
  console.log(`\n${sp} (${grp}): ${j.numRecordings ?? recs.length} recordings, ${recs.filter((x) => x.q === 'A').length} of quality A`)
  for (const x of recs.filter((x) => x.q === 'A')) console.log(`  XC${x.id} ${x.q} ${(x['file-name'] ?? '').split('.').pop()} ${x.length} ${x.type} ${x.lic}`)
  await new Promise((res) => setTimeout(res, 1200))
}
