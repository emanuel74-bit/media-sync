# Media Sync Repository Instructions

## Canonical project sources

Use each source for its own purpose. Do not duplicate its content into another source.

- `backend/CONVENTIONS.md` is the current coding-rule registry for naming, structure,
  layering, wiring, testing, and tooling. Refer to rules by stable ID.
- `docs/adr/` contains append-only architectural decisions and their rationale.
- `openspec/specs/` describes the system's current intended observable behavior.
- `openspec/changes/` contains proposed behavior and implementation work that is not
  yet part of the canonical specification.
- Source code, tests, and deterministic validation show the current implementation
  and provide completion evidence.

If `CONVENTIONS.md` is at the repository root rather than under `backend/`, use that
actual path everywhere in these instructions.

Do not import the full conventions registry into this file. It is large. Read the
relevant categories and linked ADRs on demand before designing or editing code.

When these sources conflict, do not silently choose one. Report the conflict and
identify which artifact must be reconciled.

## Required orientation

Before modifying code:

1. Inspect the relevant implementation, tests, public contracts, and current Git diff.
2. Read the active OpenSpec change artifacts, when the task belongs to a change.
3. Read the relevant feature page under `docs/features/` and subsystem trace under
   `docs/subsystems/`, then verify their claims against code and tests.
4. Read the relevant rules in `backend/CONVENTIONS.md`.
5. Follow links from those rules to relevant ADRs in `docs/adr/`.
6. State the affected rule IDs in the plan or implementation summary.

Do not infer current behavior only from specs or documentation in this brownfield
repository. Verify it against code and tests.

Feature/subsystem pages are derived, lower-authority orientation. Update them in the
same change when responsibilities, module boundaries, public surfaces, dependency
direction, state/persistence ownership, events, jobs, subsystem/integration flows,
failure behavior, idempotency, or consistency guarantees materially change. They
never override OpenSpec, conventions, ADRs, code, or tests.

## Change classification

### Trivial change

A formal OpenSpec change is optional only when all of these are true:

- The change is isolated and low risk.
- It does not add or change observable behavior.
- It does not change a public contract, schema, event, architecture, or tooling.
- It does not require a new or changed ADR.
- It does not introduce or reverse a durable convention.

For a trivial change: inspect, implement the smallest change, run focused validation,
then run the required completion validation.

### Non-trivial change

Use OpenSpec for:

- New features or capabilities.
- Observable behavior changes.
- API, DTO, event, persistence, configuration, or schema changes.
- Cross-feature or cross-module changes.
- Architectural changes.
- Significant refactors.
- Compatibility, rollout, migration, or rollback concerns.

## OpenSpec workflow

For non-trivial work:

1. Use `/opsx:explore` when requirements or approach are unclear.
2. Use `/opsx:propose <descriptive-change-name>` to create the proposal, delta specs,
   design, and tasks.
3. Review the generated artifacts against code, `backend/CONVENTIONS.md`, and ADRs.
4. Stop for user review before implementation unless the user explicitly requested
   end-to-end execution.
5. Use `/opsx:apply` to implement the approved change incrementally.
6. Keep `tasks.md` accurate. Do not check a task off before its work and validation
   are complete.
7. Run focused validation after each meaningful implementation group.
8. Run `npm run verify` before claiming completion.
9. Reconcile implementation discoveries back into the change artifacts.
10. Use `/opsx:sync` and `/opsx:archive` only after implementation and specifications
    agree and required validation passes.

OpenSpec adoption is incremental. Do not attempt to reverse-engineer specifications
for the entire existing system before doing useful work. Add or improve canonical
specs when a real change touches that capability.

## Specifications

OpenSpec specifications describe observable requirements and contracts.

- Use clear MUST/SHOULD/MAY language.
- Give each requirement concrete scenarios.
- Prefer GIVEN/WHEN/THEN for scenarios.
- Include errors, empty states, retries, idempotency, and compatibility behavior when
  relevant.
- Do not put ordinary code-style rules in behavioral specs.
- Do not describe planned behavior as already implemented.
- Delta specs must clearly identify added, modified, or removed behavior.

## Designs and architecture decisions

`design.md` explains how one OpenSpec change will be implemented. It is not a
replacement for a durable ADR.

Create an ADR under `docs/adr/` when required by `DOC-01`, including changes to:

- Architecture.
- Public contracts.
- Tooling behavior.
- Module or service boundaries.
- Persistence or communication patterns.
- Difficult-to-reverse technical choices.

Use `docs/adr/template.md`. ADRs are append-only. To replace a decision, add a new
numbered ADR that supersedes the old ADR and update the old ADR's status; never
rewrite its historical content.

The OpenSpec design and tasks must reference every ADR created or superseded by the
change.

## Convention changes

`backend/CONVENTIONS.md` remains the single source of truth for current backend rules.

- Refer to existing rules by stable ID.
- Append new rules with the next free ID in the correct category.
- Never renumber existing rules.
- Retire rules instead of deleting them.
- If a rule's meaning reverses, retire it and add a new rule ID.
- Do not create a new convention merely to document a one-off implementation choice.
- When a convention comes from an architectural decision, cite its ADR.

## Implementation discipline

- Follow the approved OpenSpec scope and tasks.
- Preserve unrelated behavior.
- Prefer small, reviewable changes.
- Do not add speculative abstractions.
- Update tests together with behavior.
- Update barrels, diagrams, ADRs, and conventions when their existing rules require it.
- Do not bypass repository tooling or weaken tests to make validation pass.
- Surface unexpected architectural or requirement conflicts before expanding scope.

## Completion evidence

A change is not complete until:

- Relevant focused tests pass.
- `npm run verify` passes.
- OpenSpec artifacts match the implementation.
- Required ADR and convention updates are present.
- No task is falsely marked complete.
- The final report lists changed files, relevant convention rule IDs, commands run,
  results, and any remaining risks.

If validation cannot run, say exactly why and do not claim the change is complete.

<!-- media-sync-ai-workflow:start -->
## Spec-driven repository workflow

### Canonical sources

Use each artifact only for its intended responsibility:

- `backend/CONVENTIONS.md` — current backend engineering rules. Cite stable rule IDs.
- `docs/adr/` — append-only architectural and tooling decisions.
- `openspec/specs/` — canonical intended observable behavior.
- `openspec/changes/` — proposed behavior, design, and implementation tasks.
- `docs/index.md` — navigation dashboard only; it is not an authority.
- Source code, tests, and deterministic validation — implementation evidence.

Do not duplicate these sources. When they conflict, report the conflict and identify
which artifact must be reconciled.

### Required orientation

Before changing code:

1. Inspect the relevant implementation, tests, public contracts, and current Git diff.
2. Read the active OpenSpec change when the task belongs to one.
3. Read the relevant rules in `backend/CONVENTIONS.md`.
4. Read ADRs referenced by those rules.
5. State the affected convention rule IDs in the plan or final report.
6. Verify documentation claims against code and tests in this brownfield repository.

### Change classification

A formal OpenSpec change is optional only for an isolated, low-risk edit that does
not alter observable behavior, a public contract, schema, event, architecture,
tooling, or a durable convention.

Use OpenSpec for new capabilities, observable behavior changes, contract or schema
changes, cross-feature work, significant refactors, architectural work, and changes
with migration, rollout, compatibility, or rollback concerns.

### OpenSpec lifecycle

For non-trivial work:

1. Use `/opsx:explore` when requirements or approach are unclear.
2. Use `/opsx:propose <descriptive-change-name>` to create the proposal, delta specs,
   design, and tasks.
3. Review those artifacts against code, conventions, and ADRs.
4. Do not modify production code until the planning artifacts are accepted, unless
   the user explicitly requested end-to-end execution.
5. Use `/opsx:apply` to implement the approved tasks incrementally.
6. Keep `tasks.md` truthful; never check off unimplemented or unvalidated work.
7. Run focused validation after each meaningful implementation group.
8. Run `npm run verify` and `openspec validate --all` before claiming completion.
9. Reconcile implementation discoveries back into the change artifacts.
10. Use `/opsx:sync` and `/opsx:archive` only when implementation, tests, and specs
    agree.

Adopt specifications incrementally. Do not attempt to reverse-engineer the whole
existing system before the first useful change.

### Specifications

- Describe observable behavior and contracts, not ordinary code style.
- Use MUST, SHOULD, and MAY deliberately.
- Give requirements concrete GIVEN/WHEN/THEN scenarios.
- Cover failures, empty states, retries, idempotency, and compatibility when relevant.
- Do not describe planned behavior as already implemented.

### ADR and convention handling

An OpenSpec `design.md` explains one change. It does not replace a durable ADR.

Follow `backend/CONVENTIONS.md` documentation rules. Changes to architecture, public
contracts, or tooling require a numbered ADR under `docs/adr/`. ADRs are append-only;
supersede rather than rewrite historical decisions.

The conventions registry remains the current engineering law:

- Refer to rules by stable ID.
- Never renumber rules.
- Retire rules instead of deleting them.
- Reverse a rule by retiring it and adding a new ID.
- Link decision-derived rules to their ADR.

### Completion evidence

A change is complete only when:

- Relevant focused tests pass.
- `npm run verify` passes.
- `openspec validate --all` passes.
- OpenSpec artifacts match the implementation.
- Required ADR, convention, diagram, and barrel updates are present.
- The final report lists changed files, rule IDs, commands, results, and remaining
  risks.

If validation cannot run, explain why and do not claim completion.
<!-- media-sync-ai-workflow:end -->
