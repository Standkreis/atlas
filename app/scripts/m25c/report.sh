#!/bin/sh
# Handoff 0025 Track C: the two numbers the findings report, from the dev DB (Docker standkreis-dex-db-1, no local psql).
# C1: the xeno-canto taxa of a region without a sound Asset, and the clips marked transcoded. C2: the bird habitat cells.
# usage: scripts/m25c/report.sh ["Mainz-Bingen"]
REGION="${1:-Mainz-Bingen}"
Q() { docker exec standkreis-dex-db-1 psql -U dex -d dex -At -F ' | ' -c "$1"; }
echo "== C1 · $REGION: xeno-canto taxa without a clip"
Q "select t.\"sciName\", t.\"gbifKey\", t.\"order\" from \"Taxon\" t join \"Plausibility\" p on p.\"taxonId\"=t.id join \"Region\" r on r.id=p.\"regionId\" where r.name='$REGION' and (t.tile='bird' or t.\"order\" in ('Anura','Orthoptera','Chiroptera')) and not exists (select 1 from \"Asset\" a where a.\"taxonId\"=t.id and a.kind='sound') order by 1;"
echo "== C1 · clips with meta.transcoded"
Q "select t.\"sciName\", a.meta->>'xcId', a.meta->>'length', a.licence from \"Asset\" a join \"Taxon\" t on t.id=a.\"taxonId\" where a.kind='sound' and (a.meta->>'transcoded')::boolean order by 1;"
echo "== C1 · sound assets in total"
Q "select count(*) from \"Asset\" where kind='sound';"
echo "== C2 · Amsel and Mauersegler"
Q "select \"sciName\", facts->'habitat'->>'value', facts->'habitat'->>'source' from \"Taxon\" where \"sciName\" in ('Turdus merula','Apus apus') order by 1;"
echo "== C2 · bird habitat values in the sets, by count"
Q "select facts->'habitat'->>'value', count(*) from \"Taxon\" t where tile='bird' and exists (select 1 from \"Plausibility\" p where p.\"taxonId\"=t.id) group by 1 order by 2 desc;"
