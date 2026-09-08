---
name: standkreis-github
description: Carry standkreis-dex tracked work through GitHub issues, board fields, draft PRs, review, merge and cancellation. Use for GitHub delivery or a specific issue; do not turn an analysis-only request into tracker writes.
metadata:
  owner: Sven Reiser
---

# Standkreis GitHub

Read `docs/agents/github.md` for state and delivery policy. Root `AGENTS.md` owns authorization and project boundaries. Follow the user's stopping point; these stages are a workflow, not five mandatory conversations.

1. **Orient.** Resolve repository, branch and working-tree state. Read the issue, dependencies and acceptance criteria. Create an issue for new implementation work; use existing context for read-only review. Read [mechanics](references/mechanics.md) when operating GitHub.
2. **Implement.** Establish an isolated issue branch when needed, set Doing, implement and run scoped gates. Commit intended changes, push, and create/reuse the draft PR with `scripts/gh-project.sh pr ISSUE --body-file FILE`. Stop here when the user requested a draft or reviewable proposal.
3. **Review.** Judge the explicit diff and each criterion, including actual visual evidence for UI changes. Resolve defects, rerun affected checks and update the same PR. Once clean, mark it ready and set Review. Read unresolved review threads; do not infer their content from a summary count.
4. **Deliver.** When delivery is in scope, follow the canonical merge preconditions, merge the checked head and run `scripts/gh-project.sh complete ISSUE --pr PR_NUMBER`. Verify application deployment separately. Reconcile cancellation through `cancel`, not Done.
5. **Report.** Give resulting PR/issue state, checks and uncertainties. Continue authorized dependent work when useful; finish when the request is satisfied. No ritual next-command handoff is required.

Read `docs/agents/documents.md` when publishing specs, decisions or durable evidence. If credentials, repository rules or infrastructure block delivery, finish independent local work and report the actual blocker. Do not silently change repository, credentials or policy to get green.
