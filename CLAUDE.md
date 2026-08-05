# Media Sync Repository Instructions

## Canonical project sources

Use each source for its own purpose; do not duplicate its content into another source.

- `backend/CONVENTIONS.md` is the current engineering-rule registry. Refer to rules by stable ID.
- `docs/adr/` contains append-only architectural and tooling decisions and their rationale.
- `openspec/specs/` describes current intended observable behavior.
- `openspec/changes/` contains proposed behavior and implementation work until completion.
- `docs/features/` and `docs/subsystems/` are derived orientation verified against code and tests.
- `docs/index.md` is navigation only.
- Source code, tests, and deterministic validation provide implementation evidence.

When these sources conflict, do not silently choose one. Report the conflict and identify the
artifact that must be reconciled. Read only the relevant convention categories and linked ADRs;
do not import the full convention registry into this file.

## Required orientation

Before modifying code:

1. Inspect the relevant implementation, tests, public contracts, and current Git diff.
2. Read the active OpenSpec change when the task belongs to one.
3. Read the relevant feature page and subsystem trace, then verify their claims against code and
   tests.
4. Read the applicable rules in `backend/CONVENTIONS.md` and ADRs linked by those rules.
5. State the affected rule IDs in the plan or implementation summary.

Feature and subsystem pages never override OpenSpec, conventions, ADRs, code, or tests. Update
them in the same change when responsibilities, boundaries, public surfaces, dependency direction,
owned state, events, jobs, cross-feature flows, failure behavior, idempotency, or consistency
guarantees materially change.

## Change classification

A formal OpenSpec change is optional only for an isolated, low-risk edit that does not alter
observable behavior, a public contract, schema, event, architecture, tooling, or a durable
convention.

Use OpenSpec for new features or capabilities, observable behavior changes, contracts, schemas,
events, cross-feature work, significant refactors, architecture, compatibility, migration,
rollout, and rollback concerns.

## OpenSpec workflow

For non-trivial work:

1. Use `/opsx:explore` when requirements or approach are unclear.
2. Use `/opsx:propose <descriptive-change-name>` to create proposal, delta specs, design, and
   tasks.
3. Review the artifacts against implementation evidence, conventions, and ADRs.
4. Stop for user review before implementation unless the user explicitly requested end-to-end
   execution.
5. Use `/opsx:apply` to implement the accepted tasks incrementally.
6. Keep `tasks.md` truthful; never check off unimplemented or unvalidated work.
7. Run focused validation after each meaningful implementation group.
8. Reconcile implementation discoveries back into the change artifacts.
9. Use `/opsx:sync` and `/opsx:archive` only when implementation, tests, and specs agree and the
   required validation passes.

Adopt specifications incrementally. Do not reverse-engineer the whole existing system before
doing useful work.

## Accepted local-agent workflow

For a coordinator-issued multi-agent change, follow
[ADR-0018](docs/adr/0018-establish-accepted-local-agent-workflow.md), `TOOL-09`, and the
versioned contracts under `.agents/templates/`.

- The coordinator accepts planning, issues work orders, owns `tasks.md`, assigns fresh roles,
  chooses integration order, and records any accepted risk.
- Implementers use `.agents/work/active-work-order.json`, stay within its declared paths and file
  operations, run the required preflight/checkpoint commands, and never edit task state.
- Reviewers bind reports to exact commits, trees, raw diff digests, scenarios, convention IDs,
  commands, findings, and risks using the tracked review contracts.
- Evidence commits are validated separately and may not carry source, planning, convention, ADR,
  or operational-documentation changes.
- Machine validation checks recorded state. Fresh-role separation and human plan/risk acceptance
  remain coordinator and human responsibilities.

Refer to the schemas and rule IDs rather than copying their field definitions or enforcement text
into prompts.

## Specifications and decisions

OpenSpec specifications describe observable requirements and contracts:

- Use clear MUST/SHOULD/MAY language and concrete GIVEN/WHEN/THEN scenarios.
- Cover failures, empty states, retries, idempotency, and compatibility when relevant.
- Do not put ordinary code-style rules in behavioral specs.
- Do not describe planned behavior as already implemented.
- Delta specs must clearly identify added, modified, and removed behavior.

An OpenSpec `design.md` explains one change; it does not replace a durable ADR. Follow `DOC-01`
and `DOC-03`: use `docs/adr/template.md`, assign the next number, and supersede rather than rewrite
historical decisions. The OpenSpec design and tasks must reference every ADR created or superseded
by the change.

`backend/CONVENTIONS.md` remains the current engineering law:

- Refer to rules by stable ID and never renumber them.
- Retire rules instead of deleting them.
- Reverse a rule by retiring it and adding a new ID.
- Link decision-derived rules to their ADR.
- Do not create a convention for a one-off implementation choice.

## Implementation discipline

- Follow the accepted OpenSpec scope and tasks and preserve unrelated behavior.
- Prefer small, reviewable changes and avoid speculative abstractions.
- Update tests with behavior and update barrels, diagrams, ADRs, conventions, feature pages, and
  subsystem traces when their governing rules require it.
- Do not bypass repository tooling or weaken tests to make validation pass.
- Surface unexpected architecture or requirement conflicts before expanding scope.

## Completion evidence

A change is not complete until:

- Relevant focused tests pass.
- Root `npm run verify` passes.
- `openspec validate --all` passes.
- OpenSpec artifacts and task state match the implementation.
- Required ADR, convention, architecture-documentation, diagram, and barrel updates exist.
- The final report lists changed files, relevant rule IDs, commands, results, and remaining risks.

For an accepted active change, also run `npm run verify:change -- <change-id>` before exact-state
implementation review, as defined by `TOOL-09`. If validation cannot run, say exactly why and do
not claim completion.
