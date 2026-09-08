import importlib.util
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("check_harness", ROOT / "scripts/check-harness.py")
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class CheckerTests(unittest.TestCase):
    def test_deleted_spec_is_a_broken_link_even_with_replacement_adr(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            for folder in (".agents", ".codex", "docs/agents", "scripts"):
                shutil.copytree(ROOT / folder, root / folder, ignore=shutil.ignore_patterns("__pycache__"))
            (root / "app").mkdir()
            for name in ("AGENTS.md", "CLAUDE.md", "app/AGENTS.md"):
                shutil.copy(ROOT / name, root / name)
            (root / "docs/adr").mkdir()
            (root / "docs/adr/0099-replacement.md").write_text("A replacement")
            (root / "docs/agents/record.md").write_text("[Spec](../specs/0099-original.md)")
            self.assertTrue(any("0099-original" in e for e in checker.check(root)))
