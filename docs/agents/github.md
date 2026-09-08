# GitHub and delivery policy

Owner: Sven Reiser. Root `AGENTS.md` owns authorization.

## One tracker

GitHub Issues hold active status, assignee and acceptance criteria for work started under this harness. Resolve the repository from the checkout. Capture implementation work with an outcome and verifiable acceptance criteria; use native parent/sub-issue and blocking relationships when useful. Use Task, Bug, Feature or Epic according to purpose and assign active work to its actual owner (`@me` for the solo workflow).

Existing roadmap entries and handoffs remain historical evidence and product context. When resuming one, create or link its active issue and replace that item's mutable roadmap status with the link. Do not bulk-migrate old milestones, renumber documents or rewrite another session's handoff.

## State

| Status | Meaning |
| --- | --- |
| Backlog | Captured; readiness not established |
| Next | Acceptance criteria and dependencies make it ready to start |
| Doing | Implementation or requested fixes remain |
| Review | A non-draft PR is ready and awaiting review or approval |
| Done | Acceptance criteria satisfied; repository deliverables landed on the default branch |
| Cancelled | Discontinued, superseded or duplicate; claims no delivery |

Both Doing and Review can contain unmerged work. Completed and not-planned closures are different outcomes, including for document-only issues. Containers close only when their children have resolved and their own criteria are satisfied; resolved children do not necessarily mean delivered code.

Use `scripts/gh-project.sh` for board reads and writes. It resolves the linked open board and field IDs live; `GH_PROJECT` selects among multiple boards. Active states require an assignee. Effort (low/medium/high) and positive SPE estimates are optional planning aids, not permission gates, context-token budgets or automatic model configuration. Parents need no estimate.

This board has no built-in status/closure workflows: merging a GitHub PR closes linked issues; the helper reconciles board state afterward. Keep status ownership here. Future automation must distinguish completion from cancellation and must never close an issue just because someone selected Done. Do not enable competing unconditional closed-to-Done workflows.

## Branch, PR and review

- Branch from the current remote default branch with `gh issue develop ISSUE --name task/ISSUE-slug --base DEFAULT`. Use feature/, bug-fix/ or task/ according to issue type. Do not publish unrelated local commits.
- Implementation commits and pushes, then creates or reuses one draft PR through the helper's `pr` command. Its title follows the fetched issue title; its body describes final behavior and validation and carries a closing reference. Quotes in titles are valid: helpers pass arguments without a shell.
- Review the committed diff from its merge-base and the actual acceptance criteria. Run scoped gates and inspect visual evidence for UI work. Significant findings return work to Doing and the PR to draft. Update the existing PR throughout.
- A clean review marks the PR ready and sets Review. In the solo early stage, human approval is not a separate requirement unless the user or repository protection requires it. The implementing agent may perform a deliberate review; an independent reviewer is useful when available, not compulsory ceremony.

## Merge and close

Before merging, verify the PR targets the current default branch, CI for its current head is green, review requests are resolved, the diff contains only authorized work and issue criteria are met. Pass the checked head to `gh pr merge --match-head-commit SHA --squash` to prevent merging an unchecked update. Never bypass a failed applicable check or branch protection.

Merge first, then use `complete ISSUE --pr PR_NUMBER`. Issue and PR numbers are distinct; fetch the PR number. The helper proves the PR merged into the current default branch, checks that its merge commit is reachable there and verifies issue association. It closes a still-open issue if its closing reference did not fire, sets Done and reads back the outcome. Merging into an epic/integration branch leaves the issue open.

Manual Done is recovery: allowed only for an issue closed as completed with verified default-branch PR evidence. It never closes the issue. If recovering from failed automation, report the reason and verified state. Use `cancel ISSUE --reason TEXT` for intentional cancellation; it closes as not planned and verifies Cancelled. Completed issues cannot be cancelled by the helper.

Remove only clean, disposable worktrees after merge verification. Do not force-delete branches or worktrees with unreviewed changes, or delete another session's worktree. Verify remote branch deletion separately from local cleanup.

Reports name the PR, merge commit, issue/board state and verification time. Main-branch code is not proof of successful deployment: inspect deployment and relevant health/smoke evidence separately for application releases. For an epic, distill lasting decisions and verify its criteria before closure; do not auto-close solely because its last child merged.
