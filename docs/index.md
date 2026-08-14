<!-- media-sync-ai-workflow:start -->
<!-- cspell:words openspec frontmatter Obsidian -->

# Media Sync engineering

This is the repository's Markdown/Obsidian navigation dashboard. It does not replace code,
specifications, conventions, or ADRs.

## Start here

- [Glossary](glossary.md) — current domain vocabulary
- [Feature index](features/index.md) — responsibility, ownership, public surface, source, and tests
- [Subsystem index](subsystems/index.md) — verified cross-feature runtime traces
- [System overview](architecture/system-overview.md) — containers, layering, and cross-cutting mechanisms
- [Specification map](specification-map.md) — capability/spec/evidence coverage and recorded conflicts
- [Backend engineering conventions](../backend/CONVENTIONS.md) — current rules by stable ID
- [Architecture decisions](adr/index.md) — durable rationale and status

## Features

| Feature | Document | Source | Tests |
|---|---|---|---|
| Streams | [Feature](features/streams.md) | [`backend/src/streams/`](../backend/src/streams/) | [`backend/test/streams/`](../backend/test/streams/) |
| Nodes | [Feature](features/nodes.md) | [`backend/src/nodes/`](../backend/src/nodes/) | [`backend/test/nodes/`](../backend/test/nodes/) |
| Alerts | [Feature](features/alerts.md) | [`backend/src/alerts/`](../backend/src/alerts/) | [`backend/test/alerts/`](../backend/test/alerts/) |
| Metrics | [Feature](features/metrics.md) | [`backend/src/metrics/`](../backend/src/metrics/) | [`backend/test/metrics/`](../backend/test/metrics/) |
| Stream Inspection | [Feature](features/stream-inspection.md) | [`backend/src/stream-inspection/`](../backend/src/stream-inspection/) | [`backend/test/stream-inspection/`](../backend/test/stream-inspection/) |
| Sync | [Feature](features/sync.md) | [`backend/src/sync/`](../backend/src/sync/) | [`backend/test/sync/`](../backend/test/sync/) |
| Gateway | [Feature](features/gateway.md) | [`backend/src/gateway/`](../backend/src/gateway/) | [`backend/test/gateway/`](../backend/test/gateway/) |
| Media Nodes | [Feature](features/media-nodes.md) | [`backend/src/media-nodes/`](../backend/src/media-nodes/) | [`backend/test/media-nodes/`](../backend/test/media-nodes/) |

## Subsystems

- [Node registration and heartbeat](subsystems/node-registration-and-heartbeat.md)
- [Stream reservation and publication](subsystems/stream-reservation-and-publication.md)
- [Stream assignment and pipeline deployment](subsystems/stream-assignment-and-pipeline-deployment.md)
- [Synchronization and reconciliation](subsystems/synchronization-and-reconciliation.md)
- [Metrics collection](subsystems/metrics-collection.md)
- [Stream inspection](subsystems/stream-inspection.md)
- [Alert evaluation and reconciliation](subsystems/alert-evaluation-and-reconciliation.md)
- [Realtime event broadcast](subsystems/realtime-event-broadcast.md)

## Architecture

- [System overview](architecture/system-overview.md)
- [Module map](architecture/module-map.md) — Nest modules, exports, and dependencies
- [Runtime flows](architecture/runtime-flows.md) — detailed runtime sequences
- [Validation and tooling](architecture/validation-and-tooling.md) — package roots and validation gates
- [ADR-0017: Feature and subsystem documentation](adr/0017-feature-and-subsystem-documentation.md)
- Structural architecture model — intentionally absent; see
  [ADR-0016: Drop the LikeC4 architecture model](adr/0016-drop-likec4-architecture-model.md)

## Specifications and method

- [Specification map](specification-map.md)
- [Canonical OpenSpec specifications](../openspec/specs/) — documentation governance, local
  agent workflow, and public stream behavior
- [Active OpenSpec changes](../openspec/changes/)
- [Archived documentation change](../openspec/changes/archive/2026-07-24-add-feature-and-subsystem-documentation/)
- [Spec-driven development method](methodology/spec-driven-development.md)

## Decisions and rules

- [ADR entry point](adr/index.md) · [ADR list](adr/README.md) · [ADR template](adr/template.md)
- [Backend engineering conventions](../backend/CONVENTIONS.md)
- Documentation governance: `DOC-01`–`DOC-06`, especially `DOC-06`

## Existing references

These references predate the current verified feature/subsystem layer. Check claims against the
specification map, source, and tests.

- [Backend README](../backend/README.md)
- [API documentation](../backend/API_DOCUMENTATION.md)
- [System documentation](../backend/SYSTEM_DOCUMENTATION.md)
- [Workspace README](../README.md) · [Setup](../SETUP.md)

## Agent instructions

- [Claude Code instructions](../CLAUDE.md)
- [Codex instructions](../AGENTS.md)

## Validation

- `npm run verify` from [`backend/`](../backend/)
- `openspec validate --all` from the repository root
- `git diff --check` from the repository root

## Authority map

| Artifact | Responsibility |
|---|---|
| `backend/CONVENTIONS.md` | Current backend engineering law |
| `docs/adr/` | Durable architectural/tooling decisions and rationale |
| `openspec/specs/` | Current intended observable behavior |
| `openspec/changes/` | Proposed behavior, design, and tasks |
| Code and tests | Current implementation and validation evidence |
| `docs/features/`, `docs/subsystems/`, `docs/architecture/`, glossary, specification map | Derived orientation; verify and update with material changes |
| `backend/API_DOCUMENTATION.md`, `backend/SYSTEM_DOCUMENTATION.md` | Existing references, not behavioral authorities |
| `docs/index.md` | Navigation only |

When sources disagree, record the conflict in the [specification map](specification-map.md) and
identify the artifact that needs reconciliation.

## Working flow

```mermaid
flowchart LR
    Explore[Explore the change] --> Propose[OpenSpec proposal]
    Propose --> Review[Review specs, design, tasks]
    Review --> Implement[Incremental implementation]
    Implement --> Validate[Focused checks and npm run verify]
    Validate --> Sync[Sync canonical specs]
    Sync --> Archive[Archive completed change]
```

## Obsidian usage

Open the repository root as the vault. Use standard relative Markdown links and keep `.obsidian/`
local/uncommitted unless a later reviewed decision adopts shared configuration. Local Obsidian
indexing should exclude `.git/`, `node_modules/`, `dist/`, and `coverage/`; no repository-owned
vault configuration is committed to enforce those local preferences. VS Code and TypeScript
language tooling remain responsible for symbol navigation. The retired LikeC4 model remains
intentionally absent under ADR-0016.
<!-- media-sync-ai-workflow:end -->
