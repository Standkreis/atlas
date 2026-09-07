# 🔥🔁 [0027] Handoff — the prose re-grill after the four fixes

> [0026](0026-prose-grill-findings.md) said **wait**: the text side is close (V1 on Sonnet 5 at 4.4 %, ≈ 1.9 % real), the Ökologie input leaks (11 embarrassing sentences in ten: metaweb `eats`/`eatenBy` rows and 1-record in-set pairs). This session makes the four fixes 0026 P5 named, re-runs the same species, and either writes the build draft or names the next leak.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-07 | Sven Reiser | [0026 findings](0026-prose-grill-findings.md) P5, doubts 1, 2, 7 · `app/scripts/prose-grill/` | One session, worktree `../standkreis-dex-prose` (branch `prose-2` from `main`). **Spend cap 4 $**, the cache makes unchanged calls free |

## 🔧 The four fixes, in `app/scripts/prose-grill/` only

| # | Fix | Rule |
| --- | --- | --- |
| F1 | **Edges carry their studies.** `sheets.mjs` keeps per edge the set of GloBI study citations (`study_citation` / `study_source_citation` of `json.v2`, or whatever field the API returns; look at one raw record first) | An `eats`/`eatenBy` pair whose studies are **all** metawebs (name-match the two 0026 found, Reji Chacko and Maiorano, plus any citation with "metaweb", "potential", "TETRA-EU", "Eurotrophic" — write the list in the script with a comment) is dropped from the prose sheet. Report how many edges each rule removes, per species |
| F2 | **Thin in-set pairs out of prose.** An in-set pair with one record from one study leaves the prose sheet (it stays a tile row, not this session's business) | Report the count |
| F3 | **"beobachtet" resolved one way.** Pick: the ECO prompt says "GloBI rows are observations; write them as *wurde beim Fressen von X beobachtet*" **and** the judge prompt says the same fact line grants "beobachtet/observed/recorded". Same for "Fressfeinde/predator/Falter" wording that only names the edge's kind | Zero artefact ❌ in the hand classification |
| F4 | **Validator accepts one paragraph** when the sheet has fewer than N lines (pick N from 0026's failures, say so) | V1 validator ✓ ≥ 38 / 40 |

Also from 0026 doubt 7: the audit answers **verdict first** (`{"verdict":"supported","why":…}`), max_tokens 2 000, so the judge cannot reverse itself mid-sentence.

## 📊 The runs

| Run | Same as 0026 | Gate |
| --- | --- | --- |
| P2' ECO on Sonnet 5, 19 species × de + en | yes | **0 embarrassing sentences** in the hand read of all 38 (not ten: read them all, it is 40 sentences × 2) |
| P1' V1 on Sonnet 5, 20 × de + en | yes | unsupported < 3 % by the judge; hand classification of every ❌ |
| Cost table | P4 recomputed with the new numbers | |

## 📐 If both gates pass: write the build draft as §📐 of the findings

The 0019 S4/S5 shape, unchanged unless the grill says otherwise: migration `ALTER TABLE "Taxon" ADD COLUMN "prose" JSONB` holding `{ de:{paragraphs:[{sentences:[{text,cites}]}]}, en, facts:[{id,source,text}], inputHash, model, judged:{supported,partial,unsupported}, at }`; the ETL step `prose` after `facts`, rewriting when `inputHash` changes; a Batches driver (`parseJson`, verdict-first audit); placement A on the species page (prose last, labelled "KI-Text aus den Quellen oben" / "AI text from the sources above"), the Ökologie paragraph under the Ökologie tile; the GloBI pruning of F1/F2 moved into `etl/content.ts` so tile and prose agree. Name the files, the tests, the i18n keys, the cost per region, and the owner's steps on Neon. Two tracks if it splits cleanly (A: ETL + migration, B: page), with the shared files named.

If a gate fails: name the leaking input with counts and stop. No build draft on a failed gate.

## 📐 Rules

| Rule | Detail |
| --- | --- |
| Where | `app/scripts/prose-grill/` (edit in place; `grill.json`, `results.json`, `report.md`, `drafts.md` rewritten). Nothing in `app/src/`, `app/etl/`, the schema, Neon |
| Data | Dev DB read-only. 0025 is merged, so the stratum fallback in `sheets.mjs` (0026 doubt 5) goes: read the i18n keys |
| Key | `ANTHROPIC_API_KEY` from `app/.env.local` in the worktree, name only, never printed. Thinking disabled |
| Deliverables | `docs/handoffs/0027-prose-regrill-findings.md`: per-fix counts, P1'/P2' tables against 0026's, the full hand read of the 38 Ökologie paragraphs marked sentence by sentence, cost, decisions, doubts, §📐 or the stop. Small commits on `prose-2`, `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, no push |
