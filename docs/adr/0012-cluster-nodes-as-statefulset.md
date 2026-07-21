# ADR-0012: Run MediaMTX cluster nodes as a StatefulSet with stable per-pod identity

- **Status**: Accepted
- **Date**: 2026-07-14
- **Related rules**: ARCH-11, DIR-09

## Context

Cluster MediaMTX nodes previously ran as a Kubernetes **Deployment**
(`mediamtx-cluster-deployment.yaml`, replicas scaled by hand). Each pod
self-registered with the sync service using `POD_HOST=status.podIP` — its
ephemeral pod IP — and `POD_ID=metadata.name`. Under a Deployment both change
when a pod is rescheduled: the ReplicaSet mints a new random pod name and a new
IP, so the sync service saw the node leave and a different node arrive.

That churn is in tension with the topology model we had just settled on
(ADR-0009, ARCH-11): the sync service's **pod registry is the single source of
truth** for which cluster nodes are live and where to reach them, fed by
heartbeats, with no static-address fallback. A stream is pinned to the specific
node it was assigned to (INT-06); `NodeResolver.getClusterClientForPod` resolves
that pod in the live set and now *throws* when it is gone rather than rerouting.
With ephemeral identities, a routine reschedule looked like an outage: the
assigned pod's id/host vanished, its pipelines had to be rebuilt on a
freshly-named node, and in-flight single-node operations failed. The registry
was doing exactly what it should — the churn was coming from the deployment
primitive underneath it.

The cluster nodes are stateless media relays (`record: false`, `runOnDemand`),
so this is *not* about persistent volumes. The need is **stable identity**:
a name and address that survive reschedule.

## Decision

We will run the cluster nodes as a **StatefulSet** fronted by a **headless
Service** (`clusterIP: None`), and register each pod by its stable coordinates:

- `POD_ID = metadata.name` — the StatefulSet's stable ordinal name
  (`mediamtx-cluster-0`, `-1`, …), which is reassigned to the same slot on
  reschedule.
- `POD_HOST = <pod>.mediamtx-cluster.<namespace>.svc.cluster.local` — the stable
  per-pod DNS record the headless Service publishes, composed from the downward-
  API `POD_NAME`/`POD_NAMESPACE`. **Not** the pod IP.

The self-registration heartbeat model is unchanged — the pod still POSTs
`(podId, host, type)` and heartbeats — because it already produces exactly the
`(podId, host)` pair the registry keys on; only the *values* became stable. The
backend needs no code change: `Pod.host` was always an opaque reachable host
used to build `http://host:port`, and stays so. `podManagementPolicy: Parallel`
keeps independent relays from serializing on ordinal boot order. No
`volumeClaimTemplates`: identity, not storage.

## Consequences

- **Easier**: a reschedule is transparent — the same `(podId, host)` re-registers,
  the assigned-pod pipeline targeting (INT-06) keeps hitting the same logical
  node, and the "throw when the assigned pod is gone" path (ARCH-11) now fires
  only on a *real* loss, not on every restart.
- **Easier**: scaling is `kubectl scale statefulset … --replicas=N`; new ordinals
  self-register with predictable names/hosts.
- **Harder / follow-up**: the k8s probes hit the v3 API, which now requires
  internal auth, so they carry an `Authorization: Basic` header — the ConfigMap
  gained the `sync`/`syncpass` internal-auth block to match
  `deploy/mediamtx/mediamtx-cluster.yml` (the old drift the README flagged) and
  the sync service's `CLUSTER_MEDIAMTX_AUTH`. Credentials now live in three
  places that must stay in step (ConfigMap, runtime config, probe header).
- **Rejected — Deployment + a per-replica Service**: headless-Service stable DNS
  is the purpose-built primitive for stable identity; hand-rolling stable
  addressing over a Deployment reinvents it.
- **Rejected — drop self-registration for k8s-native discovery** (sync service
  lists StatefulSet pods via the k8s API/DNS): larger change, couples the sync
  service to the orchestrator, and abandons the ingest/cluster-symmetric
  heartbeat registry that also carries health and self-reported resources
  (ADR-0011). The registry stays the source of truth; the StatefulSet just makes
  the identities it records stable.
