"""Reproduce package A aggregates from a fresh local restore; never writes SQL.
Usage: python3 audit.py OUTPUT.json --container LOCAL_CONTAINER --database dex_check_NAME
Needs docker/psql and the hash-bound release archive already restored locally.
No provider calls, application imports, credentials, or personal-table queries.
"""
import argparse
import collections
import csv
import hashlib
import json
import re
import subprocess
from pathlib import Path

DATASET = 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c'
UNION = '6ede6e5b059fa0d3d5edc0e883654a1c7ecb2df08abae129c32c9953e25ae38e'
ARCHIVE = '02f81429a0aa8a77c97fe7d1309793a65157f7a021b44df6692ebe94658fdeb0'

def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()

def count(values):
    return dict(sorted(collections.Counter(str(x) if x is not None else '(missing)' for x in values).items()))

def present(value):
    return value is not None and value != '' and value != [] and value != {}

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('output', type=Path)
    ap.add_argument('--container', required=True)
    ap.add_argument('--database', required=True)
    args = ap.parse_args()
    if not args.database.startswith('dex_check_'):
        raise SystemExit('Only a dedicated dex_check_* local database is supported')
    # Each SELECT runs inside the same read-only repeatable-read snapshot.
    statements = {
        'catalogue': '''SELECT row_to_json(c) FROM "CatalogueVersion" c WHERE "countryCode"='DE' AND status='active';''',
        'registry': '''SELECT row_to_json(r) FROM "RegionRegistryVersion" r WHERE id='de-krg-2024-12-31';''',
        'taxa': '''SELECT row_to_json(t) FROM "Taxon" t JOIN "CatalogueTaxon" ct ON ct."taxonId"=t.id JOIN "CatalogueVersion" c ON c.id=ct."catalogueVersionId" WHERE c.status='active' AND c."countryCode"='DE' ORDER BY t."gbifKey";''',
        'resolutions': '''SELECT row_to_json(r) FROM "CatalogueTaxonomyResolution" r JOIN "CatalogueVersion" c ON c.id=r."catalogueVersionId" WHERE c.status='active' AND c."countryCode"='DE' ORDER BY r."sourceKey";''',
        'regions': '''SELECT json_build_object('key',r."canonicalKey",'name',r.name,'higher',r.higher,'taxa',json_agg(t."gbifKey" ORDER BY t."gbifKey")) FROM "Region" r JOIN "Plausibility" p ON p."regionId"=r.id JOIN "Taxon" t ON t.id=p."taxonId" WHERE r."countryCode"='DE' GROUP BY r.id ORDER BY r."canonicalKey";''',
        'galleries': '''SELECT json_build_object('key',t."gbifKey",'eligible',count(v."assetId") FILTER (WHERE v.eligible),'hidden',count(v."assetId") FILTER (WHERE NOT v.eligible)) FROM "Taxon" t JOIN "CatalogueTaxon" ct ON ct."taxonId"=t.id JOIN "CatalogueVersion" c ON c.id=ct."catalogueVersionId" LEFT JOIN "ReferenceAssetVisibility" v ON v."taxonId"=t.id AND v."catalogueVersionId"=c.id WHERE c.status='active' AND c."countryCode"='DE' GROUP BY t."gbifKey" ORDER BY t."gbifKey";''',
    }
    sql = 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\n'
    for name, stmt in statements.items():
        sql += "SELECT 'SECTION:" + name + "';\n" + stmt + '\n'
    sql += 'ROLLBACK;\n'
    result = subprocess.run(['docker', 'exec', '-i', args.container, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'dex', '-d', args.database, '-At'], input=sql, capture_output=True, text=True, check=True)
    raw = {}
    for line in result.stdout.splitlines():
        if line.startswith('SECTION:'):
            section = line.split(':', 1)[1]
            raw[section] = []
        elif line.startswith('{'):
            raw[section].append(json.loads(line))
    assert len(raw['catalogue']) == len(raw['registry']) == 1
    cat, registry = raw['catalogue'][0], raw['registry'][0]
    taxa, resolutions, regions = raw['taxa'], raw['resolutions'], raw['regions']
    keys = {t['gbifKey'] for t in taxa}
    assert len(taxa) == len(keys) == 6874 and digest(sorted(keys)) == UNION == cat['unionFingerprint']
    assert len(regions) == 362 and sum(len(r['taxa']) for r in regions) == 214321
    assert set(k for r in regions for k in r['taxa']) == keys
    assert all(len(r['taxa']) == len(set(r['taxa'])) for r in regions)
    assert cat['runKey'] == 'germany-2016-2026-taxonomy-v2-20260909'
    species, variants = {}, collections.defaultdict(set)
    bad_fingerprints = []
    for r in resolutions:
        if digest(r['record']) != r['recordFingerprint']:
            bad_fingerprints.append(r['sourceKey'])
        if r['acceptedKey'] in keys:
            s = r['record']['species']
            assert s['key'] == r['acceptedKey'] and s['rank'] == 'SPECIES' and s['taxonomicStatus'] == 'ACCEPTED'
            variants[r['acceptedKey']].add(digest(s))
            species[r['acceptedKey']] = s
    assert not bad_fingerprints, bad_fingerprints[:10]
    assert set(species) == keys and all(len(v) == 1 for v in variants.values())
    assert all(s['datasetKey'] == DATASET for s in species.values())
    assert all(t.get(f) == species[t['gbifKey']].get(f) for t in taxa for f in ['class', 'order', 'genus'])

    # These are auditable candidate projections, NOT persisted or approved classification.
    # Each numeric anchor is in DATASET; labels do not supply membership evidence.
    rules = {
        'plant.graminoid-families': ('familyKey', [3073, 7708, 5353]),
        'plant.fern-horsetail-class': ('classKey', [7228684]),
        'plant.bryophyte-phyla': ('phylumKey', [35, 9]),
        'plant.clubmoss-class': ('classKey', [245]),
        'plant.algal-phyla': ('phylumKey', [7819616, 36]),
        'animal.insects': ('classKey', [216]),
        'animal.arachnids': ('classKey', [367]),
        'animal.molluscs': ('phylumKey', [52]),
        'animal.crustacean-candidate-classes': ('classKey', [229, 203, 281]),
        'animal.springtails': ('classKey', [10713444]),
        'animal.millipede-centipede-classes': ('classKey', [361, 360]),
        'insect.lepidoptera': ('orderKey', [797]),
        'insect.coleoptera': ('orderKey', [1470]),
        'insect.diptera': ('orderKey', [811]),
        'insect.hymenoptera': ('orderKey', [1457]),
        'insect.hemiptera': ('orderKey', [809]),
        'insect.odonata': ('orderKey', [789]),
        'chordate.elasmobranchii': ('classKey', [121]),
        'chordate.lamprey-class': ('classKey', [11881065]),
        'chordate.ascidiacea': ('classKey', [356]),
    }
    memberships = {name: {k for k,s in species.items() if s.get(field) in anchors} for name,(field,anchors) in rules.items()}
    tile_keys = {tile: {t['gbifKey'] for t in taxa if t['tile'] == tile} for tile in sorted({t['tile'] for t in taxa})}
    memberships['plant.remaining-without-reviewed-growth-form'] = tile_keys['plant'] - set.union(*(memberships[n] for n in rules if n.startswith('plant.')))
    memberships['animal.other-invertebrates'] = tile_keys['insect'] - set.union(*(memberships[n] for n in ['animal.insects','animal.arachnids','animal.molluscs','animal.crustacean-candidate-classes']))
    memberships['chordate.class-missing'] = {k for k in tile_keys['fish'] if not species[k].get('classKey')}
    plant_partition = [memberships[n] for n in memberships if n.startswith('plant.')]
    assert set.union(*plant_partition) == tile_keys['plant'] and sum(map(len,plant_partition)) == len(tile_keys['plant'])
    coverage = {}
    fields = ['datasetKey','key','taxonID','kingdom','kingdomKey','phylum','phylumKey','class','classKey','order','orderKey','family','familyKey','genus','genusKey','parentKey','canonicalName','scientificName','taxonomicStatus','constituentKey','sourceTaxonKey','lastInterpreted']
    for tile, tile_set in tile_keys.items():
        sub = [t for t in taxa if t['gbifKey'] in tile_set]
        coverage[tile] = {'total':len(sub), 'retainedSpeciesFields':{f:sum(present(species[k].get(f)) for k in tile_set) for f in fields}, 'taxonContent':{f:sum(present(t.get(f)) for t in sub) for f in ['facts','intro','prose','tags','wikidataId']}, 'lifeform':sum(present((t.get('facts') or {}).get('lifeform')) for t in sub)}
    def distribution(tile, field):
        return [{'name':name,'key':key,'count':n} for (name,key),n in sorted(collections.Counter((species[k].get(field),species[k].get(field+'Key')) for k in tile_keys[tile]).items(),key=lambda x:(-x[1],str(x[0])))]
    lifeform_keys = {t['gbifKey'] for t in taxa if t['tile']=='plant' and present((t.get('facts')or{}).get('lifeform'))}
    regional = []
    for r in regions:
        ks=set(r['taxa'])
        regional.append({**{k:r[k] for k in ['key','name','higher']},'total':len(ks),'tiles':{tile:len(ks & v) for tile,v in tile_keys.items()},'candidates':{name:len(ks & v) for name,v in memberships.items()},'plantLifeform':len(ks & lifeform_keys)})
    representative_keys = {'de-krg-16072000','de-krg-03355000','de-krg-11000000','de-krg-07339000','de-krg-07340000','de-krg-01054000','de-krg-09180000','de-krg-02000000'}
    out = {
        'schemaVersion':1,'scope':'Frozen production-release catalogue; audit projections only; no classification population',
        'archiveSha256':ARCHIVE,'releaseCodeSha':'c406409c167b104194a0d5dd805fb2282b3afa32','planningCodeSha':'fae0c81e797f2acaf1aa0a3392166d753208aa20',
        'catalogue':cat,'registry':registry,'national':{'total':len(keys),'tiles':{k:len(v) for k,v in tile_keys.items()},'regions':len(regions),'memberships':sum(r['total'] for r in regional),'unionSha256':digest(sorted(keys))},
        'taxonomy':{'resolutions':len(resolutions),'acceptedRows':sum(r['acceptedKey'] is not None for r in resolutions),'rejectedRows':sum(r['acceptedKey'] is None for r in resolutions),'unionResolutionRows':sum(r['acceptedKey'] in keys for r in resolutions),'distinctUnionAccepted':len(species),'conflictingTerminalRecords':0,'fingerprintFailures':0,'datasetCounts':count(s['datasetKey'] for s in species.values()),'sourceTaxonKeyCount':sum(present(s.get('sourceTaxonKey')) for s in species.values()),'fullLineageFieldCount':sum(any(k in s for k in ['classification','lineage','ancestors']) for s in species.values())},
        'coverageByTile':coverage,
        'distributions':{tile:{field:distribution(tile,field) for field in ['phylum','class','order','family']} for tile in ['plant','insect','fish','fungus']},
        'candidateRules':{n:{'datasetKey':DATASET,'field':field,'keys':anchors} for n,(field,anchors) in rules.items()},
        'candidateCounts':{n:len(v) for n,v in memberships.items()},
        'lifeformValues':count((t.get('facts')or{}).get('lifeform',{}).get('value') for t in taxa if t['gbifKey'] in lifeform_keys),
        'lifeformOverlapWithTaxonomicCandidates':{n:len(v & lifeform_keys) for n,v in memberships.items() if n.startswith('plant.')},
        'plantWikidataNamePaths':count(t.get('namePath') for t in taxa if t['tile']=='plant'),
        'hybrids':[{'key':t['gbifKey'],'scientificName':t['sciName'],'tile':t['tile'],'datasetKey':DATASET,'nameType':species[t['gbifKey']]['nameType']} for t in taxa if species[t['gbifKey']]['nameType']=='HYBRID'],
        'residualChordateSamples':[{'key':k,'name':species[k]['scientificName'],'datasetKey':DATASET,'classKey':species[k].get('classKey'),'orderKey':species[k].get('orderKey')} for k in sorted(tile_keys['fish'])],
        'reviewedGalleryVisibility':{'eligible':sum(g['eligible'] for g in raw['galleries']),'hidden':sum(g['hidden'] for g in raw['galleries']),'zeroEligibleTaxa':sum(g['eligible']==0 for g in raw['galleries'])},
        'representativeRegions':[r for r in regional if r['key'] in representative_keys],
    }
    assert out['reviewedGalleryVisibility']['eligible'] == 36338
    regional_path = args.output.with_suffix('.regions.csv')
    with regional_path.open('w', newline='') as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(['key','name','higher','total',*tile_keys,*memberships,'plantLifeform'])
        for r in regional:
            writer.writerow([r['key'],r['name'],r['higher'],r['total'],*r['tiles'].values(),*r['candidates'].values(),r['plantLifeform']])
    out['allRegionsArtifact'] = {'file':regional_path.name,'rows':len(regional),'sha256':hashlib.sha256(regional_path.read_bytes()).hexdigest()}
    encoded = json.dumps(out,sort_keys=True,ensure_ascii=False,indent=2)
    # Keep scalar measurement rows together so the evidence diff is reviewable.
    encoded = re.sub(r'\{[^{}\[\]]*\}', lambda m: json.dumps(json.loads(m.group()),ensure_ascii=False,sort_keys=True), encoded)
    args.output.write_text(encoded+'\n')
    print(json.dumps({'output':str(args.output),'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest(),'national':out['national'],'candidates':out['candidateCounts'],'gallery':out['reviewedGalleryVisibility'],'representatives':[(r['key'],r['name'],r['total']) for r in out['representativeRegions']]}))

if __name__ == '__main__':
    main()
