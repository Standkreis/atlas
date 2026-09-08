# 0029 · Reliability and usability findings

Implemented 8 September 2026 against [audit F01–F13](../reviews/2026-09-08-audit.md), following the owner’s authorization and [handoff 0029](0029-audit-reliability.md). Three subagents handled backend, offline and UX; the coordinating agent handled content, runtime boundaries, CI, documentation and integration. Backend also independently reviewed the client identity changes. Existing branding, typography and architecture-visualization work from other sessions was preserved.

## Decisions and changes

| Audit | Result |
| --- | --- |
| F01 privacy | Removed local-only/exact-location promises in both locales, including onboarding, recovery/settings and log copy. Handoff 0013 and roadmap now reflect the owner’s decision to collect discovery content and exact locations without requiring a named discoverer. No new public access or retention-after-deletion policy was introduced. |
| F02 budgets | PostgreSQL quotas, conservative spending reservations, photo/prompt/model/region/locale result cache, and durable concurrency leases. Per-network and global limits survive cookie resets. Public region preparation refuses non-ready regions; CLI owns preparation. |
| F03 recovery | Source avatar reference is released before transfer in the same transaction as adoption/code consumption. Passkeys and duplicate encounter photos survive merging; retained evidence is updated. |
| F04 deletion | Durable deletion records survive cascades and retry object-storage failures. Private photos answer `no-store` and bypass SW caches; upgrade/deletion/adoption clears old private cache entries and scan metadata across tabs. |
| F05 outbox | Successful save requires an IndexedDB commit. Upload acknowledgment and blob removal share a transaction; rows have owners, flushes use Web Locks, and identity changes abort work. Request/response guards prevent old tabs acting as the new owner. Late IDB starts cannot commit a save already reported failed. Legacy unowned rows remain visible with a downloadable backup including available photo bytes. |
| F06 CI | Node 24, disposable Postgres database from committed SQL, deterministic regional fixtures, database regression tests, static export and production server builds, and Chrome browser checks. No production secrets required. |
| F07 create | Concurrent identical IDs return the owned sighting; photo binding and ownership share the mutation lock. |
| F08 email | Atomic attempts/code use and durable send allowance; repeated wrong guesses stop at five, successful code use happens once. |
| F09 regional prose | Versioned JSON envelope keyed by region ID, atomic path writes, selected-region membership in sheets, and locale-specific names with scientific fallback. Another region cannot overwrite or read its neighbor’s prose. |
| F10 publication | Partial/unsupported audits and missing direction templates block publication. Malformed model JSON is rejected. Reader validates counts/citations and region scope; old global prose remains hidden pending reimport. |
| F11 accessibility | Shared Sheet lifecycle includes initial focus, tab containment, inert background, scroll lock, nested restoration and Escape. Fill uses the same implementation. Native/custom choice keyboard behavior, input labels and larger source controls were corrected. |
| F12 contrast | Palette/contrast left to the separate branding session as requested. This pass does not claim to have certified the new visual identity’s contrast. |
| F13 runtime | Runtime HTTP reads and pure rules separated from ETL. Region/content jobs moved to CLI. API/cron traces exclude the populated local ETL cache. |

Other audit findings addressed: actual cache expiry and refresh bypass; shared versioned observation window; bounded runtime maintenance; verified offline reference packs; journal/atlas error states and retries; shared dependent sighting invalidation; safe migration locking without terminating sessions; current setup guide and Node contract; explicit JSON export scope with saved regions/avatar; dense-day journal pagination.

UX changes: intentional ready-region selection, local filtering, reachable sticky primary action and step-back controls; visible navigation labels and unavailable Quests tab removed; two-line species names with recognizable reference images; long introductions/facts collapsed to reduce duplication; ecology tiles use the pruning boundary and display evidence context; model audit totals moved to provenance.

## Verification

All checks passed locally on Node **24.20.0**. [Final build/browser output](../reviews/2026-09-08-fix-assets/final-check.txt), [final ETL/type/unit check](../reviews/2026-09-08-fix-assets/prose-check.txt), [machine-readable results](../reviews/2026-09-08-fix-assets/checks.json), and [function traces](../reviews/2026-09-08-fix-assets/traces.json) accompany this handoff.

| Check | Result |
| --- | --- |
| Typecheck | Passed |
| ESLint | 0 errors; 6 existing script warnings |
| Unit tests | 136 passed across 23 files |
| PostgreSQL integration | 20 passed across 2 files, including concurrent regional publication |
| Static export | Passed; 2,411 pages from committed fixtures |
| Production build | Passed; `mtskxuwk`, no ETL file-tracing warnings |
| Production Chrome, EN and DE | Passed at 390 × 844: intentional region selection, reachable action/back, navigation labels, nested focus/inert/scroll restoration, radio keys, journal failure/retry, manual save and journal |
| Offline Chrome, EN and DE | Passed: 303 Kyoto species and the discovery retained after reload; journal retained the saved sighting. Both page and worker networking disabled and API failure asserted. |
| Private-photo lifecycle | Cached synthetic private bytes ignored (404), cross-tab private cache and scan metadata purge passed, public region pack preserved |
| Runtime trace | tRPC 282 files / about 37 MiB; cron 177 files / about 9.5 MiB; **0 ETL cache files** in both (audit: 37,029) |
| Production dependency audit | npm reported 0 known production vulnerabilities during this pass |
| Whitespace / temporary server | `git diff --check` passed; test server stopped |

The fresh database setup and committed regional seed were exercised twice in new local `dex_check_20260908_audit` / `dex_check_20260908_final` databases. They remain available for local review; the normal development database and production database were not migrated or modified. Real identification and email endpoints were disabled. The checked-in CI runs this same flow, but a remote GitHub Actions execution was not observed.

The first combined browser check caught an additional bootstrap race: an empty outbox could mint a second anonymous identity alongside the main bootstrap. The outbox now waits for an established owner and pending rows, with a regression test. Late responses are also rejected when localStorage has changed before the cross-tab event arrives.

## Deployment and practical limits

Apply `20260908120000_durable_admission_and_deletion` with the code via the existing Vercel build migration step. Runtime requires its three tables and asset-size column; this change is not compatible with the old schema. Existing assets count conservatively as 8 MiB. Review allowances in [DEVELOPMENT.md](../DEVELOPMENT.md): default spending reservations are $10/day and $300/month; actual provider billing is not reconciled and model-price changes require reviewing the estimate.

Private photos require a network connection to display. Public reference packs and durable queued photos remain available offline. Browsers without Web Locks retain pending work without transmitting it. Legacy recovery downloads a backup rather than guessing an owner or importing automatically. Rich content for newly logged outside-set species waits for the CLI sweep. The five existing global prose samples need reimporting and passing audits.

Arbitrary static/native hosting, a desktop detail-pane redesign, and branding/contrast remain outside this reliability pass. Static export is explicitly documented as experimental; `NEXT_PUBLIC_API_URL` alone is not a supported cross-origin/cookie/routing contract. No native passkey ceremony, physical iOS walk, live Blob outage or paid provider call was performed.

## For the merge

No commits, push or deployment were performed. Review this pass separately from the concurrent branding/architecture assets. Keep the SQL migration, generated-client contract, server/client lifecycle changes and regression tests together. Old handoffs and audit screenshots remain historical evidence; this findings document and the current development guide describe the new behavior.

The prose file driver also binds imports to the exact current prompt. Changed fact sheets or drafts invalidate existing answers/audits, keeping them as `.stale-*` backups; read-only imports refuse a mismatched prompt. Regeneration must finish before publication.
