---
last_verified: 2026-07-23
verified_against: backend/src/common/domain/enums, backend/src/nodes/domain, backend/src/streams/domain, backend/src/alerts/domain
---

<!-- cspell:words openspec frontmatter addressless pullable RTSP DEVN MediaMTX Mongo nodeId -->

# Glossary

Domain vocabulary as the code uses it. Each entry links to where the term is defined, so a
reader can check the definition rather than trust this page. Terms only — rules live in
[`backend/CONVENTIONS.md`](../backend/CONVENTIONS.md), behavior in
[the specifications](../openspec/specs/).

## Topology

**Node** — one MediaMTX instance that registered itself with the sync service. Identified by a
`nodeId`, addressed by a self-reported `host` plus self-reported ports; several nodes can share a
host and differ only by port. Defined in
[`node.types.ts`](../backend/src/nodes/domain/types/node.types.ts).

**Node role** (`NodeRole`) — `ingest` or `cluster`. Defined in
[`common/domain/enums`](../backend/src/common/domain/enums/).

**Ingest node** — a MediaMTX node that accepts published media. Ingest is a *cluster* of nodes
addressed per node, not a single stable endpoint
([ADR-0013](adr/0013-reserve-publish-ingest-cluster.md)).

**Cluster node** — a MediaMTX node that relays an assigned stream. Runs as a StatefulSet with
stable per-pod identity ([ADR-0012](adr/0012-cluster-nodes-as-statefulset.md)).

**Node registry** — the single source of truth for runtime topology: which nodes exist, their
hosts, their liveness. Fed by registration and heartbeat, owned by `NodesModule`. A transport
adapter is never a second source (`ARCH-11`). See the
[node registration subsystem](subsystems/node-registration-and-heartbeat.md); no canonical
behavioral OpenSpec currently exists.

**Live / active node** — a registry entry with `status = active` whose `lastHeartbeatAt` falls
inside the tolerance window (`NODE_HEALTH_TOLERANCE_SECONDS`, default 120s). Computed at read
time; nothing demotes a silent node.

**Heartbeat** — a node's periodic `POST /api/nodes/heartbeat`, refreshing `lastHeartbeatAt` so it
stays in the live set. May carry host resources.

**Node resources** — self-reported host CPU, memory, and disk usage as percentages 0–100,
attached to a register or heartbeat and forwarded to the alert pipeline as `node.sampled`
([ADR-0011](adr/0011-node-resource-alerts-third-producer.md)).

**Addressless adapter** — the MediaMTX transport gateway, which turns a caller-supplied host into
a client and holds no node addresses of its own. The feature resolves *which* node; the adapter
only talks to it (`ARCH-09`, `ARCH-11`).

## Streams

**Stream** — a persisted record of one media path. Defined in
[`streams/domain/types`](../backend/src/streams/domain/types/).

**Stream status** (`StreamStatus`) — the persisted lifecycle state. Every mutation goes through
`StreamStatusService`, the single authority: it validates the move against
`STREAM_STATUS_TRANSITIONS`, rejects an illegal jump with 409 before attempting any write, and
applies the change with compare-and-set semantics, retrying once against the winning state
(`DATA-07`, [ADR-0014](adr/0014-guard-stream-lifecycle-transitions.md)). MediaMTX wire states such
as `ready` and `inactive` are *observations*, not persisted lifecycle values. The authority's
general rules are traced in the
[assignment subsystem](subsystems/stream-assignment-and-pipeline-deployment.md); no canonical
behavioral OpenSpec currently exists.

**Birth state** — the lifecycle state a stream is created in, written only by its create flow and
never reached by a transition: `created` for a manual stream, `reserved` for an ingest
reservation.

**Reservation** — a held publish slot on a specific ingest node, created by
`POST /api/ingest/streams` before any media arrives. Carries a publish token and a TTL
(`INGEST_RESERVATION_TTL_MS`, default 300 000 ms); the sync loop frees expired reservations.
Publishing is the claim — there is no confirm call. See the
[reservation subsystem](subsystems/stream-reservation-and-publication.md); no canonical behavioral
OpenSpec currently exists.

**Publish token** — an opaque per-reservation secret, embedded in the returned RTSP publish URL
and validated at `POST /api/ingest/auth`. Cleared when the stream is promoted out of `reserved`,
so it does not survive the claim — see the conflict recorded in
[the specification map](specification-map.md).

**Assignment** — the cluster node a stream is placed on, chosen deterministically by hashing the
stream name. A cluster stream lives on exactly the node it was assigned to, so single-node
operations must target that node — never a pick over the pool, which would hit a sibling replica
and 404 (`INT-06`). Unlike ingest placement, assignment is a persisted mutation with its own
event. There is **no failover**: a stream moves only when convergence finds its node absent from
the candidate list. See the
[assignment subsystem](subsystems/stream-assignment-and-pipeline-deployment.md).

**Convergence** (`ensureAssigned`) — the operation that leaves a stream assigned to one of the
currently live cluster nodes, whatever it was before. A no-op when the stream is already on a
candidate **and** in `assigned`, `synced`, or `sync_error`; otherwise it restores the stream to
its own node when that node is still live, or hashes it onto a new one.

**Placement** — choosing the ingest node for a *reservation*, least-loaded, at reserve time,
where load is a node's live publishers plus the reservations already pending on it. Distinct from
assignment: placement is a birth-time input, assignment is a persisted mutation. See the
[reservation subsystem](subsystems/stream-reservation-and-publication.md).

**Pipeline** — the MediaMTX path configuration created on a cluster node so it pulls a stream
from its source. Built, deployed, and torn down by `StreamPipelineService`.

**Pull source** — the URL a cluster relay pulls from. An ingest-origin stream pulls from its own
ingest node; any other stream uses its stored pullable source (`INT-06`).

**Stream track** — a decoded media track (video, audio, …) parsed from MediaMTX's v3 response via
the `TRACK_FIELD_MAP` table. Unknown track types are dropped
([ADR-0003](adr/0003-data-driven-track-parsing.md)).

**Stream inspection** — a periodic per-stream scrape recording observed tracks and errors,
emitted as `stream.inspected`.

**Synchronization cycle** — the periodic loop that observes what is actually running on the
MediaMTX nodes and converges persisted records toward it: relay live ingest streams to the
cluster, reconcile manual streams, retire streams confirmed absent. Runs every
`SYNC_POLL_INTERVAL` (default 10s), never overlaps itself, and ends by emitting `sync.tick`.
See the [synchronization subsystem](subsystems/synchronization-and-reconciliation.md); no canonical
behavioral OpenSpec currently exists.

**Observation snapshot** (`SyncContext`) — the single view of the world one cycle is built on:
streams live on ingest and on cluster, live cluster node ids, and every persisted stream. Every
step of that cycle reads this and issues no queries of its own.

**Discovery promotion** — recording a stream observed live on ingest moves it to `discovered` when
it is `reserved`, `stale`, or holds an unrecognised state, and refreshes observation fields
without touching state otherwise, so a newer state is never regressed. Promotion clears the
reservation deadline **and** the publish token.

**Observation coverage** — the rule that stops a failed scrape from being read as "the stream is
gone". A stream is retired only when the ingest node it belongs to answered the listing request,
or has left the live set; a stream with no recorded node needs every live ingest node to have
answered.

**Targeted activation** — the low-latency path: an ingest node's `runOnReady` hook posts to
`POST /api/nodes/:nodeId/stream-ready` and that one stream is relayed immediately, reusing the
cycle's leaf steps rather than running a whole-population sweep (`SVC-10`).

## Alerts and metrics

**Alert** — an open or resolved problem record, deduplicated by the stable key
`(source, subject, type)`. Uniqueness under concurrent cycles is a database invariant — a partial
unique index over unresolved records — not application logic (`DATA-05`).

**Producer / evaluator / reconciler** — the three roles of the alert pipeline. A producer emits a
typed data event and never knows its consumer; an evaluator reacts and turns the data into the
alerts that *should* exist; a reconciler diffs desired against actual and converges them
(`SVC-06`, [ADR-0010](adr/0010-event-driven-alert-pipeline.md)).

**Alert rule** — a data entry, not a class: `{ check, type, severity, message }` in an
`*_ALERT_RULES` array. A new alert kind is a new rule entry plus a new `AlertType` member — no
new plumbing (`RULE-01`, `RULE-02`).

**Node metric / path metric** — Prometheus samples scraped from a node, persisted as separate
entities (`node-metric`, `path-metric`).

## Architecture and process

**Capability** — a stable system responsibility that a specification is written about (node
registry, stream reservation, …). Named after the responsibility, not a class or a change, so a
refactor does not rename it. Inventory: [specification map](specification-map.md).

**Gateway** — the layer that talks to an external system: HTTP clients, their caching factories,
the registry that vends them, boundary mappers, wire types. Lives under `infrastructure/<system>/`
and holds only transport (`ARCH-10`, `INT-01`).

**Repository port** — an abstract class in `<feature>/repositories/` that is both the contract and
the DI token. Its Mongo adapter lives in `infrastructure/database/mongo/<entity>/`, and the
binding lives in `DatabaseModule` (`DATA-01`, `ARCH-08`,
[ADR-0002](adr/0002-abstract-repositories-with-mongo-implementations.md)).

**Barrel** — a folder's `index.ts`. Feature-root barrels are curated named exports (the feature's
public surface); nested barrels export everything
([ADR-0004](adr/0004-curated-feature-root-barrels.md)). They are runtime cycle hazards, which is
why cross-module wiring imports the narrowest public sub-barrel
(`IMP-01`, `IMP-04`, [ADR-0008](adr/0008-runtime-safe-barrel-imports.md)).

**Scheduled task** — a job declared by a single `@ScheduledTask({ name, interval })` decorator.
`JobScheduler` discovers it at bootstrap, runs it on its config-driven interval, guards each run,
and prevents overlap (`JOB-01..03`).

**ADR** — an append-only architecture decision record under [`docs/adr/`](adr/). To change a
decision, write a new ADR that supersedes the old one; never rewrite history (`DOC-01`, `DOC-03`).

**Convention rule ID** — a stable identifier like `ARCH-11` or `DATA-05` in
[`backend/CONVENTIONS.md`](../backend/CONVENTIONS.md). Rules are cited by ID, never copied. IDs
are never renumbered; a reversed rule is retired and replaced by a new ID.

**Known deviation** (`DEVN-*`) — a verified gap between a rule and the code, recorded in the
`DEVN` section of the conventions registry and fixed on touch.

**Delta spec** — the added, modified, or removed requirements carried by one OpenSpec change,
under `openspec/changes/<change>/specs/<capability>/spec.md`. It merges into
[`openspec/specs/`](../openspec/specs/) at sync or archive time.
