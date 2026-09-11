# Germany catalogue cutover: temporary Vercel WAF fence

Prepared 11 September 2026 for owner review under #28/#29. This is an
operator procedure, not evidence that a firewall rule was staged or activated.
No Vercel configuration was changed during preparation.

## Bound project and observed baseline

- Team scope: `standkreis` (`team_4rVdNuX63Z4XJLBmTsz8GUUa`).
- Project: `standkreis-dex` (`prj_QkDLo33iixnovjvg5ozYMwBzen9e`).
- Checked CLI: Vercel `59.14.0` at
  `/Users/svenreiser/.npm/_npx/10fdc7ef9e7933e1/node_modules/.bin/vercel`.
- The authenticated principal is a confirmed team `OWNER`; host plan is Pro.
- Read-only `GET /v1/security/firewall/config` returned `active:null`,
  `draft:null`, `versions:[]`.
- Read-only CLI status returned `firewallEnabled:false`, zero custom rules,
  zero IP blocks, zero active custom/system bypasses and zero draft changes.
- Project configuration has SSO `all_except_custom_domains`, no project
  protection-bypass record, no deploy hooks, and one enabled hourly Vercel
  cron at `/api/cron/sweep`. The current cron handler has a 300-second maximum,
  a 240-second work deadline and participates in `CatalogueWriteAdmission`.

Any difference from this baseline at execution time is scope drift: stop and
review it. In particular, do not publish this rule together with someone
else's draft, do not place it behind a custom bypass, and do not assume SSO
prevents an authenticated request to an old immutable deployment.

## Exact reviewed rule payload

The operator stores this exact JSON in an owner-only file, for example
`/private/reviewed/germany-catalogue-cutover-deny.json`:

```json
{
  "name": "Germany catalogue cutover - deny all HTTP",
  "description": "Temporary #29 maintenance fence for Production and Preview",
  "active": true,
  "conditionGroup": [
    {
      "conditions": [
        { "type": "path", "op": "pre", "value": "/" },
        { "type": "environment", "op": "eq", "value": "production" }
      ]
    },
    {
      "conditions": [
        { "type": "path", "op": "pre", "value": "/" },
        { "type": "environment", "op": "eq", "value": "preview" }
      ]
    }
  ],
  "action": { "mitigate": { "action": "deny" } }
}
```

Conditions inside one group are ANDed; the two groups are ORed. Vercel defines
Request Path as always starting with `/`, so the two groups cover every HTTP
path in Production and Preview. There is no `actionDuration`: the deny is
evaluated per request and must not leave persistent client blocks after the
rule is removed. `deny` returns 403 and stops rule evaluation.

This is a project-level rule, not a team-level rule. Development/local traffic
is intentionally outside the fence. Direct PostgreSQL connections are also
outside Vercel WAF and require the separate process/session controls below.

## Why this is the exact CLI input shape

The installed CLI's `firewall rules add --help` documents JSON mode as a full
rule object with `name`, `conditionGroup` and `action`. Its bundled
`handleJsonAdd` parses the `--json` argument, requires those three fields,
requires each group to have `conditions`, each condition to have `type` and
`op`, and requires `action.mitigate.action`. It then passes this normalized
full object as the `value` of:

```json
{
  "action": "rules.insert",
  "id": null,
  "value": { "...": "the exact rule object above" }
}
```

to `PATCH /v1/security/firewall/config?projectId=...`. The installed CLI's
`--yes` accepts the create confirmation but does **not** publish: its
`offerAutoPublish` auto-publishes only in an interactive TTY when prompts were
not skipped. `firewall publish --yes` is therefore the distinct activation
step and activates `draft` with
`POST /v1/security/firewall/config/draft/activate`. Removing a rule similarly
stages `rules.remove`; the subsequent publish makes that removal live.

The public API schema accepts condition types `path` and `environment`,
operators `pre` and `eq`, and mitigation action `deny`:

- https://vercel.com/docs/vercel-firewall/vercel-waf/rule-configuration
- https://vercel.com/docs/rest-api/security/update-firewall-configuration
- https://vercel.com/docs/vercel-firewall/firewall-concepts

Custom WAF rules are already available on the installed plan. Vercel's access
rules allow a team member/project administrator to apply them; the checked
principal is owner. Read permission and the exact empty configuration were
verified, but write permission was deliberately not exercised.

## Operator commands: inspect, stage and publish

Run from a stable shell. Do not enable shell tracing, and keep all captured
outputs owner-only because future configurations may contain private network
conditions.

```sh
umask 077
VERCEL_CLI=/Users/svenreiser/.npm/_npx/10fdc7ef9e7933e1/node_modules/.bin/vercel
PROJECT_ID=prj_QkDLo33iixnovjvg5ozYMwBzen9e
TEAM_SCOPE=standkreis
RULE_NAME='Germany catalogue cutover - deny all HTTP'
RULE_FILE=/private/reviewed/germany-catalogue-cutover-deny.json

"$VERCEL_CLI" firewall status --json --project "$PROJECT_ID" --scope "$TEAM_SCOPE"
"$VERCEL_CLI" firewall rules list --expand --json --project "$PROJECT_ID" --scope "$TEAM_SCOPE"
"$VERCEL_CLI" firewall diff --json --project "$PROJECT_ID" --scope "$TEAM_SCOPE"
"$VERCEL_CLI" firewall system-bypass list --json --project "$PROJECT_ID" --scope "$TEAM_SCOPE"
"$VERCEL_CLI" api "/v1/security/firewall/config?projectId=$PROJECT_ID" --scope "$TEAM_SCOPE" --raw
```

Require the observed baseline above. Then stage, but do not yet publish:

```sh
RULE_JSON=$(jq -c . "$RULE_FILE")
"$VERCEL_CLI" firewall rules add --project "$PROJECT_ID" --scope "$TEAM_SCOPE" --json "$RULE_JSON" --yes
"$VERCEL_CLI" firewall rules list --expand --json --project "$PROJECT_ID" --scope "$TEAM_SCOPE"
"$VERCEL_CLI" firewall diff --json --project "$PROJECT_ID" --scope "$TEAM_SCOPE"
```

Require one enabled rule in the draft, exact equality of its projected
`name`/`description`/`active`/`conditionGroup` with `RULE_FILE`,
`.action.mitigate.action == "deny"`, no non-null duration/bypass/rate-limit/
redirect action, and position zero. Because the approved baseline has no
other rule, the insert is necessarily highest priority. If another rule or
draft now exists, stop; do not silently reorder or publish it. If the stage
itself must be abandoned, first prove no unrelated draft appeared, then use
`firewall discard --yes`.

The activation command authorized by the approved conditional procedure is:

```sh
"$VERCEL_CLI" firewall publish --yes --project "$PROJECT_ID" --scope "$TEAM_SCOPE"
```

Immediately re-read config/status/rules/diff. Require:

- `active.firewallEnabled` is true and `active.rules` contains only this rule
  at index zero with the exact conditions and deny action;
- no draft remains and no bypass exists;
- unauthenticated `GET /api/health` on the public Production custom domain is
  403;
- authenticated requests to `/api/health` on the current and at least one old
  immutable Production URL, plus the current and at least one old Preview URL,
  are 403; an unauthenticated SSO redirect is not proof of WAF enforcement;
- firewall events attribute the denies to this rule and there is no matching
  application-function invocation.

Capture `active.version` as `DENY_CONFIG_VERSION` for break-glass re-fencing:

```sh
DENY_CONFIG_VERSION=$("$VERCEL_CLI" api \
  "/v1/security/firewall/config?projectId=$PROJECT_ID" \
  --scope "$TEAM_SCOPE" --raw | jq -er '.active.version')
```

## Existing and non-HTTP writer drain

Publishing a WAF rule prevents new matching requests; it does not cancel
requests already executing. Before invoking the importer:

1. Determine the configured maximum duration of every still reachable old
   deployment and wait at least that long after verified WAF activation. The
   current project/cron value is 300 seconds, but do not project it onto an old
   deployment without evidence.
2. Confirm the hourly cron did not invoke the function after the fence; if one
   began before activation, wait for completion. The current handler is
   admission-aware, but an old handler cannot be assumed to be.
3. Inventory and stop operator laptops, background shells, ETL processes and
   any external scheduler with direct database credentials. Reconfirm that
   there are no deploy hooks or scheduled GitHub production writers.
4. Inspect database activity for unexplained writers. Then let the checked
   importer close `CatalogueCutoverGate` and require
   `CatalogueWriteAdmission` to drain to zero. Admission drain covers checked
   writers; it is not evidence about old code that never admitted itself.

WAF must be active before the production `apply` CLI starts. Consequently the
HTTP outage includes apply-side source validation, target-plan regeneration,
gate/drain time, the transaction and post-commit verification—not only the
139-second transaction-era rehearsal observation.

## Remove, verify service, and re-fence on failure

After the importer and an independent direct-database audit prove the intended
committed state and safe gate state, resolve the exact rule ID from the active
configuration. Stage only its removal:

```sh
RULE_ID=$("$VERCEL_CLI" firewall rules list --json --project "$PROJECT_ID" --scope "$TEAM_SCOPE" | jq -er --arg name "$RULE_NAME" '.rules[] | select(.name == $name) | .id')
"$VERCEL_CLI" firewall rules remove "$RULE_ID" --yes --project "$PROJECT_ID" --scope "$TEAM_SCOPE"
"$VERCEL_CLI" firewall diff --json --project "$PROJECT_ID" --scope "$TEAM_SCOPE"
```

Require that the draft contains only removal of `RULE_ID`, then publish:

```sh
"$VERCEL_CLI" firewall publish --yes --project "$PROJECT_ID" --scope "$TEAM_SCOPE"
```

Require zero custom rules, zero bypasses, no draft, and successful health and
reviewed smoke journeys on Production and Preview. The initial baseline had no
active config/version, so do not falsely describe this as activation of a
pre-existing baseline version; the supported normal revert is remove and
publish, followed by the zero-rule semantic check.

If service reopening fails or data state becomes uncertain, immediately
re-activate the retained deny version while database maintenance remains
closed. With an owner-only file containing exactly `{}` at
`/private/reviewed/empty-object.json`:

```sh
"$VERCEL_CLI" api "/v1/security/firewall/config/$DENY_CONFIG_VERSION/activate?projectId=$PROJECT_ID" --scope "$TEAM_SCOPE" -X POST --input /private/reviewed/empty-object.json
```

Then re-verify the 403 fence and investigate; do not announce success or retry
the import blindly.

## Approval contract

The repository requires a separately agreed concrete production plan and
distinct action-specific execution-manifest files. It does not require three
separate conversational approval turns. One explicit owner approval may cover
this exact preservation/source scope, fresh target planning, the exact-bound
conditional apply, and the guarded inverse under its unchanged-state
predicates. The operator still creates and checks distinct `plan`, `apply` and
`recover` manifest files with the fingerprints available at each boundary and
must verify that the recorded owner approval covers that action. Ask the owner
again only if the source/preservation scope, action, target, capacity decision,
rule semantics or other material premise drifts; mechanical refresh of the
already-approved exact bindings is not new authority.
