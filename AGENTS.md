# Atlas — agent contract

Personal atlas over open biodiversity data. Owner: Sven Reiser. Application code and npm commands live in `app/`; repository tooling and documents live at the root.

## Scope and delivery

- Complete the user's requested work. An analysis-only request ends with findings; it does not create issues, publish documents or implement a proposal.
- Early-stage authorization: agents may commit, push, merge and deploy to production within the requested scope without additional confirmation. Run applicable checks first, verify delivery and report what landed. This does not authorize unrelated changes or destructive data operations. A user's narrower task instruction takes precedence.
- Inspect the tree and branch before editing. Preserve other sessions' changes and unpublished commits. Use an isolated worktree when publishing from a shared or dirty checkout would include unrelated work. Stage named paths, never the whole shared tree.
- Durable changes travel through an issue branch and PR, including specs and decisions. Implementation opens one draft PR; review makes it ready. For tracked work, read `.agents/skills/standkreis-github/SKILL.md` before GitHub operations. Small explanations and read-only investigations need no issue.
- Delegate when an independent task benefits from it and the host allows it. Give each worker bounded ownership. No mandatory file-count threshold or model-specific context ceiling.
- Report evidence, uncertainty and delivery state concisely. Challenge assumptions when evidence warrants it. Attribution must identify the agent actually used; do not append a fixed Claude model identity.

## Communication and review experience

- Write for Sven's ADHD-friendly scanning: lead with the outcome, then decisions, actions, blockers and delivery state before supporting detail. Keep paragraphs short and avoid walls of text.
- Make multi-part output visually navigable with concise headings, whitespace, bullets, checklists, tables or small diagrams when they improve scanning. Keep simple answers simple.
- Use relevant emoji in headings and status markers as stable visual landmarks across conversations, issues, handoffs, findings, reviews and status reports. Keep them purposeful and consistent so they guide rather than distract.
- Default to concise summaries with progressive detail. Link evidence instead of repeating large logs or diffs.

## Project boundaries

- Read `app/AGENTS.md` before application work, including when starting from the repository root.
- Local development and checks use local Postgres, never Neon. Additive schema changes use reviewed, checked-in SQL migrations, verified on a disposable local database. Production migrations run through Vercel's build. Do not run `prisma migrate reset`, `prisma db push` or `prisma migrate dev`. Removing or transforming existing data requires a separately agreed migration plan.
- Keep secret values out of the conversation and logs. Do not read or print `.env*` values or expose `vercel env pull` output. Inspect names/presence only; use configured environments without displaying credentials.
- Session drafts, model judges and experiments use the agent host's available model tools. Never use the application's production model key for them. A separately budgeted API run requires task-specific authorization, regardless of provider.
- Fill regional data in the development DB first; use the documented transfer process for production. Keep adding regions through the UI out of scope until the owner reopens it.

## Sources and checks

| Need | Source |
| --- | --- |
| Product contract | `docs/specs/0001-standkreis-dex-the-first-walk.md`, `docs/GLOSSARY.md` |
| Current and historical work | `docs/ROADMAP.md`; GitHub issues for new tracked work |
| Deployment and environment names | `docs/DEPLOY.md` |
| ETL operations | `app/etl/README.md` |
| Tracker and delivery policy | `docs/agents/github.md` |
| Documents and durable evidence | `docs/agents/documents.md` |
| Harness maintenance and evaluation | `docs/agents/harness.md` |

Run `python3 scripts/check-harness.py` and `python3 -m unittest discover -s scripts/harness/tests -v` for harness changes. Harness-only changes do not need application builds. Application gates live in `app/AGENTS.md`. A failed applicable check blocks delivery; report infrastructure failures distinctly from defects.

## Code Review Rules

Review the explicit diff range and the issue's acceptance criteria. Identify concrete failure conditions and cite evidence; distinguish confirmed defects from unresolved questions. Review may conclude that no defects were found. Do not invent a numerical confidence threshold or quota of findings.
