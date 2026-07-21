# Deployment artifacts

All build, compose, Kubernetes, and pod-runtime files for the backend stack.
Layout decision: [ADR-0007](../../docs/adr/0007-backend-deploy-layout.md); rule DIR-09 in `../CONVENTIONS.md`.

```
deploy/
├── docker/
│   ├── app.Dockerfile              # sync service image (build context: backend/)
│   ├── mediamtx-pod.Dockerfile     # MediaMTX + heartbeat monitor image
│   ├── compose.local.yml           # local stack: mongo, ingest, cluster, app
│   ├── compose.cluster.yml         # override: scale mediamtx-cluster to 3
│   └── compose.ingest.yml          # VM ingest cluster: N ingest nodes, distinct ports
├── k8s/
│   ├── mediamtx-configmap.yaml     # ConfigMap embedding mediamtx.yml (auth + catch-all path)
│   └── mediamtx-cluster-statefulset.yaml  # headless Service + StatefulSet (stable per-pod DNS)
├── mediamtx/
│   ├── mediamtx-ingest.yml         # MediaMTX runtime config (mounted by compose)
│   └── mediamtx-cluster.yml        # MediaMTX runtime config (mounted by compose)
└── scripts/
    ├── pod-heartbeat-monitor.sh    # image CMD: registers pod, heartbeats, watches MediaMTX
    └── pod-heartbeat.sh            # simpler legacy variant (not baked into any image)
```

## Docker Compose (run from `backend/`)

```bash
npm run stack:up           # docker-compose -f deploy/docker/compose.local.yml up --build
npm run stack:up:scaled    # + compose.cluster.yml override (3 cluster instances)
npm run stack:down
```

All compose-relative paths assume the files stay in `deploy/docker/`; the build
context is `backend/` so the Dockerfiles can copy sources and scripts.

## Kubernetes / OpenShift

The cluster nodes run as a **StatefulSet** (not a Deployment) so each pod has a
stable identity: a fixed ordinal name (`mediamtx-cluster-0`, `-1`, …) and a
stable DNS name from the headless Service
(`mediamtx-cluster-0.mediamtx-cluster.<namespace>.svc.cluster.local`). Each pod
self-registers that `(podId, host)` pair with the sync service and heartbeats;
because both survive reschedule, the pod registry keeps addressing the same node
across restarts instead of chasing an ephemeral pod IP.

```bash
kubectl apply -f deploy/k8s/mediamtx-configmap.yaml
kubectl apply -f deploy/k8s/mediamtx-cluster-statefulset.yaml   # headless Service + StatefulSet
kubectl scale statefulset mediamtx-cluster --replicas=3
```

The StatefulSet expects the `mediamtx-pod` image (built from
`docker/mediamtx-pod.Dockerfile`) pushed to your registry — update the `image:`
field accordingly. It also assumes the sync service is reachable at
`http://media-sync:3000` (the `MEDIA_SYNC_API` env) — adjust to your Service name.

## Ingest node cluster (VMs)

Ingest runs as a **cluster** of MediaMTX nodes on VMs (a VM can host several
nodes), not a single front — see [ADR-0013](../../docs/adr/0013-reserve-publish-ingest-cluster.md).
Each node publishes a distinct set of ports and self-registers them
(`apiPort`/`rtspPort`/`metricsPort`) so a published stream is addressable on the
specific node it landed on. Clients reserve a slot (`POST /api/ingest/streams`)
and publish to the returned URL; the node authorizes the publish against the
reservation via `authMethod: http` → `POST /api/ingest/auth`.

```bash
# On each ingest VM (from backend/):
VM_HOST=<vm-ip> MEDIA_SYNC_API=http://<sync-host>:3000 \
  docker-compose -f deploy/docker/compose.ingest.yml up --build -d
```

Scale by copying a node block in `compose.ingest.yml` and bumping its ports +
`POD_ID` + the `API_PORT`/`RTSP_PORT`/`METRICS_PORT` it reports (these must match
the host-published ports the sync service dials).

## Notes

- The MediaMTX configs in `mediamtx/` and the one embedded in the k8s ConfigMap
  are maintained separately; if you change ports or auth, change both.
- **Cluster** nodes use internal auth (`sync`/`syncpass`) — the sync service
  reaches them with `CLUSTER_MEDIAMTX_AUTH=sync:syncpass`, and the StatefulSet
  probes send the matching `Authorization: Basic` header (base64 of
  `sync:syncpass`).
- **Ingest** nodes use `authMethod: http` (`mediamtx-ingest.yml`): publish is
  authorized per-reservation by the sync service; `api`/`metrics`/`read` are
  excluded, so the sync control-plane and the internal relay pull need no token.
- The StatefulSet declares no `volumeClaimTemplates`: the cluster nodes are
  stateless relays (`record: false`), so the StatefulSet is used only for stable
  network identity, not persistent storage.
