---
last_verified: 2026-07-23
---

<!-- cspell:words openspec frontmatter opsx DEVN unvalidated -->

# Specification map

Which behavioral capabilities exist, which have a verified baseline specification, and where the
evidence for each one lives. Navigation and status only — no requirement text lives here.

Specifications are adopted **incrementally**
([ADR-0015](adr/0015-adopt-spec-driven-development-and-obsidian-navigation.md)). An empty row is
not a defect; it means no change has needed that capability specified yet.

**Current state:** no baseline specification exists yet. `openspec/` holds configuration only —
neither `openspec/specs/` nor `openspec/changes/` has been created. Every capability below is
still specified by its source and tests alone.

## Where behavior is recorded

| Artifact | What it tells you |
|---|---|
| `openspec/specs/` | Canonical intended observable behavior. **Does not exist yet** — no baseline has been archived. |
| `openspec/changes/` | Proposed behavior and implementation work not yet canonical. **No active change.** |
| [`backend/CONVENTIONS.md`](../backend/CONVENTIONS.md) | Current engineering law. Cited by stable rule ID, never copied. |
| [`docs/adr/`](adr/) | Append-only decisions and their rationale. |
| [`backend/API_DOCUMENTATION.md`](../backend/API_DOCUMENTATION.md) | REST/WebSocket **reference** — request and response payloads. A reference, not a behavioral authority; see the conflict note below. |
| Source and tests | Implementation evidence. In this brownfield repository, the deciding evidence. |

A specification says what the system guarantees. The API reference says what the payloads look
like. When they disagree, the source and its tests decide, and the disagreement gets recorded
rather than quietly reconciled.

## Capability status

| Capability | Owning module | Baseline status | Where |
|---|---|---|---|
| Node registry and heartbeat | `NodesModule` | Not specified | [`nodes/services/`](../backend/src/nodes/services/) |
| Stream reservation | `StreamsModule`, `MediaNodesModule`, `SyncModule` | Not specified | [`stream-reservation.service.ts`](../backend/src/streams/services/orchestration/stream-reservation.service.ts), [ADR-0013](adr/0013-reserve-publish-ingest-cluster.md) |
| Stream assignment | `StreamsModule` | Not specified | [`streams/services/assignment/`](../backend/src/streams/services/assignment/) |
| Stream pipeline lifecycle | `StreamsModule`, `MediaNodesModule` | Not specified | [`stream-pipeline.service.ts`](../backend/src/streams/services/orchestration/stream-pipeline.service.ts), [ADR-0014](adr/0014-guard-stream-lifecycle-transitions.md) |
| Stream synchronization and reconciliation | `SyncModule` | Not specified | [`sync/services/workflows/`](../backend/src/sync/services/workflows/) |
| Stream inspection | `StreamInspectionModule` | Not specified | [`stream-inspection/services/`](../backend/src/stream-inspection/services/) |
| Metrics collection | `MetricsModule`, `MediaNodesModule` | Not specified | [`metrics/services/`](../backend/src/metrics/services/) |
| Alert reconciliation | `AlertsModule` | Not specified | [`alerts/services/`](../backend/src/alerts/services/), [ADR-0010](adr/0010-event-driven-alert-pipeline.md) |

Capability names describe stable system responsibilities. They are not module names, class
names, or change names, so a refactor does not rename a capability.

## Recorded conflicts

Open disagreements between sources, carried over from an earlier baseline-drafting attempt whose
OpenSpec change artifacts no longer exist. Each was read from source at the time and has **not**
been re-verified since; the "Where" column points at the code to check. Each is resolved by its
own change, never silently.

| Conflict | Where | Status |
|---|---|---|
| `backend/API_DOCUMENTATION.md` claims nodes are "automatically deregistered" when unhealthy. No deregistration exists — liveness is a read-time filter on `lastHeartbeatAt`. | [`node-query.service.ts`](../backend/src/nodes/services/query/node-query.service.ts) | Open. Needs a documentation-correction change. |
| A heartbeat naming an unregistered `nodeId` appears to insert a document missing schema-required fields. Unverified against a live database and untested. | [`node-lifecycle.service.ts`](../backend/src/nodes/services/lifecycle/node-lifecycle.service.ts), [`node.repository.ts`](../backend/src/nodes/repositories/node.repository.ts) | Open. Suspected defect; needs its own change. |
| `NodeStatus.INACTIVE` and `NodeStatus.DRAINING` exist in the enum; no code path writes either. | [`node.types.ts`](../backend/src/nodes/domain/types/node.types.ts) | Recorded. Only `active` is written. |
| `PublishAuthService`'s docstring says a matching secret "lets a legitimate publisher reconnect for the life of the stream". Promotion out of `reserved` clears the secret, so a redial is denied. | [`publish-auth.service.ts`](../backend/src/streams/services/query/publish-auth.service.ts) | Open. Suspected defect; the code denies, the docstring does not. |
| The duplicate-name check on reserve is read-then-write, so two concurrent reserves of one name race to the `name` unique index instead of yielding a 409. | [`stream-reservation.service.ts`](../backend/src/streams/services/orchestration/stream-reservation.service.ts) | Open. Against `DATA-05`; needs its own change. |
| `stream.reserved` has no typed payload in `event-payloads.types.ts`, against `EVT-05`. Neither ingest controller has a test, and `createReservation` has no direct test, against `TEST-05`. | [`stream-reservation.service.ts`](../backend/src/streams/services/orchestration/stream-reservation.service.ts) | Recorded. Candidates for `DEVN` entries in the conventions registry. |
| `SVC-06`'s example in `backend/CONVENTIONS.md` cites a `StreamFailoverService`, and `backend/API_DOCUMENTATION.md` line 51 says assignment is used for "failover". No failover code exists — `grep -rn failover src/ test/` matches nothing. | [`backend/CONVENTIONS.md`](../backend/CONVENTIONS.md) | Open. A defect in the conventions registry itself, not in the code. |
| `PATCH /api/streams/:name/assign` persists any `nodeId` string without checking the node registry, against the spirit of `ARCH-11`. The failure surfaces later, in the pipeline path. | [`stream-assignment.service.ts`](../backend/src/streams/services/assignment/stream-assignment.service.ts) | Open. Needs its own change. |
| A successful unassign writes `"Stream is not assigned to a cluster node"` into `lastError`, conflating a normal outcome with a fault. `stream.assigned` and `stream.unassigned` also have inconsistent payload shapes, neither typed (`EVT-05` — third occurrence). | [`stream-assignment.service.ts`](../backend/src/streams/services/assignment/stream-assignment.service.ts) | Recorded. |
| `POST /api/nodes/:nodeId/stream-ready` records the path parameter as the stream's ingest origin with no check that the node is registered, live, or of ingest role. The controller's docstring calls it "node-sourced (trustworthy)"; nothing enforces that. | [`nodes.controller.ts`](../backend/src/nodes/controllers/nodes.controller.ts) | Open. Same tension with `ARCH-11` as unvalidated assignment. |
| `sync.tick`'s `ingest` and `cluster` counts report the size of the observation snapshot, not work performed — emitted unchanged even when every step was skipped. `sync.tick` is also untyped (`EVT-05` — fourth occurrence, now systemic). | [`sync-orchestrator.service.ts`](../backend/src/sync/services/orchestration/sync-orchestrator.service.ts) | Recorded. |
| Nothing tears down the cluster pipeline of a manual stream that was disabled or deleted: the reconcile step only builds, and the staleness step skips manual streams. Untested; read from the filter conditions. | [`stream-reconcile.service.ts`](../backend/src/sync/services/workflows/stream-reconcile.service.ts), [`stream-staleness.service.ts`](../backend/src/sync/services/workflows/stream-staleness.service.ts) | Open, unverified. Needs a functional decision. |

Known rule-versus-code deviations are tracked separately, in the `DEVN` section of
[`backend/CONVENTIONS.md`](../backend/CONVENTIONS.md).

## Adding the first baseline

1. Pick one capability whose behavior the tests already pin down.
2. `/opsx:propose baseline-<capability-name>-specification`.
3. Verify every requirement against source and tests before writing it; a requirement with no
   evidence gets deleted, not softened.
4. Record contradictions here rather than reconciling them.
5. `openspec validate --all` and `cd backend && npm run verify`.
6. Sync and archive only once implementation and specification agree.

The method is described in [spec-driven development](methodology/spec-driven-development.md).
