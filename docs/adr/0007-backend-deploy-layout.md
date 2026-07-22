# ADR-0007: Backend deployment artifacts live under deploy/{docker,k8s,mediamtx,scripts}

- **Status**: Accepted
- **Date**: 2026-06-13
- **Related rules**: DIR-09

## Context

Ten deployment files sat flat in the backend root with misleading names. The
worst offenders: `k8s-deployment-mediamtx-{ingest,cluster}.yaml` were **not
Kubernetes manifests** — they were MediaMTX runtime configs that
`docker-compose.local` mounted as `/mediamtx.yml`. Additionally: the compose
files had no extension (no IDE/YAML tooling), `test.ps1`/`test.sh` ran a bare
`docker-compose up` that referenced a default compose file that doesn't exist,
the k8s probes targeted `/api/streams` (a path that does not exist on MediaMTX
v3, so readiness would never pass), and `script-pod-heartbeat.sh` was shipped
next to the `-monitor` variant without any indication that only the latter is
baked into the image.

## Decision

We will keep all deployment artifacts under `backend/deploy/`, grouped by
tool, named for what they actually are:

- `deploy/docker/` — `app.Dockerfile`, `mediamtx-pod.Dockerfile`,
  `compose.local.yml`, `compose.cluster.yml`. Compose build context is
  `backend/` so Dockerfiles can copy sources and scripts.
- `deploy/k8s/` — real Kubernetes manifests only (`mediamtx-configmap.yaml`,
  `mediamtx-cluster-deployment.yaml`).
- `deploy/mediamtx/` — MediaMTX runtime configs mounted by compose
  (`mediamtx-ingest.yml`, `mediamtx-cluster.yml`).
- `deploy/scripts/` — pod runtime scripts (`pod-heartbeat-monitor.sh` is the
  image CMD; `pod-heartbeat.sh` is the legacy simple variant).

Convenience npm scripts (`stack:up`, `stack:up:scaled`, `stack:down`) wrap the
longer compose commands. Fixed in the same change: the broken probe paths
(→ `/v3/paths/list`), the test scripts' compose invocation, and a stale
`.dockerignore`.

## Consequences

- Filenames now state their tool and purpose; the k8s/MediaMTX-config
  confusion cannot recur silently (DIR-09 + `deploy/README.md` document it).
- All compose/kubectl commands changed; docs and test scripts were updated
  together. Anything external (CI, runbooks) referencing the old paths must
  be updated.
- The MediaMTX config triplication remains (two files in `deploy/mediamtx/`
  + one embedded in the k8s ConfigMap) — consolidating them is a separate
  decision.
- Rejected: leaving compose at the backend root for discoverability (npm
  `stack:*` scripts preserve that convenience without the clutter).
