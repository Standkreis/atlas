# German region registry

`germany-regions.json` is the checked-in, authoritative BKG/BBSR region-membership artifact for the
31 December 2024 topic date. It contains all 362 selectable Kreisregionen and their 400 BKG VG250
land Kreis units. Source archives, SHA-256 digests, licence, attribution, change notices and derived
counts travel in the artifact.

The membership artifact intentionally omits geometry. It also contains no GADM identifiers, GADM geometry or
national GADM crosswalk: those provider-query mappings belong only in the operational database.

`parseRegionRegistry` is the pure validation boundary for importer-produced values.
`loadGermanyRegistry` validates and returns the adjacent checked-in JSON. Deterministic ordering is
by canonical region key, Kreis key and alias string; source codes are zero-padded before keys are
formed. `GERMANY_REGISTRY_SHA256` identifies the exact checked-in artifact bytes.

`build-land-geometry.py /path/to/ge250-2025.zip` generates the separate server-only
`src/server/data/germany-land.json.gz` plus provenance manifest. The checked-in artifact was generated
with pyshp 3.1.6, pyproj 3.6.1 and shapely 2.0.7. The generator verifies the existing source archive SHA-256 and all 362 region
keys, transforms EPSG:25832 into EPSG:4326, preserves polygon topology without simplification,
and validates every resulting MultiPolygon. The 2025 archive is required; the older 361-feature
archive is rejected. Only BKG geometry is redistributed. Both the registry digest and geometry
digest are checked by the production location adapter. See the [search API decision](../../../docs/records/2026-09-08-region-search-api.md).
