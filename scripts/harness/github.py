#!/usr/bin/env python3
"""Repository-aware GitHub operations. Stdlib only; never execute shell strings."""
import argparse
import datetime
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from urllib.parse import quote


class Failure(RuntimeError):
    pass


def run(*args, payload=None):
    result = subprocess.run(args, input=payload, text=True, capture_output=True)
    if result.returncode:
        raise Failure(result.stderr.strip() or f"{args[0]} exited {result.returncode}")
    return result.stdout.strip()


def gh(*args):
    return json.loads(run("gh", *args))


def graphql(query, **variables):
    result = gh_input({"query": query, "variables": variables})
    if result.get("errors"):
        raise Failure(json.dumps(result["errors"]))
    return result["data"]


def gh_input(payload):
    return json.loads(run("gh", "api", "graphql", "--input", "-", payload=json.dumps(payload)))


def norm(value):
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def one(items, description):
    if len(items) != 1:
        raise Failure(f"Expected one {description}; found {len(items)}")
    return items[0]


def nodes(connection, description):
    if connection["pageInfo"]["hasNextPage"]:
        raise Failure(f"Truncated {description}; pagination required before proceeding")
    return connection["nodes"]


FIELDS = """fields(first:100){pageInfo{hasNextPage} nodes{
... on ProjectV2Field{id name dataType}
... on ProjectV2SingleSelectField{id name dataType options{id name}}
}}"""
QUERY = """query($owner:String!,$name:String!,$number:Int!){
repository(owner:$owner,name:$name){
projectsV2(first:100){pageInfo{hasNextPage} nodes{id number title closed FIELDS}}
issue(number:$number){id number title state stateReason
assignees(first:100){pageInfo{hasNextPage} nodes{login}}
projectItems(first:100){pageInfo{hasNextPage} nodes{id project{id}
fieldValues(first:100){pageInfo{hasNextPage} nodes{
... on ProjectV2ItemFieldSingleSelectValue{name field{... on ProjectV2SingleSelectField{id}}}
... on ProjectV2ItemFieldNumberValue{number field{... on ProjectV2Field{id}}}
... on ProjectV2ItemFieldTextValue{text field{... on ProjectV2Field{id}}}
}}}}}}} """.replace("FIELDS", FIELDS)


class Repository:
    def __init__(self):
        self.repo = gh("repo", "view", "--json", "nameWithOwner,defaultBranchRef")
        self.full = self.repo["nameWithOwner"]
        self.owner, self.name = self.full.split("/")
        self.default = self.repo["defaultBranchRef"]["name"]

    def snapshot(self, number):
        data = graphql(QUERY, owner=self.owner, name=self.name, number=number)["repository"]
        boards = [p for p in nodes(data["projectsV2"], "linked boards") if not p["closed"]]
        if os.environ.get("GH_PROJECT"):
            boards = [p for p in boards if str(p["number"]) == os.environ["GH_PROJECT"]]
        board = one(boards, "open linked board (use GH_PROJECT to select)")
        fields = nodes(board["fields"], "board fields")
        issue = data["issue"]
        if issue is None:
            raise Failure(f"No issue #{number} in {self.full}")
        items = [i for i in nodes(issue["projectItems"], "issue board items") if i["project"]["id"] == board["id"]]
        if len(items) > 1:
            raise Failure("Issue has ambiguous board items")
        item = items[0] if items else None
        values = {}
        if item:
            for v in nodes(item["fieldValues"], "item values"):
                if "field" in v:
                    values[v["field"]["id"]] = v.get("name", v.get("number", v.get("text")))
        summary = {"number": number, "title": issue["title"], "state": issue["state"],
                   "stateReason": issue["stateReason"], "onBoard": bool(item),
                   "assignees": [a["login"] for a in nodes(issue["assignees"], "assignees")],
                   "fields": {f["name"]: values.get(f["id"]) for f in fields if f.get("dataType") in ("SINGLE_SELECT", "NUMBER", "TEXT")}}
        return {"board": board, "fields": fields, "issue": issue, "item": item, "summary": summary}

    def issue(self, number):
        return gh("issue", "view", str(number), "--repo", self.full, "--json",
                  "number,state,stateReason,closedByPullRequestsReferences")

    def pr(self, number):
        return gh("pr", "view", str(number), "--repo", self.full, "--json",
                  "number,state,baseRefName,headRefName,isDraft,mergeCommit,closingIssuesReferences,body,url")

    def prove_delivery(self, number, pr_number):
        pr = self.pr(pr_number)
        if pr["state"] != "MERGED" or pr["baseRefName"] != self.default or not pr["mergeCommit"]:
            raise Failure("Completion requires a PR merged into the current default branch")
        # Association is fetched from GitHub, never inferred from coincident issue/PR numbers.
        linked = any(i.get("number") == number and i.get("url", "").startswith(f"https://github.com/{self.full}/issues/")
                     for i in pr["closingIssuesReferences"])
        closed_by = any(p["number"] == pr_number and p.get("url") == f"https://github.com/{self.full}/pull/{pr_number}"
                        for p in self.issue(number)["closedByPullRequestsReferences"])
        if not linked and not closed_by:
            raise Failure(f"PR #{pr_number} has no verified closing association with issue #{number}")
        sha = pr["mergeCommit"]["oid"]
        comparison = gh("api", f"repos/{self.full}/compare/{quote(sha, safe='')}...{quote(self.default, safe='')}")
        if comparison["status"] not in ("ahead", "identical"):
            raise Failure("Merge commit is not reachable from the current default branch")
        return pr

    def prove_done(self, number):
        issue = self.issue(number)
        if issue["state"] != "CLOSED" or issue["stateReason"] != "COMPLETED":
            raise Failure("Done recovery requires an issue already closed as completed")
        for pr in issue["closedByPullRequestsReferences"]:
            try:
                return self.prove_delivery(number, pr["number"])
            except Failure:
                continue
        raise Failure("No associated default-branch merged PR proves completion; use complete ISSUE --pr PR")

    def validate_state(self, number, summary, fields, delivery=None):
        status = norm(next((v for k, v in fields.items() if norm(k) == "status"), None) or "Backlog")
        if status not in ("backlog", "next", "doing", "review", "done", "cancelled"):
            raise Failure(f"Unknown workflow state: {status}; inspect board configuration")
        closed = summary["state"] == "CLOSED"
        if status in ("next", "doing", "review") and not summary["assignees"]:
            raise Failure("Active work needs an assignee")
        if status in ("backlog", "next", "doing", "review") and closed:
            raise Failure("Closed issue cannot enter an active/backlog state; reconcile its closure reason")
        if status == "cancelled" and (not closed or summary["stateReason"] != "NOT_PLANNED"):
            raise Failure("Cancelled requires closure as not planned")
        if status == "done":
            if not closed or summary["stateReason"] != "COMPLETED":
                raise Failure("Done requires closure as completed")
            if delivery is None:
                self.prove_done(number)
        if status == "review":
            prs = gh("pr", "list", "--repo", self.full, "--state", "open", "--limit", "100",
                     "--json", "number,isDraft,baseRefName,closingIssuesReferences")
            if not any(not p["isDraft"] and p["baseRefName"] == self.default and
                       any(i["number"] == number and i.get("url", "").startswith(f"https://github.com/{self.full}/issues/")
                           for i in p["closingIssuesReferences"]) for p in prs):
                raise Failure("Review requires an associated non-draft PR targeting the default branch")
        for key, value in fields.items():
            if norm(key) == "spe" and value is not None and (not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0):
                raise Failure("SPE must be a positive finite number or cleared")

    def plan(self, snap, pairs):
        if not pairs or len(pairs) % 2:
            raise Failure("set requires FIELD VALUE pairs; use --clear as a value to clear an optional field")
        changes = []
        seen = set()
        for name, raw in zip(pairs[::2], pairs[1::2]):
            field = one([f for f in snap["fields"] if f.get("name") and norm(f["name"]) == norm(name)], f"field matching {name!r}")
            if field["id"] in seen:
                raise Failure(f"Duplicate field: {field['name']}")
            seen.add(field["id"])
            kind = field.get("dataType")
            if raw == "--clear":
                if norm(field["name"]) == "status":
                    raise Failure("Status cannot be cleared")
                value, expected = None, None
            elif kind == "SINGLE_SELECT":
                option = one([o for o in field["options"] if norm(o["name"]) == norm(raw)], f"option {raw!r} of {field['name']}")
                value, expected = {"singleSelectOptionId": option["id"]}, option["name"]
            elif kind == "NUMBER":
                try:
                    expected = float(raw)
                except ValueError:
                    raise Failure(f"{field['name']} requires a finite number")
                if not math.isfinite(expected):
                    raise Failure(f"{field['name']} requires a finite number")
                value = {"number": expected}
            elif kind == "TEXT":
                value, expected = {"text": raw}, raw
            else:
                raise Failure(f"Unsupported field type: {kind}")
            changes.append((field, value, expected))
        return sorted(changes, key=lambda c: norm(c[0]["name"]) == "status")

    def set(self, number, pairs, delivery=None):
        snap = self.snapshot(number)
        changes = self.plan(snap, pairs)
        expected = dict(snap["summary"]["fields"])
        expected.update({f["name"]: v for f, _, v in changes})
        self.validate_state(number, snap["summary"], expected, delivery)
        attempted = []
        try:
            item_id = snap["item"]["id"] if snap["item"] else graphql(
                "mutation($p:ID!,$i:ID!){addProjectV2ItemById(input:{projectId:$p,contentId:$i}){item{id}}}",
                p=snap["board"]["id"], i=snap["issue"]["id"])["addProjectV2ItemById"]["item"]["id"]
            for field, value, _ in changes:
                attempted.append(field["name"])
                inputs = {"projectId": snap["board"]["id"], "itemId": item_id, "fieldId": field["id"]}
                if value is None:
                    graphql("mutation($input:ClearProjectV2ItemFieldValueInput!){clearProjectV2ItemFieldValue(input:$input){projectV2Item{id}}}", input=inputs)
                else:
                    inputs["value"] = value
                    graphql("mutation($input:UpdateProjectV2ItemFieldValueInput!){updateProjectV2ItemFieldValue(input:$input){projectV2Item{id}}}", input=inputs)
            observed = self.snapshot(number)["summary"]
            mismatch = [f["name"] for f, _, v in changes if observed["fields"].get(f["name"]) != v]
            if mismatch:
                raise Failure(f"Read-back mismatch: {', '.join(mismatch)}")
            self.validate_state(number, observed, observed["fields"], delivery)
            return observed
        except (Failure, KeyError, ValueError) as error:
            try:
                observed = self.snapshot(number)["summary"]
            except Exception:
                observed = "unavailable"
            raise Failure(json.dumps({"error": str(error), "attemptedFields": attempted,
                                      "observed": observed, "warning": "Writes may have landed; no rollback was attempted"}))

    def complete(self, number, pr_number):
        delivery = self.prove_delivery(number, pr_number)
        # Validate board availability and target option before closing an issue.
        self.plan(self.snapshot(number), ["Status", "Done"])
        issue = self.issue(number)
        if issue["state"] == "CLOSED" and issue["stateReason"] != "COMPLETED":
            raise Failure("A cancelled issue cannot be completed implicitly")
        if issue["state"] == "OPEN":
            run("gh", "issue", "close", str(number), "--repo", self.full, "--reason", "completed")
        issue = self.issue(number)
        if issue["state"] != "CLOSED" or issue["stateReason"] != "COMPLETED":
            raise Failure("Issue closure read-back failed; board unchanged")
        return self.set(number, ["Status", "Done"], delivery=delivery)

    def cancel(self, number, reason):
        if not reason.strip():
            raise Failure("Cancellation needs a reason")
        self.plan(self.snapshot(number), ["Status", "Cancelled"])
        issue = self.issue(number)
        if issue["state"] == "CLOSED" and issue["stateReason"] != "NOT_PLANNED":
            raise Failure("A completed issue cannot be cancelled implicitly")
        if issue["state"] == "OPEN":
            run("gh", "issue", "close", str(number), "--repo", self.full,
                "--reason", "not planned", "--comment", reason)
        return self.set(number, ["Status", "Cancelled"])

    def draft_pr(self, number, body_file):
        issue = self.snapshot(number)["summary"]
        if issue["state"] != "OPEN":
            raise Failure("PR creation requires an open issue")
        branch = run("git", "branch", "--show-current")
        if not re.fullmatch(rf"(?:task|feature|bug-fix)/{number}-.+", branch):
            raise Failure(f"Expected issue #{number}'s branch, got {branch!r}")
        body = Path(body_file).read_text()
        body = f"Closes {self.full}#{number}\n\n" + body
        prs = gh("pr", "list", "--repo", self.full, "--head", branch, "--state", "open",
                 "--json", "number,url,baseRefName,isDraft")
        if prs:
            pr = one(prs, "open PR for this branch")
            if pr["baseRefName"] != self.default:
                raise Failure("Existing PR does not target the default branch")
            # Reuse without changing its review state or replacing a reviewed body.
            return {**pr, "reused": True}
        with tempfile.TemporaryDirectory(prefix="standkreis-pr-") as directory:
            path = Path(directory) / "body.md"
            path.write_text(body)
            url = run("gh", "pr", "create", "--repo", self.full, "--head", branch,
                      "--base", self.default, "--draft", "--title", issue["title"], "--body-file", str(path))
        pr = self.pr(int(url.rstrip("/").rsplit("/", 1)[-1]))
        if not pr["isDraft"] or pr["baseRefName"] != self.default or pr["headRefName"] != branch:
            raise Failure("PR was created but its read-back differs; inspect it before retrying")
        return pr


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("fields")
    for cmd in ("get", "set", "check", "pr", "complete", "cancel"):
        p = sub.add_parser(cmd)
        p.add_argument("issue", type=int)
        if cmd == "set":
            p.add_argument("pairs", nargs=argparse.REMAINDER)
        if cmd == "pr":
            p.add_argument("--body-file", required=True)
        if cmd == "complete":
            p.add_argument("--pr", required=True, type=int)
        if cmd == "cancel":
            p.add_argument("--reason", required=True)
    args = parser.parse_args(argv)
    repo = Repository()
    if args.command == "fields":
        data = graphql("query($owner:String!,$name:String!){repository(owner:$owner,name:$name){projectsV2(first:100){pageInfo{hasNextPage} nodes{id number title closed FIELDS}}}}".replace("FIELDS", FIELDS), owner=repo.owner, name=repo.name)
        result = nodes(data["repository"]["projectsV2"], "boards")
    elif args.command in ("get", "check"):
        result = repo.snapshot(args.issue)["summary"]
        if args.command == "check":
            repo.validate_state(args.issue, result, result["fields"])
    elif args.command == "set":
        result = repo.set(args.issue, args.pairs)
    elif args.command == "pr":
        result = repo.draft_pr(args.issue, args.body_file)
    elif args.command == "complete":
        result = repo.complete(args.issue, args.pr)
    else:
        result = repo.cancel(args.issue, args.reason)
    print(json.dumps({"verifiedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "result": result}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (Failure, OSError, ValueError, KeyError) as error:
        print(f"gh-project: {error}", file=sys.stderr)
        sys.exit(1)
