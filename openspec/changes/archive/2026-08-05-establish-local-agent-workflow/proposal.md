## Why

The repository's completion workflow is currently backend-local, source-modifying, dependent on
an ambient OpenSpec installation, and unable to bind delegated work or reviews to accepted
artifacts and exact Git state. A deterministic repository-local workflow is needed so coordinated
fresh agents can implement, validate, review, integrate, and archive changes without overwriting
pre-existing user work or accepting stale evidence.

## What Changes

- Add repository-owned schemas for work orders, review reports, and integration reports, including
  exact artifact, commit, tree, diff, path-operation, command-result, scenario, convention, and
  risk-acceptance identity.
- Add local preflight, checkpoint, review-validation, and evidence-only-commit commands that
  enforce accepted planning-artifact digests, declared Git bases, path scope, file-operation
  inventories, protected user state, focused commands, and review freshness.
- Add a private root package, lockfile, pinned Node version, and exact OpenSpec 1.6.0 dependency so
  repository verification does not depend on ambient tooling.
- Establish non-source-modifying root `npm run verify` and work-order-aware
  `npm run verify:change` gates covering backend, frontend, OpenSpec, documentation links/paths,
  diff integrity, and repository state.
- Separate backend lint check/fix commands, add frontend typecheck/verify commands, and investigate
  Jest `--forceExit` within a bounded non-behavioral scope.
- Add append-only ADR-0018 for the accepted workflow, ADR-0019 for the root-test-layout exception,
  and ADR-0020 for complete tool, command, protected-state, and archive identities, plus the next
  stable `TOOL` and `TEST` convention rules; update `DOC-05`, agent instructions, and
  validation/tooling documentation to point to the canonical commands without duplicating
  protocol text.
- Add Node built-in-runner tests in isolated temporary Git repositories for valid and invalid work
  orders, path operations, user-state baselines, focused commands, stale reviews, risk acceptance,
  and evidence-only commits.
- Keep coordinator acceptance, fresh-role separation, semantic review, and explicit risk
  acceptance as process controls; scripts do not claim to prove conversational freshness or
  subjective correctness.

Explicit non-goals:

- No GitHub Actions, remote CI, branch-protection configuration, `CODEOWNERS`, or automatic merge.
- No application behavior, API, DTO, event, persistence, configuration, deployment, or public
  contract change.
- No `publishToken` change; that product concern belongs to the later
  `secure-public-stream-contract` pilot.
- No automation of subjective review or claim that scripts can prove an agent received no prior
  conversational context.

Applicable rules are `DOC-01`, `DOC-03`, `DOC-05`, `TOOL-01`, `TOOL-02`, `TOOL-05`,
`TEST-01`, `TEST-02`, `TEST-05`, and `TEST-06`. The accepted-workflow, root-test-layout, and
complete-identity decisions require ADR-0018, ADR-0019, and ADR-0020 plus new `TOOL` and `TEST`
rules under `DOC-01`; no existing ADR is superseded. ADR-0015 remains the governing decision for
OpenSpec adoption and repository-owned agent workflow.

## Capabilities

### New Capabilities

- `local-agent-workflow`: Repository-local requirements for accepted planning artifacts, bounded
  work orders, protected user state, checkpoints, exact-state review evidence, evidence-only
  commits, and deterministic repository/change verification.

### Modified Capabilities

None. The canonical `architecture-documentation-governance` capability remains unchanged; its
same-change maintenance duty applies to the affected validation/tooling documentation.

## Impact

Affected areas are root package/toolchain files, `scripts/agent-workflow/`, `test/agent-workflow/`,
backend/frontend package scripts, `.agents/templates/`, `.gitignore`, `backend/CONVENTIONS.md`,
`AGENTS.md`, `CLAUDE.md`, `docs/adr/`, `docs/architecture/validation-and-tooling.md`, and this
OpenSpec change. Root verification becomes the repository completion gate while existing
`backend npm run verify` remains its backend sub-gate under `TOOL-05`.

Compatibility is developer-workflow-only. Existing application runtime and deployment artifacts
are unchanged. Rollout is local and incremental through the schemas and commands in this change;
rollback reverts the new root tooling, scripts, instructions, rule, and ADR and restores the prior
backend/frontend commands. Build outputs may be regenerated only under already ignored output
directories, and verification must leave tracked and pre-existing untracked user state unchanged.
