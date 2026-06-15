# Deployment artifacts

All build, compose, Kubernetes, and pod-runtime files for the backend stack.
Layout decision: [ADR-0007](../../docs/adr/0007-backend-deploy-layout.md); rule DIR-09 in `../CONVENTIONS.md`.

```
deploy/
├── docker/
│   ├── app.Dockerfile              # sync service image (build context: backend/)
│   ├── mediamtx-pod.Dockerfile     # MediaMTX + heartbeat monitor image
│   ├── compose.local.yml           # local stack: mongo, ingest, cluster, app
│   └── compose.cluster.yml         # override: scale mediamtx-cluster to 3
├── k8s/
│   ├── mediamtx-configmap.yaml     # ConfigMap embedding mediamtx.yml
│   └── mediamtx-cluster-deployment.yaml  # Deployment with v3 probes + heartbeat env
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

```bash
kubectl apply -f deploy/k8s/mediamtx-configmap.yaml
kubectl apply -f deploy/k8s/mediamtx-cluster-deployment.yaml
kubectl scale deployment mediamtx-cluster --replicas=3
```

The deployment expects the `mediamtx-pod` image (built from
`docker/mediamtx-pod.Dockerfile`) pushed to your registry — update the `image:`
field accordingly.

## Notes

- The MediaMTX configs in `mediamtx/` and the one embedded in the k8s ConfigMap
  are maintained separately; if you change ports or auth, change both.
- The compose configs enable internal auth (`sync`/`syncpass`); the ConfigMap
  variant currently does not.
