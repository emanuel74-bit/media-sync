---
type: subsystem
subsystem: stream-reservation-and-publication
status: active
last_verified: 2026-07-23
participating_features:
  - streams
  - nodes
  - media-nodes
  - sync
---

# Stream reservation and publication

## Purpose

Reserve a unique stream name on a least-loaded live ingest node, issue a short-lived publish
secret, authorize MediaMTX callbacks, and hand observed publication to synchronization.

## Trigger

`POST /api/ingest/streams` begins reservation. MediaMTX subsequently calls
`POST /api/ingest/auth`, and publication becomes observable through periodic listing or the
targeted stream-ready callback.

## Participants

| Participant | Responsibility |
|---|---|
| Streams | Validate uniqueness, select placement, persist reservation, authorize publication |
| Nodes | Supply live ingest-node records |
| Media Nodes | Resolve ingest coordinates and operational loads |
| MediaMTX ingest node | Accept and expose the authorized published path |
| Sync | Discover the path and advance it toward cluster assignment |

## End-to-end flow

```mermaid
sequenceDiagram
    participant P as Publisher
    participant S as Streams
    participant N as Nodes / Media Nodes
    participant D as MongoDB
    participant M as Ingest MediaMTX
    participant Y as Sync
    P->>S: POST /api/ingest/streams
    S->>D: Check stream name
    S->>N: Live ingest nodes + loads
    S->>D: Create reserved stream + secret
    S-->>P: Ingest URL + secret
    P->>M: Publish stream
    M->>S: POST /api/ingest/auth
    S->>D: Validate node/name/secret/expiry
    S-->>M: Allow or deny
    Y->>M: Observe listed path
    Y->>S: Record discovery and continue reconciliation
```

## Responsibility boundaries

### Streams

Owns reservation identity, placement persistence, publish secret, expiry, and authorization.

### Nodes

Provides current live ingest topology; it does not mutate the stream record.

### Media Nodes

Provides load and address operations over those live nodes.

### MediaMTX ingest node

Hosts the authorized publication and exposes the observed path.

### Sync

Interprets observation and requests later lifecycle changes.

## State transitions

| Initial state | Trigger | Resulting state | Owner | Evidence |
|---|---|---|---|---|
| No stream record | Reservation accepted | `reserved` record | Streams | [`stream-reservation.service.ts`](../../backend/src/streams/services/orchestration/stream-reservation.service.ts) |
| `reserved` | Sync observes publication | `discovered` | Streams | [`ingest-stream-synchronizer.service.ts`](../../backend/src/sync/services/workflows/ingest-stream-synchronizer.service.ts) |
| Expired `reserved` | Staleness confirms expiry/absence | Record deleted | Streams | [`stream-staleness.service.ts`](../../backend/src/sync/services/workflows/stream-staleness.service.ts) |

## Persistence effects

| Write | Owner | Repository | Condition |
|---|---|---|---|
| Create reserved stream with ingest node, expiry, and secret | Streams | `StreamRepository` | Unique name and live ingest placement selected |
| Promote reservation to discovered and clear reservation fields | Streams | `StreamRepository` | Sync observes the matching published path |
| Delete expired reservation | Streams | `StreamRepository` | Guarded staleness/expiry check succeeds |

Authorization is read-only.

## Events

| Event | Producer | Trigger | Consumers |
|---|---|---|---|
| `stream.reserved` | Streams | Reserved record created | Gateway |

Later assignment/pipeline events belong to their respective subsystem.

## Success behavior

The caller receives coordinates and a secret for the persisted ingest placement; matching,
unexpired MediaMTX authorization is accepted and the published path can be observed by Sync.

## Failure behavior

| Failure | Expected behavior | Owner | Evidence |
|---|---|---|---|
| Duplicate name observed | Reject before creation | Streams | [`stream-reservation.service.ts`](../../backend/src/streams/services/orchestration/stream-reservation.service.ts) |
| No live ingest node | Fail without creating a record | Streams | [`stream-reservation.service.test.ts`](../../backend/test/streams/services/orchestration/stream-reservation.service.test.ts) |
| Load/coordinate lookup fails | Fail without returning a successful reservation | Streams / Media Nodes | [`stream-reservation.service.ts`](../../backend/src/streams/services/orchestration/stream-reservation.service.ts) |
| Bad node/name/secret or expiry | Deny publish authorization | Streams | [`publish-auth.service.test.ts`](../../backend/test/streams/services/query/publish-auth.service.test.ts) |
| Publication never appears | Guardedly delete after expiry/absence is confirmed | Sync / Streams | [`stream-staleness.service.test.ts`](../../backend/test/sync/services/workflows/stream-staleness.service.test.ts) |

## Idempotency

The stream-name unique index prevents two persisted records. The API is not an idempotency-key
protocol: retrying after success encounters the existing name.

## Concurrency and consistency

The duplicate check and create are separate operations. The unique index is the final concurrent
guard, but deterministic mapping of a racing duplicate-key error to HTTP 409 is not verified.
Node load and pending-reservation counts are snapshots, so placement is intentionally approximate.

## Operational considerations

Reservation expiry limits unused secrets. Liveness/load accuracy depends on node heartbeat and
metric cadence. Publication auth remains dependent on the persisted node identity and secret.

## Related features

[Streams](../features/streams.md), [Nodes](../features/nodes.md),
[Media nodes](../features/media-nodes.md), and [Sync](../features/sync.md).

## Behavioral specifications

No canonical behavioral OpenSpec exists; see the [specification map](../specification-map.md).

## Architecture decisions

[ADR-0013](../adr/0013-reserve-publish-ingest-cluster.md) and
[ADR-0014](../adr/0014-guard-stream-lifecycle-transitions.md).

## Governing conventions

| Rule | Relevance |
|---|---|
| `ARCH-11`, `INT-06` | Live registry topology and per-node targeting |
| `DATA-07` | Guarded lifecycle authority after birth-state creation |
| `EVT-01`, `EVT-05` | Mutation-owned reservation event and payload typing |
| `TEST-05`, `DOC-06` | Cross-service evidence and subsystem maintenance |

See [`backend/CONVENTIONS.md`](../../backend/CONVENTIONS.md).

## Evidence

| Claim | Implementation | Test |
|---|---|---|
| Reservation selects/persists an ingest placement and secret | [`stream-reservation.service.ts`](../../backend/src/streams/services/orchestration/stream-reservation.service.ts) | [`stream-reservation.service.test.ts`](../../backend/test/streams/services/orchestration/stream-reservation.service.test.ts) |
| Publish authorization checks the persisted reservation | [`publish-auth.service.ts`](../../backend/src/streams/services/query/publish-auth.service.ts) | [`publish-auth.service.test.ts`](../../backend/test/streams/services/query/publish-auth.service.test.ts) |
| Observation promotes a reserved stream without regressing newer states | [`ingest-stream-synchronizer.service.ts`](../../backend/src/sync/services/workflows/ingest-stream-synchronizer.service.ts) | [`ingest-stream-synchronizer.service.test.ts`](../../backend/test/sync/services/workflows/ingest-stream-synchronizer.service.test.ts) |
