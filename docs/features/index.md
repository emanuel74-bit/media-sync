---
type: feature-index
status: active
last_verified: 2026-07-23
---

# Backend features

Feature documents are evidence-backed maps of responsibility, ownership, public surface, and
implementation structure. They are derived navigation: canonical observable behavior belongs in
[OpenSpec](../../openspec/specs/), durable rationale in [ADRs](../adr/index.md), current rules in
[`backend/CONVENTIONS.md`](../../backend/CONVENTIONS.md), and implementation truth in code/tests.

The inventory follows `PHIL-01` and `DIR-01`. `common`, `config`, and `infrastructure` support
these capabilities but are not top-level domain features.

| Feature | Responsibility | Source | Tests |
|---|---|---|---|
| [Streams](streams.md) | Stream records, reservation, lifecycle, assignment, and pipeline orchestration | [`backend/src/streams/`](../../backend/src/streams/) | [`backend/test/streams/`](../../backend/test/streams/) |
| [Nodes](nodes.md) | Node registration, heartbeat persistence, and live-node queries | [`backend/src/nodes/`](../../backend/src/nodes/) | [`backend/test/nodes/`](../../backend/test/nodes/) |
| [Alerts](alerts.md) | Alert rule evaluation, desired-state reconciliation, lifecycle, and REST access | [`backend/src/alerts/`](../../backend/src/alerts/) | [`backend/test/alerts/`](../../backend/test/alerts/) |
| [Metrics](metrics.md) | Scheduled MediaMTX operational metric persistence and query | [`backend/src/metrics/`](../../backend/src/metrics/) | [`backend/test/metrics/`](../../backend/test/metrics/) |
| [Stream inspection](stream-inspection.md) | Scheduled track/detail inspection, history persistence, and query | [`backend/src/stream-inspection/`](../../backend/src/stream-inspection/) | [`backend/test/stream-inspection/`](../../backend/test/stream-inspection/) |
| [Sync](sync.md) | Periodic and targeted convergence of observed streams, assignments, pipelines, and staleness | [`backend/src/sync/`](../../backend/src/sync/) | [`backend/test/sync/`](../../backend/test/sync/) |
| [Gateway](gateway.md) | Whitelisted system-event broadcast to Socket.IO clients | [`backend/src/gateway/`](../../backend/src/gateway/) | [`backend/test/gateway/`](../../backend/test/gateway/) |
| [Media nodes](media-nodes.md) | Application operations over live MediaMTX nodes and the transport gateway | [`backend/src/media-nodes/`](../../backend/src/media-nodes/) | [`backend/test/media-nodes/`](../../backend/test/media-nodes/) |
