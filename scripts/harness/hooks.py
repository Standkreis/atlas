#!/usr/bin/env python3
"""Codex hook adapter. Advisory on unknown shell syntax; no remote mutations."""
import json
from pathlib import Path
import re
import shlex
import subprocess
import sys


def git(cwd, *args):
    p = subprocess.run(["git", "-C", str(cwd), *args], capture_output=True, text=True)
    return p.stdout.strip() if p.returncode == 0 else None


def commands(command):
    lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|()\n")
    lexer.whitespace = " \t\r"
    lexer.whitespace_split = True
    lexer.commenters = "#"
    result, current = [], []
    for token in lexer:
        if token and all(c in ";&|()\n" for c in token):
            if current:
                result.append(current)
            current = []
        else:
            current.append(token)
    if current:
        result.append(current)
    return result


def commit_problem(command, cwd):
    parts = commands(command)
    # Do not pretend to resolve control flow or changing directories through shell text.
    if any(p[0] in ("cd", "pushd", "eval", "bash", "sh", "zsh") for p in parts):
        return None, "Commit guard could not resolve this shell's working directory; inspect the effective branch before committing."
    if any(p[0] == "git" and any(t in ("checkout", "switch", "symbolic-ref") for t in p[1:]) for p in parts):
        return None, "Commit guard cannot infer branch changes within a shell call; inspect the effective branch before committing."
    for part in parts:
        while part and (part[0] in ("command", "env") or re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", part[0])):
            part = part[1:]
        if not part or part[0] != "git":
            continue
        effective = Path(cwd)
        i = 1
        while i < len(part) and part[i].startswith("-"):
            if part[i] == "-C" and i + 1 < len(part):
                effective = (effective / part[i + 1]).resolve()
                i += 2
            elif part[i] == "-c" and i + 1 < len(part):
                i += 2
            else:
                return None, "Commit guard encountered unsupported git options; verify branch ownership."
        if i >= len(part) or part[i] != "commit":
            continue
        branch = git(effective, "branch", "--show-current")
        if not branch:
            return "Commit requires a named issue branch; detached or unreadable HEAD.", None
        default = git(effective, "symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD")
        default = default.removeprefix("origin/") if default else "main"
        if branch == default:
            return f"Commit on default branch {default!r} refused. Use an issue branch and PR, including for documents.", None
        match = re.fullmatch(r"(?:task|feature|bug-fix)/(\d+)-.+", branch)
        if not match:
            return "Commit requires task/ISSUE-slug, feature/ISSUE-slug or bug-fix/ISSUE-slug.", None
        messages = [part[j + 1] for j in range(i + 1, len(part) - 1) if part[j] in ("-m", "--message")]
        mentioned = set(re.findall(r"#(\d+)\b", " ".join(messages)))
        if mentioned and match[1] not in mentioned:
            return f"Commit message names another issue; current branch belongs to #{match[1]}.", None
    return None, None


def main():
    try:
        event = json.load(sys.stdin)
        if event.get("tool_name") not in ("Bash", "exec_command", "shell_command"):
            return
        tool_input = event.get("tool_input", {})
        command = tool_input.get("command", tool_input.get("cmd", ""))
        cwd = tool_input.get("workdir") or event.get("cwd") or str(Path.cwd())
        if event.get("hook_event_name") == "PreToolUse":
            problem, advisory = commit_problem(command, cwd)
            if problem:
                print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
                      "permissionDecision": "deny", "permissionDecisionReason": problem}}))
            elif advisory:
                print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": advisory}}))
        elif event.get("hook_event_name") == "PostToolUse":
            # Helper writes already read back and validate; inspect only raw issue writes.
            for part in commands(command):
                if len(part) < 4 or part[:2] != ["gh", "issue"] or part[2] not in ("edit", "close", "reopen"):
                    continue
                if not part[3].isdigit() or "--repo" in part or "-R" in part:
                    continue  # Cannot safely infer foreign repo or variable expansion.
                root = git(cwd, "rev-parse", "--show-toplevel")
                if not root:
                    continue
                p = subprocess.run([sys.executable, str(Path(root) / "scripts/harness/github.py"), "check", part[3]],
                                   cwd=cwd, capture_output=True, text=True, timeout=30)
                if p.returncode:
                    print(json.dumps({"systemMessage": "Tracker write landed; follow-up verification failed. " + p.stderr.strip()[:1500]}))
                    return
    except (ValueError, OSError, subprocess.TimeoutExpired) as error:
        print(json.dumps({"systemMessage": f"Harness hook could not verify this call: {type(error).__name__}. Inspect it directly."}))


if __name__ == "__main__":
    main()
