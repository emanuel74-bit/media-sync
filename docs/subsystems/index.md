---
type: subsystem-index
status: active
last_verified: 2026-07-23
---

# Backend subsystems

Subsystem documents trace significant behavior that crosses feature boundaries. They are derived
navigation, not a replacement for [OpenSpec](../../openspec/specs/), [ADRs](../adr/index.md),
[`backend/CONVENTIONS.md`](../../backend/CONVENTIONS.md), code, or tests.

| Subsystem | Outcome | Participating features | Trigger |
|---|---|---|---|
| [Node registration and heartbeat](node-registration-and-heartbeat.md) | Maintain the live-node registry and publish resource observations | Nodes, Alerts, Gateway | Register/heartbeat HTTP request |
| [Stream reservation and publication](stream-reservation-and-publication.md) | Reserve an ingest node and authorize a publisher until discovery | Streams, Nodes, Media Nodes, Sync | Ingest reservation HTTP request |
| [Stream assignment and pipeline deployment](stream-assignment-and-pipeline-deployment.md) | Assign a discovered/manual stream and converge its cluster pull pipeline | Streams, Media Nodes, Sync | Sync reconciliation or manual onboarding |
| [Synchronization and reconciliation](synchronization-and-reconciliation.md) | Reconcile observed MediaMTX state with stream records and clean stale state | Sync, Streams, Nodes, Media Nodes | Fixed interval or stream-ready callback |
| [Metrics collection](metrics-collection.md) | Persist operational snapshots and feed metric alert evaluation | Metrics, Media Nodes, Nodes, Alerts | Fixed interval |
| [Stream inspection](stream-inspection.md) | Persist track/detail observations and feed track alert evaluation | Stream Inspection, Streams, Media Nodes, Alerts | Fixed interval |
| [Alert evaluation and reconciliation](alert-evaluation-and-reconciliation.md) | Converge unresolved alerts to desired rule results | Alerts, Metrics, Stream Inspection, Nodes, Streams, Gateway | Observation event or manual resolution |
| [Realtime event broadcast](realtime-event-broadcast.md) | Deliver selected in-process events to connected Socket.IO clients | Gateway, Streams, Alerts, Stream Inspection, Nodes | Whitelisted in-process event |

Support packages such as `common`, `config`, and `infrastructure` participate as implementation
boundaries but are not top-level domain features.
