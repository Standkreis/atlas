# Maintaining the agent harness

Owner: Sven Reiser. This implementation follows the owner's eleven decisions from 2026-09-08, including autonomous early-stage delivery. Policy owners are the root contract, GitHub policy and document policy; the skill holds workflow, helpers hold mechanics and hooks adapt those mechanics to Codex.

## Use and setup

Start Codex at this repository or in app/. The root contract explicitly routes app work to its nested instructions. The repository skill is discovered at `.agents/skills/standkreis-github/SKILL.md`; invoke it as `$standkreis-github` or let its description match tracked delivery. Claude loads the same contract through its root entry point; the Codex hooks are not automatically installed into Claude.

Requirements: Python 3.9+, git, authenticated GitHub CLI with repository and project access. `scripts/gh-project.sh fields` discovers linked boards without hardcoded repository or board IDs. If several are linked, set GH_PROJECT to the desired number. Missing access is reported, not repaired by changing credentials.

The Codex CLI used for validation is 0.153.4, with hooks enabled. Project hooks require the project's `.codex/` layer and the exact hook definitions to be trusted: inspect them with `/hooks` in Codex and trust them there. This is host setup, not a per-push approval gate. The repository does not bypass or write the host's trust store. Unknown shell syntax produces advisory context; the adapter is a mistake detector, not a security boundary. Post-tool checks observe selected literal local issue writes; the shared helper remains the primary state check.

Official references: [instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [skill discovery](https://learn.chatgpt.com/docs/build-skills), [hook schema and trust](https://learn.chatgpt.com/docs/hooks). Version-specific details belong here, not in every task's instructions.

## Maintenance

- Add instructions only for project decisions or demonstrated failures. Prefer an existing command/check when it can enforce the invariant; otherwise choose the narrowest instruction scope that fits. Do not bulk-import vendor manuals.
- Keep one policy owner. A workflow references it instead of redefining its states, authorization or evidence rules. New skills must own a distinct task, have precise triggers and be tried on realistic work.
- Changes to scripts run regression tests and the structural checker. Changes to instructions also require a behavioral review using the scenarios below. Structural checks cannot prove policy consistency or instruction following.
- Scope application tests to application changes. Never weaken a failing applicable check to deliver a harness change. Baseline CI and deployment failures are reported separately.

## Behavioral evaluation

Run these in an isolated workspace with mocked GitHub transport unless exercising the explicitly authorized pilot issue. Record actual results, including failures, in `docs/agents/evaluation.md`.

| Request/scenario | Observable result |
| --- | --- |
| Analyze a proposal and report back | No issue creation, push or implementation |
| Deliver an issue from a shared dirty checkout | Unrelated files and unpublished commits excluded |
| Review finds a defect on an existing PR | Same PR reused; Doing and draft until fixed |
| Board write has a bad second field | No writes occur |
| Board fails during a valid multi-field write | Partial outcome reported; no success or rollback claim |
| Merge targets an integration branch | Issue stays open; Done refused |
| Cancel an issue | NOT_PLANNED plus Cancelled; never Done |
| Complete a document-only issue | Associated default-branch PR evidence verified |
| Title contains quotes or shell syntax | Text passed literally, nothing executed |
| Distill a spec with historical screenshots | Stable spec links and referenced assets preserved |

Future model changes should rerun these scenarios. No model slug, fabricated confidence threshold or fixed context size is part of the project contract.
