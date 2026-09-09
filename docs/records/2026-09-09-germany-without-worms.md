# Germany catalogue without a WoRMS exclusion pass

Decision: Sven Reiser, 9 September 2026. Recorded by Codex.
Applies to [Epic #14](https://github.com/Standkreis/atlas/issues/14),
[audit #19](https://github.com/Standkreis/atlas/issues/19), and cancelled
[issue #53](https://github.com/Standkreis/atlas/issues/53).

Germany Atlas v1 uses the GBIF accepted-species union of the reviewed regional
sets without a WoRMS habitat classifier. This refines the land/freshwater scope
in the [Germany contract](2026-09-08-germany-atlas-contract.md): offshore and
marine-only regions remain out of scope, but species occurring in coastal
regional sets are not automatically excluded by habitat flags.

The stopped experiment found exact accepted WoRMS matches for the terrestrial
lichens *Evernia prunastri* and *Xanthoria parietina* with positive marine flags
and absent terrestrial/freshwater flags. Treating the absent flags as sufficient
evidence for exclusion removed both from a regional atlas. The owner chose to
leave WoRMS out rather than introduce the proposed stricter classifier.

The candidate returning to review is
`germany-2016-2026-taxonomy-v2-20260909`: 362 completed regions and 6,874 unique
accepted taxa, observations 2016–2026. Its membership and fingerprints remain
unchanged. Final acceptance still requires the mechanical and scientific audit;
this decision alone does not activate data.

The unmerged experiment and its 970 checkpointed source matches remain in the
original local experiment database. A separate review database retains the
GBIF candidates and uses the schema on the default branch. WoRMS code, schema,
raw responses, and the partial habitat-filtered candidate are not release inputs.

## Coverage limitations

- Coastal sets may contain marine taxa, including records such as *Raja clavata*,
  *Styela clava*, and *Tursiops truncatus*. The catalogue is not a certified
  terrestrial-only checklist or an inventory of every German species.
- Regional set sizes reflect source observation effort as well as the fixed
  floor and cumulative cuts; they are not biodiversity rankings.
- Month labels describe the sampled observation profile. Sparse seasonal data
  can produce narrow labels for species that occur throughout the year.
- German names and galleries are enriched after the accepted union is frozen;
  scientific names and tile silhouettes remain honest index-ready fallbacks.

No substitute habitat classifier, manual taxon blacklist, or production data
transformation is authorized by this decision. A future habitat-filtering
proposal needs its own evidence and membership review.
