<!-- media-sync-ai-workflow:start -->
# Repository agent instructions

## Orientation

Before non-trivial work:

1. Read the active change under `openspec/changes/`.
2. Inspect the relevant implementation and tests.
3. Read the relevant feature page under `docs/features/` and subsystem trace under
   `docs/subsystems/`, then verify their claims against code and tests.
4. Read applicable rules in `backend/CONVENTIONS.md` and cite their stable IDs.
5. Read ADRs linked by those rules.
6. Inspect the current Git diff before modifying files.

## Artifact responsibilities

- `backend/CONVENTIONS.md`: current engineering rules.
- `docs/adr/`: durable architecture and tooling decisions.
- `openspec/specs/`: current intended observable behavior.
- `openspec/changes/`: proposed behavior, design, and tasks.
- `docs/features/`: derived single-feature ownership and public-surface maps.
- `docs/subsystems/`: derived cross-feature runtime traces.
- `docs/index.md`: navigation only.
- Code and tests: current implementation evidence.

Do not duplicate these sources or silently resolve conflicts between them.

Feature and subsystem pages are lower-authority orientation. Update them in the same
change when responsibilities, module boundaries, public surfaces, dependency
direction, state/persistence ownership, events, jobs, subsystem/integration flows,
failure behavior, idempotency, or consistency guarantees materially change; never
use them to override OpenSpec, conventions, ADRs, code, or tests.

## Method

Use OpenSpec for new features, behavior or contract changes, schemas, events,
cross-feature work, architecture, significant refactors, and compatibility or
migration work. Isolated low-risk edits that do not change observable behavior may
skip a formal change.

Implement accepted tasks incrementally. Keep `tasks.md` accurate. Do not document
planned work as complete.

## Accepted local-agent workflow

For a coordinator-issued multi-agent change, follow
[ADR-0018](docs/adr/0018-establish-accepted-local-agent-workflow.md), `TOOL-09`, and the
versioned contracts under `.agents/templates/`. The coordinator accepts planning, issues work
orders, owns `tasks.md`, assigns fresh review roles, and accepts risks. Implementers must use the
active work order under `.agents/work/`, stay within its declared paths and operations, and never
mark OpenSpec tasks complete.

Use the repository scripts under `scripts/agent-workflow/` for preflight, checkpoint, exact-state
review, and evidence-commit validation. Those scripts validate recorded state; they do not replace
coordinator role separation or human acceptance.

## Decisions

Follow the documentation rules in `backend/CONVENTIONS.md`. Architecture, public-contract,
and tooling decisions require append-only ADRs under `docs/adr/`. OpenSpec designs do
not replace ADRs.

## Validation

Run focused checks during implementation. Before completion, run:

```text
npm run verify
openspec validate --all
```

For an accepted active change, also run `npm run verify:change -- <change-id>` before exact-state
implementation review, as defined by `TOOL-09`.

Report changed files, relevant rule IDs, commands run, results, and remaining risks.
Do not claim completion when required validation did not pass.
<!-- media-sync-ai-workflow:end -->
