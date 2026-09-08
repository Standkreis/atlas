# 0029 · Audit reliability and usability

Owner authorized implementation on 2026-09-08, with subagents. Parent: [full audit](../reviews/2026-09-08-audit.md). Branding remains with the separate branding session; preserve its assets, typography and palette.

The owner’s data decision supersedes onboarding handoff 0013: discovery content is a valuable product asset, including species, photos, time, notes and exact location. Collection does not require a discoverer’s name or email. Anonymous records already synchronize to the server; attaching a passkey or email adds recovery. Remove statements that records remain exclusively on the phone or only a district is stored. Exact coordinates are also sent to GBIF to derive place names; location maps request external tiles. Coarse presentation on lists/share cards is different from exact storage.

This decision does not introduce public access, sale, indefinite retention after deletion, or an anonymized research dataset. Existing ownership and deletion controls remain meaningful. Any later reuse or aggregation needs its own concrete product contract.

| Track | Scope |
| --- | --- |
| Backend | Durable scan/upload allowances and reservations; disable public region preparation; atomic recovery, OTP and create; retryable media deletion; JSON export and journal pagination |
| Offline | Durable owned outbox, interruption recovery, cross-tab serialization and identity boundaries; private cache lifecycle; verified reference packs; dependent query invalidation |
| UX | Honest privacy copy; accessible modal/radio/tab/input behavior; intentional region choice and reachable actions; navigation labels; readable species and explicit loading errors |
| Integration / DX / content | Reproducible disposable DB checks and server build; migration lock safety; region-scoped prose publication gate; runtime/ETL separation and real refresh; current setup/handoff |

No production database changes, paid API requests, deployment, commits or push are part of this pass. Additive SQL is staged for deployment; tests use a new local `dex_check_*` database. Findings and verification are recorded in [0029 findings](0029-audit-reliability-findings.md).

Deferred boundaries: palette/contrast belongs to branding; desktop detail panes and native-store rollout remain separate product work. The export is a build artifact, not a supported cross-origin/native deployment contract. Do not advertise it as ready for arbitrary static hosting.
