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
3. Read the relevant rules in `backend/CONVENTIONS.md`.
4. Follow links from those rules to relevant ADRs in `docs/adr/`.
5. State the affected rule IDs in the plan or implementation summary.

Do not infer current behavior only from specs or documentation in this brownfield
repository. Verify it against code and tests.

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
