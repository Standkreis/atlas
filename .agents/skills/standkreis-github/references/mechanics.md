# GitHub mechanics

Use installed `gh` and Python 3.9+. Resolve the repo with `gh repo view --json nameWithOwner,defaultBranchRef`. Keep commands in the checkout and pass absolute body-file paths. Use live CLI help or GraphQL introspection for uncertain capabilities.

| Operation | Command |
| --- | --- |
| Read issue | `gh issue view ISSUE --json number,title,body,state,stateReason,assignees,issueType,parent,subIssues,blockedBy` |
| Create issue | `gh issue create --title TITLE --body-file FILE --type Task --assignee @me` |
| Native hierarchy | `gh issue edit ISSUE --parent PARENT` |
| Board shape / values | `scripts/gh-project.sh fields` / `scripts/gh-project.sh get ISSUE` |
| Board write | `scripts/gh-project.sh set ISSUE Status Doing Effort medium` |
| Clear optional estimate | `scripts/gh-project.sh set ISSUE SPE --clear` |
| Audit state | `scripts/gh-project.sh check ISSUE` |
| Create/reuse draft PR | `scripts/gh-project.sh pr ISSUE --body-file FILE` |
| Mark reviewed PR ready | `gh pr ready PR_NUMBER`, then `scripts/gh-project.sh set ISSUE Status Review` |
| Return for fixes | `gh pr ready PR_NUMBER --undo`, then `scripts/gh-project.sh set ISSUE Status Doing` |
| Inspect CI and head | `gh pr view PR_NUMBER --json headRefOid,baseRefName,isDraft,statusCheckRollup,reviewDecision` |
| Merge checked head | `gh pr merge PR_NUMBER --squash --match-head-commit SHA` |
| Complete/recover | `scripts/gh-project.sh complete ISSUE --pr PR_NUMBER` |
| Cancel | `scripts/gh-project.sh cancel ISSUE --reason TEXT` |

Read inline threads using paginated GraphQL `pullRequest.reviewThreads` and `isResolved`; `gh pr view --json reviews,comments` does not include every inline thread. Verify API shapes before use.

The helper validates all fields before adding a board item or changing values, writes Status last and compares a fresh read with all requested values. Field writes are not atomic: a failure reports attempted fields and observed state. Inspect it before retrying; never claim rollback. Unknown or ambiguous boards/fields/options and truncated connections fail explicitly.

PR creation uses literal subprocess arguments and a temporary Markdown file, without shell interpolation. It discovers the default branch and reuses an open PR for the current head. Issue and PR numbers are separate.

`complete` handles a leaf's associated PR. For an epic, verify children and epic criteria first, then use a dedicated close-out PR referencing the epic and complete against it. Document-only delivery uses the same auditable evidence.

After raw issue edits, read affected fields back. After merge/closure, use the helper even if the board looks correct. If introducing board automation later, inspect enabled workflows before relying on it.
