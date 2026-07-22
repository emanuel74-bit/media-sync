<!-- media-sync-ai-workflow:start -->
# Repository agent instructions

## Orientation

Before non-trivial work:

1. Read the active change under `openspec/changes/`.
2. Inspect the relevant implementation and tests.
3. Read applicable rules in `backend/CONVENTIONS.md` and cite their stable IDs.
4. Read ADRs linked by those rules.
5. Inspect the current Git diff before modifying files.

## Artifact responsibilities

- `backend/CONVENTIONS.md`: current engineering rules.
- `docs/adr/`: durable architecture and tooling decisions.
- `openspec/specs/`: current intended observable behavior.
- `openspec/changes/`: proposed behavior, design, and tasks.
- `docs/index.md`: navigation only.
- Code and tests: current implementation evidence.

Do not duplicate these sources or silently resolve conflicts between them.

## Method

Use OpenSpec for new features, behavior or contract changes, schemas, events,
cross-feature work, architecture, significant refactors, and compatibility or
migration work. Isolated low-risk edits that do not change observable behavior may
skip a formal change.

Implement accepted tasks incrementally. Keep `tasks.md` accurate. Do not document
planned work as complete.

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

Report changed files, relevant rule IDs, commands run, results, and remaining risks.
Do not claim completion when required validation did not pass.
<!-- media-sync-ai-workflow:end -->
