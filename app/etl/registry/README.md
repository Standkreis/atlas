# German region registry

`germany-regions.json` is the checked-in, authoritative BKG/BBSR region-membership artifact for the
31 December 2024 topic date. It contains all 362 selectable Kreisregionen and their 400 BKG VG250
land Kreis units. Source archives, SHA-256 digests, licence, attribution, change notices and derived
counts travel in the artifact.

The artifact intentionally omits geometry. It also contains no GADM identifiers, GADM geometry or
national GADM crosswalk: those provider-query mappings belong only in the operational database.

`parseRegionRegistry` is the pure validation boundary for importer-produced values.
`loadGermanyRegistry` validates and returns the adjacent checked-in JSON. Deterministic ordering is
by canonical region key, Kreis key and alias string; source codes are zero-padded before keys are
formed. `GERMANY_REGISTRY_SHA256` identifies the exact checked-in artifact bytes.
