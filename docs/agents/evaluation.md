# Harness evaluation — 2026-09-08

Owner: Sven Reiser. Pilot: [issue #1](https://github.com/Standkreis/standkreis-dex/issues/1).

## Evidence

- 36 Python unittest cases passed locally on Python 3.9. Tests use mocked GitHub transport and disposable git repositories, never production data. Covered prevalidation before side effects, partial-write reporting, incorrect read-backs, Done/Cancelled semantics, integration-branch rejection, PR association and reachability, literal titles, PR reuse, hook payloads and real broken spec links.
- `python3 scripts/check-harness.py` passed. The checker verifies structure and literal pointers; it does not equate a deleted spec with a similarly numbered ADR.
- The skill-creator quick validator passed. Workflow and skill UI YAML parsed successfully. Its PyYAML dependency was installed in a temporary validation environment, not added to this project.
- The live helper discovered this repository's new linked board, added the pilot issue, set Doing and Effort medium, and verified them with a separate check. No SPE value was required. Board IDs and owner/repository names are not embedded in the helper.
- Work started from remote main in an isolated worktree. Existing local application commits and uncommitted changes were excluded.

## Independent forward review

A separate agent read the skill and raw repository artifacts with no network or writes. It evaluated three requests: review without publication, complete a PR merged into an integration branch, and resume an existing ready PR after a defect. It found the instructions respectively preserve the read-only scope, refuse premature completion, and return the same PR to draft/Doing.

That review reproduced three defects with in-memory probes: a foreign PR sharing a number could supply association evidence; an unrecognized board field could break lookup; a compound branch switch could make the hook inspect the wrong branch. All three were fixed and gained regression tests before publication. Unresolved shell branch changes now produce an advisory rather than a false enforcement claim.

## Limits

This is an independent scenario review plus deterministic script testing, not a measured model success-rate benchmark. Hook JSON payloads were exercised, but this session did not modify Codex's trust store or prove hooks active in a newly started host session. Codex requires review/trust through `/hooks`. No paid model API or application production key was used.

The live draft/merge outcome is recorded on the pilot issue and PR, rather than mirrored as mutable state in this document. Application builds are outside this harness-only diff; the application workflow now detects app-code changes while the separate harness job validates instructions and tooling.

## Communication preference review · 2026-09-08

The owner's concise, visual and ADHD-friendly review preference now lives in the shared root contract loaded by Claude and repository agents. Manual scenario review covered a one-line answer, a multi-part code review, an issue, a handoff and a delivery report. The rule keeps simple answers short; puts outcomes, actions and blockers first in larger responses; and uses purposeful emoji headings plus whitespace, lists or tables as navigation landmarks. It does not change authorization, evidence, testing or delivery requirements. No model success-rate benchmark was claimed.
