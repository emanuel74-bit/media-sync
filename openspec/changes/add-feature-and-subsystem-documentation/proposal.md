## Why

The backend is feature-oriented and several important runtime lifecycles cross feature
boundaries, but the repository does not have one evidence-backed architecture layer that
maps those features and lifecycles to code, tests, specifications, decisions, and current
engineering rules. Repository-owned Markdown navigation is needed so GitHub, VS Code,
Obsidian, Claude Code, Codex, and OpenSpec users can orient consistently without treating
code search or an external knowledge store as the architecture record.

## What Changes

- Add one verified architecture document for every top-level backend feature identified by
  `PHIL-01` and `DIR-01`, including its boundaries, supported public surface, data, events,
  dependencies, tests, specifications, ADRs, and governing convention IDs.
- Add evidence-backed subsystem documents for significant end-to-end runtime capabilities
  that cross feature or integration boundaries, without changing runtime behavior.
- Add feature, subsystem, specification, and ADR navigation to the existing documentation
  dashboard using standard relative Markdown links and Mermaid diagrams (`DOC-02`).
- Record the durable documentation-layer decision in a new append-only ADR (`DOC-01`,
  `DOC-03`) and add a stable documentation-maintenance rule to
  `backend/CONVENTIONS.md`.
- Update `CLAUDE.md` and `AGENTS.md` with concise orientation and same-change maintenance
  duties while preserving the authority boundaries established by ADR-0015 and `DOC-05`.
- Validate every documented path and material claim against implementation and tests, then
  run the repository's normal validation gates.

There is no intentional change to application behavior, APIs, DTOs, events, persistence,
configuration, deployment, dependencies, or runtime operations. No migration, rollout, or
compatibility action is required; rollback consists of reverting only the documentation,
governance, and OpenSpec artifacts added by this change.

## Capabilities

### New Capabilities

- `architecture-documentation-governance`: Repository requirements for maintaining
  evidence-backed feature and cross-feature subsystem documentation while preserving the
  separate authority of OpenSpec, ADRs, conventions, code, and tests.

### Modified Capabilities

None. No existing observable application requirement changes.

## Impact

Affected artifacts are `docs/`, `backend/CONVENTIONS.md`, `CLAUDE.md`, `AGENTS.md`, and
this OpenSpec change. A new ADR is required because the change establishes a durable
architecture-documentation responsibility and repository maintenance policy. Production
source, tests, public contracts, runtime dependencies, and deployed systems are out of
scope and remain unchanged.
