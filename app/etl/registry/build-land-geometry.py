"""Generate the server-only BKG land artifact. Requires pyshp, pyproj and shapely.

Usage: python build-land-geometry.py /path/to/ge250-2025.zip
The archive is verified against the existing registry before any geometry is accepted.
"""
import gzip
import hashlib
import io
import json
from pathlib import Path
import sys
import zipfile

import shapefile
from pyproj import Transformer
from shapely.geometry import shape

root = Path(__file__).resolve().parents[2]
registry_bytes = (Path(__file__).parent / 'germany-regions.json').read_bytes()
registry = json.loads(registry_bytes)
source = next(item for item in registry['registry']['sources'] if item['role'] == 'regions')
archive_bytes = Path(sys.argv[1]).read_bytes()
assert hashlib.sha256(archive_bytes).hexdigest() == source['archiveSha256'], 'wrong BKG archive'
archive = zipfile.ZipFile(io.BytesIO(archive_bytes))
prefix = 'ge250/ge250/krg/KRG250'
reader = shapefile.Reader(shp=io.BytesIO(archive.read(prefix + '.shp')), shx=io.BytesIO(archive.read(prefix + '.shx')), dbf=io.BytesIO(archive.read(prefix + '.dbf')), encoding='utf-8')
transform = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
features = []
for record in reader.iterShapeRecords():
    key = 'de-krg-' + record.record['SN_KRG'].zfill(8)
    geometry = shape(record.shape.__geo_interface__)
    assert geometry.is_valid, f'invalid source geometry: {key}'
    polygons = [geometry] if geometry.geom_type == 'Polygon' else list(geometry.geoms)
    coordinates = []
    for polygon in polygons:
        rings = []
        for ring in [polygon.exterior, *polygon.interiors]:
            # No simplification: preserve the source land boundary, islands and holes.
            rings.append([[round(lng, 7), round(lat, 7)] for lng, lat in (transform.transform(x, y) for x, y in ring.coords)])
        coordinates.append(rings)
    projected = shape({'type': 'MultiPolygon', 'coordinates': coordinates})
    assert projected.is_valid, f'invalid transformed geometry: {key}'
    features.append({'key': key, 'bbox': list(projected.bounds), 'polygons': coordinates})
features.sort(key=lambda feature: feature['key'])
assert [item['key'] for item in features] == sorted(item['key'] for item in registry['regions']), 'geometry/registry key mismatch'
artifact = {'schemaVersion': 1, 'registryVersion': registry['registry']['key'], 'features': features}
compressed = gzip.compress(json.dumps(artifact, separators=(',', ':'), ensure_ascii=False).encode(), compresslevel=9, mtime=0)
destination = root / 'src/server/data'
destination.mkdir(parents=True, exist_ok=True)
(destination / 'germany-land.json.gz').write_bytes(compressed)
manifest = {
    'schemaVersion': 1, 'registryVersion': registry['registry']['key'],
    'registrySha256': hashlib.sha256(registry_bytes).hexdigest(),
    'geometrySha256': hashlib.sha256(compressed).hexdigest(),
    'regionCount': len(features), 'source': source,
    'changeNotice': 'Transformed from EPSG:25832 to EPSG:4326; coordinates rounded to 7 decimal degrees; no simplification. gzip-compressed GeoJSON-style MultiPolygon rings with bounding boxes; original BKG land boundaries, islands and holes retained.',
}
(destination / 'germany-land.manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
print(f'{len(features)} regions; {len(compressed)} compressed bytes; sha256 {manifest["geometrySha256"]}')
