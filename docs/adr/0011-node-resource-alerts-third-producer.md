# ADR-0011: Node resource alerts — pods self-report CPU/memory/disk as a third alert producer

- **Status**: Accepted
- **Date**: 2026-06-27
- **Related rules**: SVC-06, DATA-05, RULE-04

## Context

The event-driven alert pipeline (ADR-0010) was built to be reused. Adding host
resource alerts (CPU / memory / disk) is the validating third producer — and the
first that does not alert on a *stream*. Two questions: where does the resource
data come from, and how does an alert subject that is a node (not a stream) fit
the pipeline.

MediaMTX's `/metrics` exposes application data, not host CPU/memory/disk; those
need a separate source (node_exporter, k8s metrics-server, or pod self-report).

## Decision

- **Source: pods self-report.** The `pod-heartbeat-monitor.sh` already POSTs to
  the sync service every ~20s; it now reads `/proc/stat`, `/proc/meminfo`, and
  `df /` and includes `resources: { cpu, memory, disk }` (integer percent) on
  register/heartbeat. No new infrastructure, works in Compose and k8s, and node
  identity already lives in the pods feature. Temperature is intentionally
  excluded (not container-portable, host-specific).
- **Producer: the pods feature emits `node.sampled`.** `PodRegistrationService`
  forwards reported resources as a `NodeSampledPayload { podId, context, cpu,
  memory, disk }`. Pods do not import alerts; resources are not persisted on the
  pod record (the alert is the deliverable).
- **Ruler + rules in alerts.** `NodeResourceRuler` (`@OnEvent node.sampled`)
  evaluates `NODE_RESOURCE_RULES` with thresholds from `ConfigService`
  (`NODE_CPU/MEMORY/DISK_HIGH_PERCENT`, default 85/90/85) and
  `reconcileSubject(node, podId, …)` — auto-resolving when usage drops, exactly
  like the inspection ruler.
- **Subject generalization.** An alert's subject is no longer always a stream,
  so `Alert.streamName` / `AlertSignal.streamName` were renamed to **`subject`**
  (a stream name for metrics/inspection, a pod id for node). New `AlertSource.NODE`
  and `AlertType.NODE_CPU_HIGH/NODE_MEMORY_HIGH/NODE_DISK_HIGH`.

## Consequences

- The pipeline is proven reusable: a non-stream producer plugged in with only an
  event + ruler + rule set + enum values — zero changes to reconcile or lifecycle.
  Verified live (register high CPU → `node_cpu_high`; heartbeat low CPU →
  auto-resolved).
- `Alert.subject` is a breaking response-field rename (`streamName` → `subject`);
  the frontend `Alert` type — already stale on other fields — needs updating.
- A pod that stops heartbeating won't auto-resolve its node alerts (no event);
  acceptable for now (mirrors inspection; pod death is a separate concern).
- CPU% needs a two-sample `/proc/stat` delta, so each resource read costs ~1s
  inside the heartbeat loop; disabled with `REPORT_RESOURCES=0`.
- Rejected: scraping node_exporter (new infra to deploy + discover); persisting
  resources on the pod record (out of scope — revisit for a node dashboard).
