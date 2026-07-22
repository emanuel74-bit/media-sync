# ADR-0010: Event-driven alert pipeline — producers emit, rulers evaluate, alerts reconcile

- **Status**: Accepted
- **Date**: 2026-06-26
- **Related rules**: RULE-01..04, EVT-01/04, SVC-06, DATA-05

## Context

Alerting was entangled with the producers. The metrics feature owned its alert
rules and called `AlertEvaluationService` synchronously inside the collection
workflow; stream-inspection had its own `StreamTrackAlertService` doing the
same. Alerts could only be created (deduped on `{stream, type}`) or resolved
manually via REST — no automatic resolve when a condition cleared, no update
when it changed. Adding a new alert source meant wiring rules + an alerts
dependency into yet another producer.

Separately, the metrics feature was redefined (ADR-0009 follow-up) to monitor
MediaMTX-as-a-service (node/path operational data), leaving per-stream quality
to inspection — so its old quality rules were dead anyway.

## Decision

Three roles with a one-way, event-driven flow, reused by every producer:

1. **Producers emit data, nothing more.** Metrics emits `metrics.collected`
   (all node + path samples); inspection emits `stream.inspected`. Neither
   imports the alerts feature or knows rules exist.
2. **Rulers (in the alerts feature) evaluate.** `MetricAlertRuler`
   (`@OnEvent metrics.collected`) and `TrackAlertRuler` (`@OnEvent
   stream.inspected`) run their rule set through the shared `RuleEvaluator` to
   produce `AlertSignal`s, then call the reconciler directly.
3. **Alerts reconciles + exports.** `AlertReconcileService`, scoped by an
   `AlertSource`, diffs the current signals against open alerts:
   add / refresh (bump `lastSeenAt`) / update (`alert.updated`) / resolve. The
   gateway broadcasts the lifecycle events to clients.

Boundary rule (why the hops differ): **cross a feature boundary → event; stay
inside a feature → direct call.** Producer→ruler crosses metrics/inspection →
alerts, so it is an event (decoupled, fire-and-forget, 0..N listeners,
failure-isolated, uniform across producers). Ruler→reconcile is inside alerts
with one consumer and needs the whole signal set at once, so it is a direct
call. This matches EVT-04.

Reconcile contract: a ruler with a complete cross-subject batch (metrics) calls
`reconcileSource` (auto-resolves subjects that vanished from the cycle); a ruler
with one subject per event (inspection) calls `reconcileSubject`.

## Consequences

- A third producer (node resource alerts, ADR-pending) plugs in by emitting a
  data event + adding a ruler + rule set in alerts + an `AlertSource` value —
  no new lifecycle code.
- Alerts now auto-resolve and update, not just create; `Alert` gained `source`
  and `lastSeenAt`, and `alert.updated` joined the broadcast set.
- `alerts` now depends on `streams` (the track ruler reads a stream's track
  expectations); the runtime import graph stays acyclic (infra→alerts is
  type-only).
- Removed as dead: `AlertEvaluationService`, inspection's
  `StreamTrackAlertService`, the bitrate/packet-loss/latency `AlertType`s and
  their `ConfigService` thresholds, the `common/rules` metric predicates, and
  `AlertMetricInput`/`MetricThresholds`.
- Rejected: a second event hop ruler→alerts (indirection with no fan-out);
  keeping rulers in producers (the coupling we set out to remove).
