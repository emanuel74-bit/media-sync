## ADDED Requirements

### Requirement: Accepted planning artifacts authorize implementation

The workflow MUST bind implementation authority to a recorded SHA-256 digest of the exact proposal,
design, delta specifications, and normalized task definitions for one OpenSpec change. Task
normalization MUST change only a leading completed checkbox marker to an incomplete marker.
Acceptance metadata, task completion state, and evidence files MUST NOT affect the digest.

#### Scenario: Coordinator accepts exact planning input

- **GIVEN** committed planning artifacts and a clean recorded baseline SHA
- **WHEN** the coordinator records the planning SHA, artifact digest, identity, and timestamp
- **THEN** a later work order MAY use that acceptance commit or its descendant as its base
- **AND** recomputing the digest over unchanged semantic planning content produces the same value

#### Scenario: Planning scope changes after acceptance

- **WHEN** proposal, design, specification, task wording, ordering, additions, or removals change
- **THEN** the recorded artifact digest no longer matches
- **AND** preflight, checkpoint, and review validation MUST reject the stale acceptance until a
  coordinator records renewed acceptance

#### Scenario: Only task completion advances

- **WHEN** a task's leading checkbox changes between incomplete and complete without any other byte
  changing
- **THEN** the accepted artifact digest remains unchanged

### Requirement: Work orders define bounded repository operations

A work order MUST identify its schema version, order/role/change/task identity, accepted artifact
digest, base SHA, issuer and issue time, allowed/forbidden/protected paths, expected file
operations, applicable conventions/documents, focused commands, non-goals, and stop conditions.
Paths MUST be non-empty repository-relative POSIX paths, comparisons MUST be case-normalized on
Windows, and forbidden/protected scope MUST override allowed scope. Required documents and focused
command working directories MUST resolve physically inside the repository.

#### Scenario: Valid bounded work order

- **WHEN** every expected addition, modification, deletion, and rename endpoint is within allowed
  scope and outside forbidden/protected scope
- **THEN** the work order validates
- **AND** focused commands are represented as fixed working directories and argument arrays

#### Scenario: Invalid or ambiguous path

- **WHEN** an order contains an absolute path, empty path, `..` escape, repository escape,
  symlink/junction escape for a required document or command directory, case-ambiguous path,
  conflicting scope, undeclared deletion, or undeclared rename endpoint
- **THEN** validation fails before any implementation command runs

#### Scenario: Work order is not coordinator-issued

- **WHEN** the active work order lacks the configured coordinator issuer identity
- **THEN** preflight fails

### Requirement: Preflight preserves existing user state

Preflight MUST reject execution on `master`, detached HEAD, missing or schema-invalid work orders,
stale acceptance, unavailable bases, unknown OpenSpec changes/tasks, missing required documents,
invalid path scope, or unexplained current changes. For accepted pre-existing tracked and
untracked user files, it MUST record path/classification/filesystem-mode/size/content hashes
without recording file contents.

#### Scenario: Clean feature branch with permitted user state

- **GIVEN** a valid coordinator-issued order on a feature branch
- **WHEN** preflight recognizes the declared pre-existing tracked or untracked user files
- **THEN** it writes an ephemeral content-hashed baseline under `.agents/work/`
- **AND** it does not change or disclose those files' contents

#### Scenario: Unsafe execution context

- **WHEN** preflight runs on `master`, detached HEAD, or a worktree with unexplained state
- **THEN** it fails without modifying source, specifications, tasks, configuration, or evidence

### Requirement: Checkpoint enforces scope and focused verification

Checkpoint MUST revalidate acceptance and order identity, compute committed/index/worktree/untracked
changes relative to the declared base, classify additions/modifications/deletions/explicit
renames, enforce path scope and expected inventories, verify protected baseline hashes, run
`git diff --check`, execute focused commands exactly as declared, and emit an ephemeral normalized
report.

Recorded checkpoint and review command results MUST match the work order's exact ordered command
identities; a report MUST NOT substitute a different command even when its own checkpoint and
review snapshots agree with each other.

#### Scenario: Declared implementation passes checkpoint

- **WHEN** every current file operation matches the order and every focused command exits
  successfully
- **THEN** checkpoint succeeds
- **AND** its report contains the normalized complete operation and command-result inventories

#### Scenario: Scope or integrity violation

- **WHEN** a changed path is outside allowed scope, is forbidden/protected, has an undeclared
  operation, changes protected baseline content, or produces whitespace errors
- **THEN** checkpoint fails and identifies the violating operation

#### Scenario: Focused command fails

- **WHEN** a fixed focused command exits non-zero
- **THEN** checkpoint fails with that exact command/result
- **AND** subsequent commands MUST NOT be reported as successful

### Requirement: Reviews bind to exact implementation state

A review report MUST bind the work order, accepted artifact digest, base SHA, subject implementation
SHA, subject tree SHA, raw diff digest, scenario matrix, convention matrix, file-operation
inventory, findings, exact command results, verdict, and risk acceptances. Validation MUST reject
unresolvable or mismatched Git objects, stale work-order/artifact/diff/tree identity, incomplete
matrices/results, blocking verdicts, and unaccepted risks.

#### Scenario: Exact passing review

- **WHEN** a complete `pass` report matches the current implementation tree and all bound
  identities recompute exactly
- **THEN** review validation succeeds

#### Scenario: Implementation changes after review

- **WHEN** any non-evidence implementation, tooling, test, specification, task, ADR, convention,
  or operational-documentation content changes after the reviewed subject
- **THEN** review validation fails until a fresh report targets the new exact state

#### Scenario: Risk has no coordinator acceptance

- **WHEN** a report uses `pass-with-accepted-risks` and any risk lacks coordinator identity,
  acceptance timestamp, rationale, or follow-up disposition
- **THEN** validation treats the verdict as blocking

### Requirement: Evidence-only commits cannot modify reviewed content

Review and integration reports MUST be produced ephemerally before the coordinator records their
normalized snapshots under the change's evidence directory. An evidence-only commit MUST have the
exact reviewed subject SHA as its parent and MUST change only the expected evidence paths.

#### Scenario: Valid evidence-only child

- **WHEN** a child of the reviewed subject adds only the expected immutable report, work-order,
  and checkpoint snapshots under the subject evidence path
- **THEN** evidence-only validation succeeds

#### Scenario: Evidence commit includes another change

- **WHEN** the child modifies implementation, tests, specifications, tasks, ADRs, conventions,
  tooling, operational documentation, or an unexpected evidence path
- **THEN** evidence-only validation fails

#### Scenario: Active evidence is relocated by archive

- **WHEN** final integration validation targets an archived candidate
- **THEN** it resolves exactly one dated archive root at that candidate revision
- **AND** it maps each pre-archive implementation-evidence path to the corresponding archived path
- **AND** a remaining active root, missing archive root, or duplicate dated archive root fails

### Requirement: Repository verification is hermetic and non-source-modifying

The repository MUST expose root `npm run verify` backed by a pinned Node version, private root
package lock, and exact OpenSpec dependency. The pinned tool identity MUST cover the complete
resolved lock graph and byte identity of the installed executable dependency closure. Repository
mode MUST verify backend, frontend, OpenSpec, documentation links/paths, diff whitespace, and final
repository state without requiring an active work order or changing tracked or pre-existing
untracked user state.

#### Scenario: Repository verification succeeds

- **WHEN** repository mode runs on `master`, a feature branch, or an archived-change checkout with
  all sub-gates passing
- **THEN** it exits successfully with a final repository status report
- **AND** tracked and pre-existing untracked user state matches its starting identity

#### Scenario: Ambient or installed OpenSpec differs or is absent

- **WHEN** the globally installed OpenSpec command is absent or a different version, or any byte in
  the installed executable dependency closure differs from its pinned identity
- **THEN** repository verification still invokes the exact root-locked OpenSpec dependency

#### Scenario: A verifier rewrites source

- **WHEN** any sub-gate changes tracked content or pre-existing untracked user state
- **THEN** repository verification fails and reports the changed paths

### Requirement: Change verification includes the authorized inventory

The repository MUST expose root `npm run verify:change`. Change mode MUST require an active
integration work order, run checkpoint relative to its declared base, run every repository-mode
sub-gate, and emit the complete addition/modification/deletion/rename inventory.

#### Scenario: Integrated change matches its order

- **WHEN** the integrated branch matches the accepted integration work order and every repository
  sub-gate passes
- **THEN** change verification succeeds with the complete base-to-current operation inventory

#### Scenario: Change mode has no integration order

- **WHEN** change mode runs without a valid active integration work order
- **THEN** it fails before claiming repository completion

### Requirement: Final integration binds authorization and merge baselines separately

The integration work order MUST use an acceptance-bearing base SHA for implementation authority.
The final integration report MUST separately bind the complete first-parent commit sequence, raw
diff digest, and addition/modification/deletion/rename inventory from the accepted
`acceptance.baselineSha` through the archived candidate used for merge eligibility.

#### Scenario: Exact archived candidate is merge-eligible

- **WHEN** the work-order inventory matches its authorization base-to-candidate delta
- **AND** the final report matches the full acceptance-baseline-to-candidate history and inventory
- **AND** the target branch still equals `acceptance.baselineSha`
- **THEN** final integration validation succeeds

#### Scenario: Authorization and merge baselines are conflated

- **WHEN** a final report substitutes the later acceptance-bearing work-order base for the
  original accepted merge baseline
- **THEN** final integration validation fails

### Requirement: Root workflow tooling has isolated deterministic tests

Workflow scripts MUST be covered by Node built-in-runner tests under `test/agent-workflow/` using
isolated temporary Git repositories. Tests MUST cover malformed/stale identity, branch/base
conditions, path ambiguity/conflicts, pre-existing user state, every file-operation class,
focused-command failure, stale review identity, unaccepted risk, and valid/invalid evidence-only
commits without shared mutable state or skipped cases.

#### Scenario: Tooling tests run outside the product repository state

- **WHEN** the root workflow test suite runs
- **THEN** each Git-state case uses its own temporary repository and deterministic fixtures
- **AND** the working repository's current branch, index, worktree, user files, and Git
  configuration do not determine the result

### Requirement: Local workflow preserves human and coordinator authority

The workflow MUST identify machine-enforced guarantees separately from coordinator-enforced role
freshness and human/coordinator artifact or risk acceptance. It MUST NOT claim remote CI,
automatic merge, subjective review automation, or proof of conversational freshness.

#### Scenario: Scripts complete successfully

- **WHEN** every machine validation passes
- **THEN** merge eligibility still requires the coordinator-issued integration order, required
  fresh reviews, accepted risks, synchronized/archive state, exact evidence, and unchanged
  recorded master baseline

#### Scenario: Master advanced

- **WHEN** `master` no longer equals the recorded baseline at the final merge gate
- **THEN** the integration branch MUST be rebuilt and affected exact-state review repeated
- **AND** the workflow MUST NOT merge automatically
