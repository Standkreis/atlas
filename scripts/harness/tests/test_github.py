import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / "github.py"
spec = importlib.util.spec_from_file_location("harness_github", MODULE)
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)


def fixture(status="Backlog", state="OPEN", reason="", on_board=True):
    fields = [
        {"id": "s", "name": "Status", "dataType": "SINGLE_SELECT", "options": [
            {"id": n.lower(), "name": n} for n in ["Backlog", "Next", "Doing", "Review", "Done", "Cancelled"]]},
        {"id": "e", "name": "Effort", "dataType": "SINGLE_SELECT", "options": [{"id": "low", "name": "low"}, {"id": "medium", "name": "medium"}]},
        {"id": "p", "name": "SPE", "dataType": "NUMBER"},
    ]
    return {"board": {"id": "board"}, "fields": fields, "issue": {"id": "issue"},
            "item": {"id": "item"} if on_board else None,
            "summary": {"number": 7, "title": 'A "quoted" $(touch /tmp/unsafe) title',
                        "state": state, "stateReason": reason, "assignees": ["owner"],
                        "fields": {"Status": status, "Effort": None, "SPE": None}}}


class MemoryRepo(g.Repository):
    def __init__(self, snap=None):
        self.full = "owner/repo"
        self.owner, self.name, self.default = "owner", "repo", "trunk"
        self.snap = snap or fixture()

    def snapshot(self, number):
        return copy.deepcopy(self.snap)

    def issue(self, number):
        return {"state": self.snap["summary"]["state"], "stateReason": self.snap["summary"]["stateReason"],
                "closedByPullRequestsReferences": []}


class BoardTests(unittest.TestCase):
    def test_bad_later_field_has_no_side_effect_even_off_board(self):
        repo = MemoryRepo(fixture(on_board=False))
        with patch.object(g, "graphql") as write:
            with self.assertRaises(g.Failure):
                repo.set(7, ["Status", "Doing", "DoesNotExist", "bad"])
            write.assert_not_called()

    def test_bad_later_option_has_no_side_effect(self):
        with patch.object(g, "graphql") as write:
            with self.assertRaises(g.Failure):
                MemoryRepo().set(7, ["Status", "Doing", "Effort", "typo"])
            write.assert_not_called()

    def test_nan_estimate_rejected_before_writes(self):
        for value in ("nan", "inf", "-1", "0"):
            with self.subTest(value=value), patch.object(g, "graphql") as write:
                with self.assertRaises(g.Failure):
                    MemoryRepo().set(7, ["SPE", value])
                write.assert_not_called()

    def test_duplicate_or_ambiguous_field_rejected(self):
        repo = MemoryRepo()
        with self.assertRaises(g.Failure):
            repo.plan(repo.snap, ["SPE", "1", "spe", "2"])
        repo.snap["fields"].append({"id": "p2", "name": "SPE!", "dataType": "NUMBER"})
        with self.assertRaises(g.Failure):
            repo.plan(repo.snap, ["SPE", "1"])

    def test_status_written_last_and_verified(self):
        repo, writes = MemoryRepo(), []

        def mutate(query, **variables):
            value = variables["input"]
            writes.append(value["fieldId"])
            repo.snap["summary"]["fields"][{"e": "Effort", "s": "Status"}[value["fieldId"]]] = {
                "medium": "medium", "doing": "Doing"}[value["value"]["singleSelectOptionId"]]
            return {}

        with patch.object(g, "graphql", side_effect=mutate):
            result = repo.set(7, ["Status", "Doing", "Effort", "medium"])
        self.assertEqual(writes, ["e", "s"])
        self.assertEqual(result["fields"]["Status"], "Doing")

    def test_unrecognized_board_field_does_not_break_status_lookup(self):
        repo = MemoryRepo()
        repo.snap["fields"].append({})
        self.assertEqual(repo.plan(repo.snap, ["Status", "Doing"])[0][0]["id"], "s")

    def test_partial_write_reports_observed_state_without_rollback(self):
        repo = MemoryRepo()

        def mutate(query, **variables):
            if variables["input"]["fieldId"] == "s":
                raise g.Failure("network failure")
            repo.snap["summary"]["fields"]["Effort"] = "medium"
            return {}

        with patch.object(g, "graphql", side_effect=mutate) as write:
            with self.assertRaises(g.Failure) as error:
                repo.set(7, ["Status", "Doing", "Effort", "medium"])
        report = json.loads(str(error.exception))
        self.assertEqual(report["observed"]["fields"], {"Status": "Backlog", "Effort": "medium", "SPE": None})
        self.assertEqual(write.call_count, 2)
        self.assertIn("no rollback", report["warning"])

    def test_successful_api_but_wrong_readback_is_failure(self):
        with patch.object(g, "graphql", return_value={}):
            with self.assertRaisesRegex(g.Failure, "Read-back mismatch"):
                MemoryRepo().set(7, ["Status", "Doing"])

    def test_missing_assignee_blocks_active_state(self):
        repo = MemoryRepo()
        repo.snap["summary"]["assignees"] = []
        with patch.object(g, "graphql") as write:
            with self.assertRaisesRegex(g.Failure, "assignee"):
                repo.set(7, ["Status", "Doing"])
            write.assert_not_called()

    def test_unmerged_work_can_be_doing_without_estimates(self):
        repo = MemoryRepo(fixture("Doing"))
        repo.validate_state(7, repo.snap["summary"], repo.snap["summary"]["fields"])

    def test_review_requires_non_draft_associated_pr(self):
        repo = MemoryRepo(fixture("Review"))
        prs = [{"isDraft": True, "baseRefName": "trunk", "closingIssuesReferences": [{"number": 7, "url": "https://github.com/owner/repo/issues/7"}]}]
        with patch.object(g, "gh", return_value=prs):
            with self.assertRaisesRegex(g.Failure, "non-draft"):
                repo.validate_state(7, repo.snap["summary"], repo.snap["summary"]["fields"])
            prs[0]["isDraft"] = False
            repo.validate_state(7, repo.snap["summary"], repo.snap["summary"]["fields"])

    def test_done_never_closes_open_issue(self):
        with patch.object(g, "run") as run, patch.object(g, "graphql") as write:
            with self.assertRaisesRegex(g.Failure, "closure as completed"):
                MemoryRepo().set(7, ["Status", "Done"])
            run.assert_not_called()
            write.assert_not_called()

    def test_cancelled_cannot_be_done_or_doing(self):
        for state in ("Done", "Doing"):
            with self.subTest(state=state):
                with self.assertRaises(g.Failure):
                    MemoryRepo(fixture("Cancelled", "CLOSED", "NOT_PLANNED")).set(7, ["Status", state])

    def test_optional_estimate_can_be_cleared(self):
        changes = MemoryRepo().plan(fixture(), ["SPE", "--clear"])
        self.assertIsNone(changes[0][1])
        with self.assertRaises(g.Failure):
            MemoryRepo().plan(fixture(), ["Status", "--clear"])

    def test_truncated_api_connection_is_not_silently_accepted(self):
        with self.assertRaisesRegex(g.Failure, "pagination"):
            g.nodes({"nodes": [], "pageInfo": {"hasNextPage": True}}, "fields")


class DeliveryTests(unittest.TestCase):
    def pr(self, **changes):
        return {"number": 9, "state": "MERGED", "baseRefName": "trunk", "mergeCommit": {"oid": "abc"},
                "closingIssuesReferences": [{"number": 7, "url": "https://github.com/owner/repo/issues/7"}], **changes}

    def test_integration_branch_merge_cannot_complete(self):
        repo = MemoryRepo()
        with patch.object(repo, "pr", return_value=self.pr(baseRefName="epic")), patch.object(g, "run") as run:
            with self.assertRaisesRegex(g.Failure, "default branch"):
                repo.complete(7, 9)
            run.assert_not_called()

    def test_unmerged_pr_cannot_complete(self):
        with patch.object(MemoryRepo, "pr", return_value=self.pr(state="OPEN")):
            with self.assertRaises(g.Failure):
                MemoryRepo().prove_delivery(7, 9)

    def test_unrelated_pr_cannot_complete(self):
        with patch.object(MemoryRepo, "pr", return_value=self.pr(closingIssuesReferences=[])):
            with self.assertRaisesRegex(g.Failure, "association"):
                MemoryRepo().prove_delivery(7, 9)

    def test_foreign_pr_with_same_number_does_not_prove_association(self):
        repo = MemoryRepo()
        with patch.object(repo, "pr", return_value=self.pr(closingIssuesReferences=[])), patch.object(repo, "issue", return_value={
            "closedByPullRequestsReferences": [{"number": 9, "url": "https://github.com/other/repo/pull/9"}]
        }):
            with self.assertRaisesRegex(g.Failure, "association"):
                repo.prove_delivery(7, 9)

    def test_merge_commit_must_still_be_on_default(self):
        with patch.object(MemoryRepo, "pr", return_value=self.pr()), patch.object(g, "gh", return_value={"status": "diverged"}):
            with self.assertRaisesRegex(g.Failure, "reachable"):
                MemoryRepo().prove_delivery(7, 9)

    def test_document_only_delivery_uses_same_merge_proof(self):
        with patch.object(MemoryRepo, "pr", return_value=self.pr()), patch.object(g, "gh", return_value={"status": "ahead"}):
            self.assertEqual(MemoryRepo().prove_delivery(7, 9)["number"], 9)

    def test_cancel_does_not_overwrite_completed(self):
        with patch.object(g, "run") as run:
            with self.assertRaisesRegex(g.Failure, "completed issue"):
                MemoryRepo(fixture("Done", "CLOSED", "COMPLETED")).cancel(7, "duplicate")
            run.assert_not_called()

    def test_cancellation_closes_as_not_planned_then_sets_cancelled(self):
        repo = MemoryRepo()

        def close(*args, **kwargs):
            self.assertIn("not planned", args)
            repo.snap["summary"].update(state="CLOSED", stateReason="NOT_PLANNED")

        def mutate(query, **variables):
            repo.snap["summary"]["fields"]["Status"] = "Cancelled"
            return {}

        with patch.object(g, "run", side_effect=close), patch.object(g, "graphql", side_effect=mutate):
            result = repo.cancel(7, "superseded")
        self.assertEqual(result["stateReason"], "NOT_PLANNED")
        self.assertEqual(result["fields"]["Status"], "Cancelled")

    def test_pr_title_is_literal_and_default_branch_discovered(self):
        repo, calls = MemoryRepo(), []

        def run(*args, **kwargs):
            calls.append(args)
            if args[0] == "git":
                return "task/7-title"
            content = Path(args[args.index("--body-file") + 1]).read_text()
            self.assertIn("Closes owner/repo#7", content)
            return "https://github.com/owner/repo/pull/9"

        with tempfile.TemporaryDirectory() as d:
            body = Path(d) / "body.md"
            body.write_text("A literal `code` example and $HOME.")
            with patch.object(g, "run", side_effect=run), patch.object(g, "gh", return_value=[]), patch.object(repo, "pr", return_value={"isDraft": True, "baseRefName": "trunk", "headRefName": "task/7-title"}):
                repo.draft_pr(7, body)
        created = calls[-1]
        self.assertEqual(created[created.index("--title") + 1], repo.snap["summary"]["title"])
        self.assertEqual(created[created.index("--base") + 1], "trunk")

    def test_existing_pr_is_reused_without_mutation(self):
        repo = MemoryRepo()
        with tempfile.TemporaryDirectory() as d:
            body = Path(d) / "body.md"
            body.write_text("Updated change")
            with patch.object(g, "run", return_value="task/7-title") as run, patch.object(g, "gh", return_value=[{"number": 9, "baseRefName": "trunk"}]):
                self.assertTrue(repo.draft_pr(7, body)["reused"])
                self.assertEqual(run.call_count, 1)


if __name__ == "__main__":
    unittest.main()
