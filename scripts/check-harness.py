#!/usr/bin/env python3
"""Check harness structure and literal local links; never waive deleted specs."""
import ast
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent


def check(root=ROOT):
    errors = []
    required = ["AGENTS.md", "CLAUDE.md", "app/AGENTS.md", ".codex/hooks.json",
                "docs/agents/github.md", "docs/agents/documents.md", "docs/agents/harness.md",
                "scripts/gh-project.sh", "scripts/harness/github.py", "scripts/harness/hooks.py"]
    for name in required:
        if not (root / name).is_file():
            errors.append(f"Missing {name}")
    if errors:
        return errors
    if "@AGENTS.md" not in (root / "CLAUDE.md").read_text():
        errors.append("CLAUDE.md must load the shared AGENTS.md")
    try:
        config = json.loads((root / ".codex/hooks.json").read_text())
        for event in ("PreToolUse", "PostToolUse"):
            for group in config["hooks"][event]:
                for hook in group["hooks"]:
                    if hook["type"] != "command" or "scripts/harness/hooks.py" not in hook["command"]:
                        errors.append(f"Unexpected hook adapter for {event}")
    except (KeyError, ValueError) as e:
        errors.append(f"Invalid hooks: {e}")
    skills = list((root / ".agents/skills").glob("*/SKILL.md"))
    names = set()
    for path in skills:
        content = path.read_text()
        front = re.match(r"\A---\n(.*?)\n---\n", content, re.S)
        if not front:
            errors.append(f"No frontmatter: {path}")
            continue
        name = re.search(r"^name: ([a-z0-9-]+)$", front[1], re.M)
        if not name or name[1] != path.parent.name or name[1] in names:
            errors.append(f"Invalid/duplicate skill name: {path}")
        else:
            names.add(name[1])
        if not re.search(r"^description: .+", front[1], re.M):
            errors.append(f"Missing skill description: {path}")
    if not skills:
        errors.append("No discoverable repository skill")
    documents = [root / "AGENTS.md", root / "CLAUDE.md", root / "app/AGENTS.md"]
    documents += list((root / "docs/agents").rglob("*.md"))
    documents += list((root / ".agents").rglob("*.md"))
    for path in documents:
        content = path.read_text()
        for target in re.findall(r"\]\(([^)]+)\)", content):
            if re.match(r"(?:https?://|mailto:|#)", target):
                continue
            target = target.split("#")[0]
            if not (path.parent / target).exists():
                errors.append(f"Broken Markdown link: {path.relative_to(root)} -> {target}")
        # Inline absolute-to-repository pointers are explicitly rooted, not guessed fallbacks.
        for target in re.findall(r"`((?:docs/agents|scripts/harness|\.agents/skills)/[\w./-]+\.(?:md|py))`", content):
            if not (root / target).is_file():
                errors.append(f"Broken repository pointer: {target}")
    for path in (root / "scripts").rglob("*.py"):
        try:
            ast.parse(path.read_text(), filename=str(path))
        except SyntaxError as e:
            errors.append(str(e))
    return errors


if __name__ == "__main__":
    findings = check()
    print("\n".join(findings) if findings else "Harness structure and links verified")
    sys.exit(bool(findings))
