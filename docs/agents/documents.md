# Documents and evidence

Owner: Sven Reiser.

- Issues own active acceptance criteria and work state. Specs hold architecture and cross-issue reasoning. A substantial spec may land in its own PR before implementation; later spec changes accompany affected code. Durable specs, records and ADRs use PRs, with no direct-to-main exception.
- Decision records preserve what was known and decided. A reversal is a new linked record; a refinement is a dated addendum. Do not silently rewrite historical decisions.
- At completion, distill lasting decisions into an ADR and mark the spec superseded with a replacement link. Preserve the spec at its stable path by default. If deletion is justified, repair inbound links in the same PR or use commit-pinned links for immutable records. A similarly named replacement does not make a dead link valid.
- Existing numbered documents keep their numbers. New agent decisions may use date-and-topic filenames to avoid collisions with the milestone series. Link their issue rather than implying the filename is its number.
- Commit a small curated set of screenshots supporting permanent findings or decisions. Use stable descriptive paths beside the owning document, compressed WebP or PNG, normally at most 500 KiB per image and 2 MiB of new evidence per PR. Explain necessary exceptions in the PR. Budgets do not retroactively reject historical assets.
- Keep temporary captures, raw logs and large recordings outside Git. Promote only evidence the final document needs. Link committed images through authenticated repository pages; do not require unsupported attachment tooling.
- Distillation preserves referenced assets at their paths. An image omitted from the ADR may still support an older record. Delete only after checking inbound references and historical evidence value; identify deletions in the PR.
- Findings state decisions, checks and evidence, unresolved questions and deployment status. A local screenshot or successful command alone does not prove remote release success.
