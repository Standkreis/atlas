# Catalogue cutover: client and writer safety

This runbook defines the preparation boundary from issue #62. It does not activate a catalogue,
change a saved `Filter`, or grant an operator permission to discard an admission. The atomic
catalogue replacement remains issue #63.

## Distributed write gate

`CatalogueCutoverGate` has one row per country. A missing row means `open`, preserving the legacy
application after the additive migration. `CatalogueWriteAdmission` records work admitted before
maintenance. Admissions intentionally have no expiry and `identityId` intentionally has no foreign
key: an identity-deletion request must be able to finish while its admission remains visible.

The gate and application use the same PostgreSQL advisory-lock key:
`catalogue-cutover:<country code>`.

1. Every admission takes the shared transaction lock, verifies or creates an open gate row, and
   commits its durable admission before starting work.
2. Issue #63 takes the exclusive transaction lock, changes the gate to `maintenance` with an exact
   operation and target catalogue, and commits that short transaction.
3. New writes then receive retryable HTTP 503 behavior. Reads remain available.
4. The operator polls the durable drain. Rows are investigated, never timed out or deleted merely
   because they are old.
5. The serializable live-cutover transaction calls `requireDrainedCatalogueMaintenance`. That
   obtains the exclusive lock again and verifies the owner, target, and zero admissions before any
   live data changes.
6. The reviewed success or rollback transaction calls `openCatalogueGate` with the same operation
   ID. A different owner or a non-empty drain fails closed.

The runtime admission boundary covers every tRPC mutation for identity/auth, filters, sightings,
studies, photo attachment/removal, and catalogue-affecting helper mutations. Anonymous identity
bootstrap, the complete photo-upload lifecycle, and the cleanup sweep use explicit admissions
because they are outside tRPC mutation middleware. An external identify admission stays live while
the provider call, result publication, quota settlement, and cleanup run. Health checks, photo
reads, and ordinary tRPC queries are read-only and remain available.

Operator ETL is not an application writer and does not consult this gate. The cutover procedure
must prohibit unrelated ETL against the live database for its full maintenance window; staging and
verification use their separately reviewed commands. The gate is not a substitute for that
operator boundary.

## Region compatibility

Compatibility activates only when the active German catalogue points to the active German registry.
Before that matched state exists, legacy UUIDs retain their existing behavior. After activation,
only entries in the active registry are selectable. Four historical identifiers have reviewed
outcomes:

| Historical `gadmGid` | Outcome |
| --- | --- |
| `DEU.11.30_1` · Südwestpfalz | canonical `de-krg-07340000` · Pirmasens, Zweibrücken, and Südwestpfalz district |
| `DEU.11.19_1` · Mainz-Bingen | canonical `de-krg-07339000` · Mainz-Bingen |
| `JPN.22.13_1` · Kyoto | no German successor |
| `NLD.9.73_1` · Schagen | no German successor |

Reads project this mapping without rewriting `Filter`. Projection preserves saved order, removes
duplicates, retains the active region when it still resolves into the projected list, and otherwise
uses the first surviving region. With no survivor, discovery is explicitly empty. A later user
selection writes canonical IDs; there is no preparatory bulk transform.

Queued scan rows ask the server for this exact mapping before replay. A unique reviewed successor is
written back to that outbox row. A no-successor row remains in IndexedDB with its draft and photo and
is skipped until the person explicitly chooses a current region. Retryable maintenance errors do not
mark queued work dead. Automatic compatibility requests include only live pending scans, validate
region UUIDs locally, and are chunked to the server's 50-region limit. Malformed rows move to the same
explicit region-recovery state, while retained dead rows and a failed compatibility batch cannot stop
unrelated outbox work.

## Versioned browser state

`identity.me` publishes the active catalogue and registry IDs and is always rechecked on mount,
reconnect, and focus. Only that identity handshake (or its cross-tab storage event) establishes and
changes the client catalogue generation; regional responses cannot advance or roll it back. The
persister rejects stale or unversioned regional results once a current version is known. Personal
journal, sighting, study, identity ownership, and outbox stores are not cleared by a catalogue
transition.

The original array-shaped `sighting.outside` procedure remains stable for already-open clients.
Catalogue-aware clients use the distinct `sighting.outsideVersioned` query and cache key. This avoids
serving an object to an older bundle that calls array methods while still attaching catalogue metadata
to every newly persisted out-of-set result.

An authoritative `identity.me.catalogueVersion: null` is a rollback to legacy mode, not a missing
observation. The client persists a legacy sentinel, evicts active-version regional queries and v2
offline packs, and refuses to re-adopt a late response from the rolled-back catalogue. A removed
version key from an older same-origin tab is interpreted the same way and upgraded to the sentinel.

Explicit offline region packs use catalogue-versioned cache and marker names. A transition removes
only older regional pack caches and markers; it does not touch private photos, the outbox, or other
service-worker caches. Pack creation remains an explicit user action and includes only the
position-zero lead image URL for each regional species.

A tab that is completely disconnected cannot discover that server activation occurred. It may use
the coherent version it already downloaded. On its next successful identity sync, or a same-origin
storage event from another tab, stale regional persisted queries and packs are invalidated before
they can be reused as current-version state. During maintenance, its write attempts receive a
retryable response and remain queued. An offline region-switch intent is also retained when its
replay meets maintenance; only success or a non-retryable rejection acknowledges that intent.

## Verification boundary

The preparatory change is safe only when tests show both sides of activation, exact successor and
no-successor outcomes, unchanged stored personal rows on compatibility reads, selective cache/pack
invalidation, durable queued-scan recovery, and maintenance admission/drain behavior. Browser checks
must cover German and English at phone and desktop sizes. They do not activate a production gate or
prove the separate issue #63 atomic replacement.
