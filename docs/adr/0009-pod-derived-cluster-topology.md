# ADR-0009: Pod-derived cluster topology, assigned-pod pipeline targeting, RTSP pull source

- **Status**: Accepted
- **Date**: 2026-06-15
- **Related rules**: INT-06, INT-04, ARCH-04

## Context

Two defects blocked running the cluster at scale (reported after the first
successful multi-replica deploy):

1. **Static cluster addressing.** `MediaMtxClientRegistry` built its cluster
   client pool once, from `CLUSTER_MEDIAMTX_BASE_URLS` — a single DNS name
   (`mediamtx-cluster:9000`) that round-robins across replicas. The system
   could neither address a specific replica nor discover replicas as they
   scaled. Worse, `createClusterPullPipeline` picked a *random* pool client, so
   the pipeline was provisioned on a different node than the one the assignment
   policy chose — `assignedPod` in the DB was fiction and metric-driven failover
   (which rewrites `assignedPod`) moved nothing physical.

2. **Garbage relay source.** The cluster pulls a path from the ingest. The pull
   URL was derived from `ingestBaseUrl` (the *API* URL, port 9000) and, on the
   primary branch, from the ingest's *reported* `source`. The real MediaMTX v3
   API returns `source` as an object (`{ type, id }`), not a string, so the
   reported value was `[object Object]`; and even when usable it described the
   ingest's upstream, not a URL the cluster could pull from. `readers` is
   likewise a v3 array, not a count.

## Decision

- **Derive cluster clients from the pod registry**, mirroring the existing
  ingest fallback. A `ClusterNodeResolverService` builds one client per
  registered cluster pod (by host, `CLUSTER_POD_MEDIAMTX_PORT`), falling back to
  the static pool when none are registered. Cluster listing fans out across
  these live clients.
- **Target the assigned pod.** `createClusterPullPipeline(stream, targetPodId)`
  resolves the client for the stream's `assignedPod`; provisioning and the
  facade plumb `stream.assignedPod` through. A vanished pod falls back to a
  static pick with a warning (the next sync/failover cycle corrects it). Deletes
  still fan out across all active nodes (owning node is not tracked).
- **Build the pull source as a real RTSP URL.** The cluster pulls
  `${INGEST_RTSP_URL}/${pathName}` (credentials included for ingest read auth),
  unless the stream's stored source is already a pullable protocol URL
  (`rtsp/rtmp/srt/http/udp`), in which case that is used directly (manual
  external sources). The v3 `source` is typed as `string | { type, id } | null`
  and mapped to a *description* (e.g. `"rtspSession"`) — never used as a URL.
  `readers` is normalized to a count.

A live end-to-end test (host ffmpeg → ingest → relay) also surfaced two latent
defects fixed alongside: the MediaMTX client's `removePath` used a non-existent
endpoint (`POST /v3/config/paths/remove`, always 404) so relay teardown silently
leaked every path — corrected to `DELETE /v3/config/paths/delete/{name}`; and
pod-derived client URLs carried no credentials, so every per-pod API call 401'd
— credentials are now sourced from the configured base URL. The ingest MediaMTX
config also lacked a catch-all `paths` entry, so it rejected all publishers
("path is not configured"); a `paths: { all_others: }` entry was added to the
ingest and cluster configs.

## Consequences

- The cluster scales: replicas are discovered as they register, streams are
  provisioned on the pod they are assigned to, and failover reassignment now
  moves the pipeline.
- Two more `forwardRef`s: `ClusterNodeResolverService` and
  `IngestStreamListingStrategy` both inject `PodQueryService`, and as the first
  infrastructure code to touch the `@/pods` barrel they would otherwise capture
  an undefined token mid-cycle (ARCH-04 / ADR-0008). This reinforces the
  follow-up in ADR-0008: hosting all Mongo repositories in `infrastructure/`
  is the root of these cycles.
- `getClientForRole(CLUSTER)` (the stats/metrics path) still uses the static
  round-robin pool — acceptable because cluster replicas mirror the same ingest
  streams and metric values are not yet derived (deferred item #2). Per-pod
  stats would require the same pod-resolution plumbing.
- The v3 **tracks** mapping still assumes objects, while the real API returns
  codec strings — untouched here (inspection/#2 scope). Track-based inspection
  alerts remain unverified against a live publisher.
- Rejected: inverting the dependency so callers pass pod refs into infra
  (removes infra→pods coupling but ripples through sync/streams signatures); the
  ingest strategy already established infra→pods as accepted, so the resolver
  follows it.
