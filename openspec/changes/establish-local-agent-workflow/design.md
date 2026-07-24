## Context

The repository currently has no root package. Backend `npm run verify` is the completion gate
under `TOOL-05`, but it runs ESLint with `--fix`, regenerates tracked TypeScript build metadata,
does not verify the frontend, relies on an ambient OpenSpec CLI, and has no permanent Markdown
link check. The initial baseline reconciliation confirmed those side effects and verified that the
current backend suite passes only by forcing Jest exit.

The repository uses OpenSpec under ADR-0015 and `DOC-05`, with `backend/CONVENTIONS.md` as current
engineering law and append-only ADRs under `DOC-01`/`DOC-03`. The new workflow is a tooling and
architecture decision, so it requires ADR-0018 and the next stable `TOOL` rule. Existing
`TOOL-05` remains the backend sub-gate.

Current supported tooling observed at planning time is Node 22.22.0, npm 10.9.4, and
`@fission-ai/openspec` 1.6.0. Backend and frontend retain their existing independent lockfiles.
The local `.claude/settings.local.json` is pre-existing user state and must remain untouched.

Stakeholders are maintainers coordinating AI-assisted changes, fresh implementer/reviewer roles,
and developers running completion checks locally. There is no remote CI or branch-protection
service in scope.

Applicable rules are `DOC-01`, `DOC-03`, `DOC-05`, `DOC-06`, `TOOL-01`, `TOOL-02`, `TOOL-05`,
`TEST-01`, `TEST-02`, `TEST-05`, and `TEST-06`. ADR-0015 remains authoritative for OpenSpec
adoption; ADR-0017 and `DOC-06` require the affected validation/tooling documentation to stay
current. The retired LikeC4 model remains absent under ADR-0016.

## Goals / Non-Goals

**Goals:**

- Bind implementation authority to an accepted, deterministic digest of exact OpenSpec planning
  artifacts and a declared Git baseline.
- Give each implementer or integration role one explicit work order with repository-relative path
  scope, expected file operations, required evidence, and fixed commands.
- Protect pre-existing tracked and untracked user state with content hashes that never record file
  contents.
- Compute complete committed, staged, unstaged, untracked, deletion, and rename inventories
  relative to the declared base.
- Bind review and integration evidence to exact commits, trees, raw diffs, work orders, accepted
  artifacts, scenarios, convention IDs, commands, findings, and accepted risks.
- Establish hermetic, non-source-modifying repository and change verification from the root.
- Test tooling failure/success behavior in isolated temporary Git repositories.
- Preserve coordinator ownership of acceptance, task truth, role freshness, risk acceptance,
  integration, archive, and final fast-forward eligibility.

**Non-Goals:**

- Remote CI, GitHub Actions, branch protection, `CODEOWNERS`, or automatic merging.
- Proving an agent has no inherited conversational context.
- Automating semantic/subjective review or coordinator risk judgment.
- Application behavior, APIs, DTOs, events, persistence, configuration, deployment, or
  `publishToken`.
- Treating per-agent ignored work orders as mergeable repository evidence.
- Replacing backend/frontend dependency lockfiles or changing application dependencies.

## Decisions

### Accept exact planning artifacts before implementation

The coordinator records `baselineSha`, `planningSha`, and a SHA-256 `artifactDigest` in
`acceptance.json`. The digest input is the sorted repository-relative path and exact bytes of
`proposal.md`, `design.md`, every delta-spec file, and normalized `tasks.md`. Each sorted record is
framed as the UTF-8, slash-separated path, one NUL byte, the ASCII decimal content-byte length, one
NUL byte, and the content bytes. Task normalization changes only a leading `[x]` or `[X]` marker
to `[ ]`; all wording, ordering, additions, removals, and other bytes remain semantic.
`acceptance.json`, task completion state, and evidence files are excluded.

The planning artifacts are committed first as `planningSha`. The coordinator then records
acceptance in a separate commit without changing those artifacts. That acceptance commit is the
first permissible implementation base or declared ancestor. A semantic planning change requires a
new digest and renewed acceptance.

Alternative: bind only to a planning commit. Rejected because task checkbox progress would require
re-acceptance while wording changes could be obscured among unrelated commit content.

### Separate process controls from machine-enforced guarantees

Scripts enforce schema validity, digests, Git ancestry/state, path scope, file-operation identity,
commands, evidence structure, review freshness, and accepted-risk metadata. The coordinator
enforces role freshness, issues/accepts work orders, owns `tasks.md`, accepts artifacts and risks,
and chooses integration order. Reviewers remain responsible for semantic correctness.

Alternative: encode a fully autonomous agent state machine. Rejected because repository scripts
cannot prove conversational freshness, human intent, or subjective review quality.

### Use versioned JSON contracts and one ephemeral active work order

Tracked draft-2020-12-compatible JSON schemas and examples live under `.agents/templates/`.
Ephemeral execution state lives only under ignored `.agents/work/`. A work order includes:

- schema/work-order/change identity, role, task IDs, accepted digest, base SHA, issuer, and issue
  time;
- allowed, forbidden, and protected path sets;
- expected additions, modifications, deletions, and explicit rename pairs;
- conventions, required documents, fixed working-directory/argument-array commands, non-goals,
  and stop conditions.

Paths are non-empty repository-relative POSIX paths. Absolute paths, `..`, repository escapes,
and case-ambiguous paths are invalid; Windows comparisons are case-normalized. Expected operations
must be allowed, while forbidden/protected scope always wins. Deletions and rename pairs are
explicit.

Alternative: free-form Markdown orders. Rejected because field identity, path scope, and exact
validation would remain ambiguous.

### Protect baseline state and compute file operations from all Git layers

Preflight rejects `master`, detached head, invalid/stale orders, unavailable bases, missing
changes/tasks/documents, path conflicts, undeclared required operations, and unexplained current
changes. It writes `.agents/work/baseline.json` containing path, classification, size, and
content hash for pre-existing tracked/untracked user files, never contents.

Checkpoint recomputes acceptance/order validity, compares the base commit with current commits,
index, worktree, and untracked files, and enables explicit rename detection. It normalizes one
inventory of additions, modifications, deletions, and source/destination rename pairs. It rejects
out-of-scope or undeclared operations, changed protected baselines, whitespace errors, or failed
focused commands and writes an ephemeral report without modifying tracked artifacts.

Commands are executed with fixed executable/argument arrays and explicit repository-relative
working directories; no shell interpolation is permitted.

Alternative: rely on `git diff` of the worktree alone. Rejected because it omits commits, staged
state, untracked additions, and reliable deletion/rename identity.

### Bind reviews to exact implementation state

A review report records work-order digest, accepted digest, base/subject/tree SHAs, raw
base-to-subject diff digest, scenario and convention matrices, file-operation inventory, commands
and results, findings with file/line evidence, verdict, and risks. Verdicts are `pass`,
`changes-required`, or `pass-with-accepted-risks`. The last verdict blocks unless every risk has
coordinator identity, timestamp, rationale, and disposition.

Review validation resolves every object, recomputes the work order/diff/tree, requires the current
implementation tree to equal the reviewed subject, and rejects missing matrices/results,
blocking verdicts, stale reports, and incomplete risk acceptance. Any non-evidence change
invalidates review.

Alternative: store only prose and a commit SHA. Rejected because a SHA alone does not prove which
diff, work order, scenarios, rules, file operations, or commands were reviewed.

### Allow only validated evidence-only children of reviewed commits

Completed reports are first produced under `.agents/work/`. The coordinator copies a normalized
work-order/checkpoint/report snapshot to
`openspec/changes/<change-id>/evidence/<subject-sha>/`. A valid evidence-only commit has the exact
reviewed subject as parent and changes only the expected evidence paths. It cannot modify
implementation, tests, specifications, tasks, ADRs, conventions, tooling, or operational
documentation.

This narrowly permits immutable evidence to be recorded after review without treating that child
commit as a new implementation requiring the same semantic review.

Alternative: commit reports beside implementation before review. Rejected because reviewers must
bind to a final implementation tree and report output does not exist until after review.

### Make root verification hermetic and non-source-modifying

The root private package pins Node 22.22.0 in `.nvmrc` and exact
`@fission-ai/openspec` 1.6.0 in `package-lock.json`. Root scripts invoke the pinned dependency,
not an ambient global CLI.

Repository mode runs:

1. backend `npm run verify`;
2. frontend `npm run verify`;
3. pinned `openspec validate --all`;
4. repository Markdown relative-link/path validation with explicit documented template
   placeholders;
5. `git diff --check`;
6. a final state/inventory comparison proving tracked and pre-existing untracked state is
   unchanged.

Change mode requires an integration work order, runs checkpoint, then every repository-mode check,
and emits the complete operation inventory relative to the order's base. Repository mode is valid
on `master`, feature branches, and archived-change checkouts without an active order.

Backend `lint` becomes check-only and `lint:fix` owns mutation. Frontend receives `typecheck` and
`verify`. Ignored build outputs may be regenerated, but tracked/untracked user state must be
unchanged. The current Jest `--forceExit` is investigated with `--detectOpenHandles`; it is removed
only if the handle can be fixed without production behavior/architecture/contract changes.

Alternative: retain directory-specific manual commands. Rejected because they omit frontend,
pinned OpenSpec, docs, complete state integrity, and one authoritative completion result.

### Put root tooling tests under `test/agent-workflow`

`TEST-01`/`TEST-02` govern backend TypeScript tests. Root ESM tooling tests use Node's built-in test
runner under `test/agent-workflow/*.test.mjs`, matching `scripts/agent-workflow/` by concern rather
than the backend `src/` tree. Tests create isolated temporary Git repositories and fixed fixture
files; they do not depend on the working repository's current branch or user configuration.
ADR-0018 and the new `TOOL` rule record this explicit root-tooling exception.

Alternative: place tooling tests in `backend/test/`. Rejected because the scripts are root
repository tools, not backend application units, and must run without backend Jest/TypeScript.

### Integrate, archive, and merge sequentially

Schema/governance work precedes protocol tooling; protocol tooling precedes the verifier.
Coordinator-owned instruction/task reconciliation follows implementation. A dedicated integration
order uses the original baseline and the authorized union of every expected operation/commit.

A fresh implementation review targets the exact integrated implementation SHA. After validated
evidence, the coordinator reconciles tasks, syncs canonical specs, archives the change, and obtains
a fresh final integration review of the exact archive SHA. The final evidence commit is merged to
unchanged `master` with `--ff-only`, followed by root repository verification on `master`.

Alternative: merge parallel branches opportunistically. Rejected because dependency order,
unexpected conflicts, review freshness, and final archive identity would become ambiguous.

## Risks / Trade-offs

- [Local-only gates can be skipped] → `DOC-05`, the new `TOOL` rule, agent instructions, evidence
  reports, and coordinator merge discipline make the commands authoritative; no remote enforcement
  is claimed.
- [Git state differs across Windows case/line-ending behavior] → normalize comparison case on
  Windows, use Git object/diff data for content identity, test case ambiguity and CRLF behavior,
  and verify final state hashes.
- [Path rules become over-complex] → use strict repository-relative POSIX validation and explicit
  precedence; reject ambiguity rather than infer intent.
- [Schemas can drift from scripts] → validate examples and every input against the tracked schemas;
  cover both valid and invalid fixtures.
- [Evidence reports can become stale] → bind to exact work-order/artifact/diff/tree identity and
  invalidate after non-evidence changes.
- [Verification is slow] → keep focused checkpoint commands for implementation loops and reserve
  full repository/change modes for completion gates.
- [Jest open-handle fix expands scope] → use a bounded investigation; retain `--forceExit`, record
  the cause/risk, and propose a separate change if the fix requires runtime or architecture work.
- [Root dependency pin duplicates package management] → root lockfile owns repository tools only;
  backend/frontend lockfiles remain independent.

## Migration Plan

1. Commit and accept the exact OpenSpec planning artifacts.
2. Add ADR-0018, conventions, contract schemas/examples, ignore rule, and coordinator instruction
   reconciliation.
3. Add protocol scripts and isolated root-tooling tests.
4. Add the pinned root package/verifier and update backend/frontend scripts.
5. Run focused checkpoints and the integrated change gate; obtain and validate a fresh review.
6. Reconcile tasks, synchronize the new canonical capability spec, archive the change, and run
   repository verification.
7. Obtain the exact-archive integration review, record it through a validated evidence-only
   commit, fast-forward unchanged `master`, and verify again.

Rollback reverts the foundation commits and restores the prior backend/frontend commands and
instructions. Application state and deployment require no migration or rollback.

## Open Questions

None. OpenSpec package identity and Node version were verified during planning. Any production
behavior needed to remove Jest `--forceExit` becomes a separate change rather than an unresolved
foundation decision.
