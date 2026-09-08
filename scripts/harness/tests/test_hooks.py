import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[1] / "hooks.py"
spec = importlib.util.spec_from_file_location("harness_hooks", MODULE)
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)


class HooksTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name)
        subprocess.run(["git", "init", "-q", "-b", "main", str(self.repo)], check=True)

    def branch(self, name):
        subprocess.run(["git", "-C", str(self.repo), "symbolic-ref", "HEAD", "refs/heads/" + name], check=True)

    def test_blocks_docs_commit_on_default(self):
        problem, _ = h.commit_problem('git commit -m "docs: spec"', self.repo)
        self.assertIn("default branch", problem)

    def test_allows_issue_commit_and_cross_issue_reference(self):
        self.branch("task/7-example")
        self.assertEqual(h.commit_problem('git commit -m "#7 fixes dependency on #9"', self.repo), (None, None))

    def test_refuses_another_issues_message(self):
        self.branch("task/7-example")
        self.assertIn("another issue", h.commit_problem('git commit -m "#9 change"', self.repo)[0])

    def test_git_c_resolves_effective_checkout(self):
        problem, _ = h.commit_problem(f'git -C "{self.repo}" commit -m test', "/tmp")
        self.assertIn("default branch", problem)

    def test_quoted_git_commit_mention_is_not_a_commit(self):
        self.assertEqual(h.commit_problem('echo "git commit -m test"', self.repo), (None, None))

    def test_compound_without_directory_change_is_checked(self):
        self.assertIn("default branch", h.commit_problem('git add docs/a.md && git commit -m test', self.repo)[0])

    def test_unknown_directory_control_is_advisory(self):
        problem, warning = h.commit_problem('cd elsewhere && git commit -m test', self.repo)
        self.assertIsNone(problem)
        self.assertIn("working directory", warning)

    def test_branch_changes_are_advisory_in_both_directions(self):
        for initial, command in [("task/7-example", "git checkout main && git commit -m test"),
                                 ("main", "git switch -c task/7-example && git commit -m test")]:
            self.branch(initial)
            problem, warning = h.commit_problem(command, self.repo)
            self.assertIsNone(problem)
            self.assertIn("branch changes", warning)

    def test_codex_payload_produces_native_deny(self):
        payload = {"hook_event_name": "PreToolUse", "tool_name": "Bash", "cwd": str(self.repo),
                   "tool_input": {"command": "git commit -m test"}}
        r = subprocess.run([sys.executable, str(MODULE)], input=json.dumps(payload), text=True, capture_output=True, check=True)
        self.assertEqual(json.loads(r.stdout)["hookSpecificOutput"]["permissionDecision"], "deny")

    def test_non_shell_tools_pass(self):
        r = subprocess.run([sys.executable, str(MODULE)], input='{"tool_name":"Read"}', text=True, capture_output=True, check=True)
        self.assertEqual(r.stdout, "")
