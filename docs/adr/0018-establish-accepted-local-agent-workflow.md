# ADR-0018: Establish an accepted local-agent workflow

- **Status**: Accepted
- **Date**: 2026-07-24
- **Related rules**: TOOL-09, DOC-05

## Context

The repository uses OpenSpec to define non-trivial changes before implementation, but the
existing local workflow does not bind implementation authority to exact accepted planning
artifacts. It also cannot reliably prove that an agent stayed inside an assigned file scope, that
a review covers the current Git tree, or that a review-evidence commit contains no source change.

The repository currently has no remote CI or protected-branch enforcement. Local completion
therefore needs a deterministic repository-level verifier rather than an informal composition of
workspace commands. That verifier must not rewrite source or tracked build caches while it checks
them.

Fresh implementer and reviewer roles, planning acceptance, integration order, and risk acceptance
are coordination decisions. A local script can validate their records, but it cannot prove that a
person or agent was genuinely independent or had the authority to accept a risk.

## Decision

We will use a repository-owned, local-only protocol for accepted OpenSpec changes:

1. The coordinator records the clean Git baseline, the committed planning revision, and a
   deterministic digest of the exact proposal, design, delta specs, and normalized task
   definitions before implementation begins.
2. Versioned JSON contracts define bounded work orders, exact-state review reports, and
   integration reports. Ephemeral active work orders live under the ignored `.agents/work/`
   boundary.
3. Repository scripts enforce schema validity, accepted-planning digests, Git ancestry and object
   identity, additions/modifications/deletions/renames, path scope, protected pre-existing state,
   fixed commands, review freshness, evidence-only commits, and recorded risk dispositions.
4. Root `npm run verify` is the hermetic repository completion gate. Root
   `npm run verify:change -- <change-id>` adds accepted-planning, integration-work-order,
   checkpoint, and complete file-operation-inventory gates before exact-state review. Review and
   evidence records use later dedicated validators. The root toolchain pins its supported Node
   and OpenSpec versions.
5. The coordinator remains responsible for issuing and accepting work orders, keeping
   `tasks.md` truthful, assigning fresh roles, choosing sequential integration order, and
   fast-forwarding only the fully validated candidate.
6. A human remains responsible for accepting the plan and any residual risk. Machine validation
   verifies the recorded identity, timestamp, rationale, and disposition; it does not grant that
   authority.
7. This decision adds no remote CI, branch-protection rule, automatic merge, or product contract
   change.

## Consequences

Once implemented, the repository can reject stale reviews, undeclared file operations, changed
planning artifacts, source-bearing evidence commits, and verifier-created source mutations before
a local merge. Work orders and reports are portable, reviewable data rather than agent-specific
prompt text.

The protocol adds schemas, fixtures, scripts, tests, and a root package boundary that must be
maintained together. Fresh-role separation and human authority remain process guarantees, so a
passing script result is necessary but not sufficient evidence of semantic correctness.

Rollback is operationally straightforward: restore the previous workspace-local validation
commands and agent instructions, and remove the root orchestration scripts and package boundary.
This ADR remains as append-only history, and a later decision must supersede it before reversing
the convention rules.

We rejected binding work only to a planning commit because ordinary task-checkbox progress would
either invalidate that binding or conceal semantic task edits. We rejected worktree-only diffs
because they omit committed, staged, deletion, and reliable rename state. We also rejected both an
ambient/manual verifier and a fully autonomous agent state machine: the former is not
reproducible, while the latter cannot establish human authority or genuine reviewer independence.
