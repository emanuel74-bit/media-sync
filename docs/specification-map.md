---
type: specification-map
status: active
last_verified: 2026-07-23
---

<!-- cspell:words openspec frontmatter opsx MediaMTX nodeId -->

# Specification map

This is the verified bridge among capabilities, specifications, derived documentation, code, and
tests. It records status and conflict; requirement text belongs in OpenSpec.

OpenSpec adoption is incremental under
[ADR-0015](adr/0015-adopt-spec-driven-development-and-obsidian-navigation.md). The canonical
[`openspec/specs/`](../openspec/specs/) directory exists but is currently empty, so no runtime
capability below has a canonical behavioral specification. The active
[documentation-governance change](../openspec/changes/add-feature-and-subsystem-documentation/)
does not specify or change runtime behavior.

## Authority

| Artifact | Responsibility |
|---|---|
| [`openspec/specs/`](../openspec/specs/) | Canonical intended observable behavior; currently empty |
| [`openspec/changes/`](../openspec/changes/) | Proposed behavior, design, and tasks; not canonical until synced/archived |
| [`backend/CONVENTIONS.md`](../backend/CONVENTIONS.md) | Current engineering rules, cited by stable ID |
| [`docs/adr/`](adr/) | Append-only architectural and tooling decisions/rationale |
| [Feature documents](features/index.md) | Derived maps of one feature's responsibility and evidence |
| [Subsystem documents](subsystems/index.md) | Derived cross-feature runtime traces |
| Code and tests | Current implementation and validation evidence |

When sources disagree, do not silently choose one. The intended behavior needs its own OpenSpec
change; durable architectural decisions need an ADR; current-rule defects belong in the
conventions registry.

## Capability map

| Capability | OpenSpec | Feature documents | Subsystem documents | Code | Tests |
|---|---|---|---|---|---|
| Node registration and heartbeat | No canonical specification | [Nodes](features/nodes.md) | [Node registration and heartbeat](subsystems/node-registration-and-heartbeat.md) | [`nodes/`](../backend/src/nodes/) | [`test/nodes/`](../backend/test/nodes/) |
| Stream reservation and publication | No canonical specification | [Streams](features/streams.md), [Nodes](features/nodes.md), [Media nodes](features/media-nodes.md), [Sync](features/sync.md) | [Stream reservation and publication](subsystems/stream-reservation-and-publication.md) | [`streams/`](../backend/src/streams/), [`sync/`](../backend/src/sync/) | [`test/streams/`](../backend/test/streams/), [`test/sync/`](../backend/test/sync/) |
| Stream assignment and pipeline deployment | No canonical specification | [Streams](features/streams.md), [Media nodes](features/media-nodes.md), [Sync](features/sync.md) | [Assignment and pipeline deployment](subsystems/stream-assignment-and-pipeline-deployment.md) | [`streams/`](../backend/src/streams/), [`media-nodes/`](../backend/src/media-nodes/) | [`test/streams/`](../backend/test/streams/), [`test/media-nodes/`](../backend/test/media-nodes/) |
| Synchronization and reconciliation | No canonical specification | [Sync](features/sync.md), [Streams](features/streams.md), [Nodes](features/nodes.md), [Media nodes](features/media-nodes.md) | [Synchronization and reconciliation](subsystems/synchronization-and-reconciliation.md) | [`sync/`](../backend/src/sync/) | [`test/sync/`](../backend/test/sync/) |
| Metrics collection | No canonical specification | [Metrics](features/metrics.md), [Media nodes](features/media-nodes.md), [Nodes](features/nodes.md), [Alerts](features/alerts.md) | [Metrics collection](subsystems/metrics-collection.md) | [`metrics/`](../backend/src/metrics/), [`media-nodes/`](../backend/src/media-nodes/) | [`test/metrics/`](../backend/test/metrics/), [`test/media-nodes/`](../backend/test/media-nodes/) |
| Stream inspection | No canonical specification | [Stream inspection](features/stream-inspection.md), [Streams](features/streams.md), [Media nodes](features/media-nodes.md), [Alerts](features/alerts.md) | [Stream inspection](subsystems/stream-inspection.md) | [`stream-inspection/`](../backend/src/stream-inspection/) | [`test/stream-inspection/`](../backend/test/stream-inspection/) |
| Alert evaluation and reconciliation | No canonical specification | [Alerts](features/alerts.md), [Metrics](features/metrics.md), [Stream inspection](features/stream-inspection.md), [Nodes](features/nodes.md) | [Alert evaluation and reconciliation](subsystems/alert-evaluation-and-reconciliation.md) | [`alerts/`](../backend/src/alerts/) | [`test/alerts/`](../backend/test/alerts/) |
| Realtime event broadcast | No canonical specification | [Gateway](features/gateway.md) and event-owning feature pages | [Realtime event broadcast](subsystems/realtime-event-broadcast.md) | [`gateway/`](../backend/src/gateway/) | [`test/gateway/`](../backend/test/gateway/) |
| Feature/subsystem documentation governance | [Active delta specification](../openspec/changes/add-feature-and-subsystem-documentation/specs/architecture-documentation-governance/spec.md) | [Feature index](features/index.md) | [Subsystem index](subsystems/index.md) | [`DOC-06`](../backend/CONVENTIONS.md), [ADR-0017](adr/0017-feature-and-subsystem-documentation.md) | Markdown link/path checks and repository validation |

## Recorded conflicts and uncertainty

These items were rechecked against the linked implementation on 2026-07-23 unless the status
explicitly says a live integration is still unverified. They are findings, not promises to change
runtime behavior in this documentation-only change.

| Conflict or uncertainty | Evidence | Status |
|---|---|---|
| `backend/API_DOCUMENTATION.md` says unhealthy nodes are automatically deregistered; code only filters by heartbeat age at read time. | [`node-query.service.ts`](../backend/src/nodes/services/query/node-query.service.ts) | Open reference-document conflict |
| Heartbeat upsert for an unknown `nodeId` does not supply schema-required host/ports/role. | [`node-lifecycle.service.ts`](../backend/src/nodes/services/lifecycle/node-lifecycle.service.ts), [`node.schema.ts`](../backend/src/infrastructure/database/mongo/node/node.schema.ts) | Suspected defect; live Mongo outcome and repository integration are unverified |
| `NodeStatus.INACTIVE` and `DRAINING` exist but no current path writes them. | [`node.types.ts`](../backend/src/nodes/domain/types/node.types.ts) | Recorded implementation gap, not a claimed transition |
| `PublishAuthService` commentary says a publisher can reconnect for the stream lifetime, while discovery clears the secret and later auth denies it. | [`publish-auth.service.ts`](../backend/src/streams/services/query/publish-auth.service.ts), [`ingest-stream-synchronizer.service.ts`](../backend/src/sync/services/workflows/ingest-stream-synchronizer.service.ts) | Open code-comment conflict |
| Reservation duplicate detection is read-then-create; the unique index is the final race guard and deterministic HTTP 409 handling is unverified. | [`stream-reservation.service.ts`](../backend/src/streams/services/orchestration/stream-reservation.service.ts), [`stream.schema.ts`](../backend/src/infrastructure/database/mongo/stream/stream.schema.ts) | Open concurrency uncertainty |
| Several stream/node/sync events lack shared payload declarations required by `EVT-05`. | [`event-payloads.types.ts`](../backend/src/common/domain/types/event-payloads.types.ts), [`system-event-names.const.ts`](../backend/src/common/domain/consts/system-event-names.const.ts) | Recorded rule/code deviation candidate |
| `SVC-06` and the API reference mention failover, but assignment only converges when invoked; no autonomous failover implementation exists. | [`stream-assignment.service.ts`](../backend/src/streams/services/assignment/stream-assignment.service.ts), [`backend/CONVENTIONS.md`](../backend/CONVENTIONS.md) | Open current-rule/reference conflict |
| Manual assignment accepts an arbitrary `nodeId`; validation occurs only when later node resolution/pipeline work fails. | [`stream-assignment.service.ts`](../backend/src/streams/services/assignment/stream-assignment.service.ts) | Open topology-validation gap |
| Successful unassignment records “not assigned” in `lastError`, mixing normal state with fault text. | [`stream-assignment.service.ts`](../backend/src/streams/services/assignment/stream-assignment.service.ts) | Recorded semantic inconsistency |
| The stream-ready endpoint trusts its path `nodeId` without verifying registration, liveness, role, or caller identity. | [`ingest-activation.controller.ts`](../backend/src/sync/controllers/ingest-activation.controller.ts), [`sync-orchestrator.service.ts`](../backend/src/sync/services/orchestration/sync-orchestrator.service.ts) | Open trust-boundary gap |
| `sync.tick` reports observation sizes rather than completed work and has no shared payload type. | [`sync-orchestrator.service.ts`](../backend/src/sync/services/orchestration/sync-orchestrator.service.ts) | Recorded diagnostic ambiguity |
| Manual disabled/deleted streams have no verified path that always tears down their cluster pipeline. | [`stream-reconcile.service.ts`](../backend/src/sync/services/workflows/stream-reconcile.service.ts), [`stream-staleness.service.ts`](../backend/src/sync/services/workflows/stream-staleness.service.ts) | Open behavior/design question |
| Historical ADRs use obsolete pod terminology or implementation detail: ADR-0001 owns registry duties now split into Nodes/Media Nodes; ADR-0002/0008 retain obsolete forward-reference/module-order detail; ADR-0009/0011/0012 use “pod”; ADR-0013 records `/api/pods/...` instead of the current `/api/nodes/...`. | [ADR index](adr/index.md), current [feature index](features/index.md) | Historical text retained intentionally; a later ADR should supersede a decision if its durable meaning changes |

Known formal rule-versus-code deviations, if promoted, belong in the `DEVN` section of
[`backend/CONVENTIONS.md`](../backend/CONVENTIONS.md).

## Adding a canonical behavioral specification

1. Select a capability touched by a real change.
2. Propose a focused OpenSpec change.
3. Verify every requirement/scenario against code and tests or explicitly change the implementation.
4. Preserve conflicts until the responsible artifact is intentionally reconciled.
5. Run `openspec validate --all` and `npm run verify` from `backend/`.
6. Sync/archive only when implementation and specification agree.

See [spec-driven development](methodology/spec-driven-development.md).
