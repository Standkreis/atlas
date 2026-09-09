# 🌊 Germany v1: conservative marine exclusion

[Issue #53](https://github.com/Standkreis/atlas/issues/53) · Decision: 2026-09-09

Germany Atlas v1 covers land and freshwater walks. Coastal Kreisregionen remain in the
registry. The catalogue excludes taxa supported as marine by the rule below; open-water
regions and a marine catalogue remain deferred.

## Evidence and decision

Resolve every distinct accepted GBIF scientific name present in any calculated German
regional set through the [WoRMS Aphia match service](https://www.marinespecies.org/rest/),
`GET /AphiaRecordsByMatchNames`, using operational batches of 20 `scientificnames[]` per call
(below the published maximum of 50), a 60-second source-specific timeout, and explicit
`marine_only=false`. A real German-name probe established that a 20-name response can take about
29 seconds, beyond the shared 15-second default. Responses contain one ordered match list per name. GBIF remains the
taxon identity authority; WoRMS supplies evidence for this membership decision.

Habitat rule v1 excludes a name only when its result has exactly one record, and all these
conditions hold:

- `match_type=exact`, `status=accepted`, and `rank=Species`;
- the requested name exactly equals both `scientificname` and `valid_name`, with a positive
  `AphiaID` equal to `valid_AphiaID`;
- `isMarine` is numeric `1` or boolean `true`, while neither `isFreshwater` nor
  `isTerrestrial` is positive.

Multiple matches, fuzzy matches, synonyms, name disagreement, unmatched names, and unknown
marine evidence are retained. Positive freshwater or terrestrial evidence always retains
the taxon. Flags use three states: numeric 0/1 and boolean false/true are known; null,
missing, or unexpected values remain unknown. Positive marine evidence with unknown
freshwater/terrestrial flags still satisfies the agreed “no positive compatibility” rule;
the unknown flags remain visible in the audit. Brackish evidence alone does not exclude.

This is a conservative source-driven rule, not complete ecological adjudication. WoRMS
coverage, homonyms, spelling/authority differences, and disagreement between accepted
GBIF and WoRMS names can leave marine taxa in the candidate. Unmatched does not mean
terrestrial. Coastal and amphibious taxa are retained when the source supplies positive
freshwater or terrestrial compatibility; taxonomic class and coastal occurrence are
never substitutes for that evidence. Audits must report each retained limitation category.

## Attribution and terms

WoRMS Editorial Board (2026). World Register of Marine Species. Available from
https://www.marinespecies.org at VLIZ. [doi:10.14284/170](https://doi.org/10.14284/170).
Each local batch records its actual access timestamp; individual source citations remain
in the locally checkpointed response.

The [WoRMS terms](https://www.marinespecies.org/about.php#terms), reviewed 2026-09-09,
state that page text is CC-BY unless an individual page says otherwise. They separately
prohibit redistribution of the entire database without prior written agreement, and
encourage the current webservices. We use the bounded German candidate-name subset and
keep raw responses in local ETL checkpoints. Raw WoRMS records are excluded from Git,
public report payloads, and application data transfer. Derived audit evidence includes
names, Aphia IDs, habitat flags, decision reasons, citation, dates, and fingerprints.
This does not grant a licence for WoRMS images or an entire database mirror.

## Calculation and recovery

The filter runs after the existing regional tile cut and before staging, with no
replacement of removed species. It removes both directions of same-genus lookalikes and
their plausibility rows, then recomputes per-tile membership. `regionSize`, seasonal
`nowCounts`, and the final `CatalogueTaxon` union are built from those filtered rows.
The progress denominator reads that union; picker summaries read the staged counts.
Source observation totals and monthly normalization remain the original observations.

The additive migration records `habitatRulesVersion`, source contract, bounded
`CatalogueHabitatBatch` envelopes, and per-region summaries. Historical versions retain
rule 0 and their original membership. A new input fingerprint prevents resuming an old
run key under the new rule. The old candidate is not rewritten.

After a habitat-filtered catalogue is active, the legacy single-region publishers refuse entries
from its pinned registry. Publishing one recalculated region cannot also update the immutable
national union, so it could otherwise restore a marine taxon regionally while national progress
kept the filtered denominator. Operators must refresh those regions through a new nationwide
candidate and checked activation.

Each valid batch is saved before the next request, including the exact raw response,
ordered names, source contract/terms/citation, timestamp, fingerprint, and successful
batch request accounting. Concurrent regions serialize shared-name discovery; subsequent
regions and resumed processes reuse successful batches. Missing batches are freshly
fetched even when `--reuse-cache` reuses GBIF responses. Malformed responses and transport
failures fail the regional attempt and cannot become permanent “unmatched” evidence.
The shared HTTP scheduler limits WoRMS to one in-flight request, reserves a one-second
host gap, honors Retry-After, and charges retries to `ETL_BUDGET`.

Nested batch capture contributes requests once to the enclosing region attempt, including handled
failures. The habitat audit separately exposes the durable total stored in successful batch
checkpoints. These categories can overlap during an ordinary completed attempt. After a hard kill
between checkpointing and regional staging, the durable habitat total can instead include work
absent from the region-attempt total. They are therefore reported separately and must not be added
or described as strict subsets of one another. A hard kill before any checkpoint can still leave
an unrecorded network attempt; this is also a limitation of the existing GBIF runner.

## Verification and rollout boundary

Synthetic tests cover strict identity, tri-state flags, compatibility, ambiguity, batch
bounds/order, partial checkpoint recovery, concurrency, corruption, real shared HTTP
budget exhaustion, and nested request accounting. Disposable Postgres integration checks
verify filtered regional rows, lookalikes, national union, and seasonal/picker summary
counts while preserving the prior live data.

The full 362-region candidate and its scientific audit are separate local execution
evidence for this issue. They must finish before the draft PR is marked ready. No
production membership transfer or catalogue activation is part of this decision.
