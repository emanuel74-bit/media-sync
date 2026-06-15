# MediaMTX Stream Sync Backend

NestJS backend for synchronizing streams between ingest and cluster MediaMTX instances.

## Features

- Discovers ingest streams via the MediaMTX v3 paths API
- Creates pull pipelines on cluster MediaMTX nodes (round-robin across configured nodes)
- Deterministic stream-to-pod assignment (hash policy) with automatic failover on degraded metrics
- Metrics collection and threshold-based alerting (thresholds configurable via env)
- **Stream inspection**: periodic analysis of stream tracks (video, audio, subtitles, data) with alerting for missing/unexpected content
- CRUD stream control via REST
- Realtime notifications via Socket.IO WebSocket
- Persisted state/metrics/alerts/inspections in MongoDB
- OpenAPI docs at `/api/docs`
- Multi-pod registration and heartbeat-based health tracking

## Setup

1. `npm install`
2. configure `.env` values (see Environment Variables in `API_DOCUMENTATION.md`)
3. run `npm run start:dev` (or `npm run dev` to also regenerate barrel files on change)

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run start:dev` | Start NestJS in watch mode |
| `npm run dev` | Watch mode + automatic barrel (`index.ts`) regeneration |
| `npm run build` | Compile |
| `npm test` | Jest unit tests (`test/` tree mirrors `src/`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint with autofix |
| `npm run verify` | typecheck + lint + build + test |
| `npm run barrels:generate` | Regenerate all `index.ts` barrels (barrelsby) |

## Docker Testing

All deployment artifacts live under `deploy/` (see `deploy/README.md` for the full map):

```bash
# Local stack: MongoDB, MediaMTX ingest, MediaMTX cluster, app
npm run stack:up

# Scale the cluster to 3 instances
npm run stack:up:scaled

# Tear down
npm run stack:down
```

(Equivalent raw commands: `docker-compose -f deploy/docker/compose.local.yml [-f deploy/docker/compose.cluster.yml] up --build`.)

Requirements: Docker and Docker Compose installed, Docker Desktop running.

The MediaMTX pods (built from `deploy/docker/mediamtx-pod.Dockerfile`) automatically register themselves with the sync service on startup (`POST /api/pods/register`) and maintain heartbeats via `deploy/scripts/pod-heartbeat-monitor.sh`. Streams are dynamically assigned to available cluster pods.

## Testing

```powershell
# Unit tests (Jest)
npm test

# E2E API smoke test (streams, pods, alerts, metrics, inspection lifecycle)
.\test.ps1          # against an already-running stack
.\test.ps1 -Up      # starts the compose stack first
```

## API Documentation

- **Interactive Docs**: Visit `/api/docs` when the server is running for Swagger UI
- **Complete Reference**: See `API_DOCUMENTATION.md` for detailed endpoint documentation
- **Architecture**: See `SYSTEM_DOCUMENTATION.md` for module design and data flow
- **Code Conventions**: See `CONVENTIONS.md`

## Endpoints

- `GET /api/streams`
- `POST /api/streams`
- `GET /api/streams/assignment`
- `GET /api/streams/:name`
- `PATCH /api/streams/:name`
- `DELETE /api/streams/:name`
- `PATCH /api/streams/:name/assign` (assign to pod)
- `PATCH /api/streams/:name/unassign`
- `GET /api/pods`
- `GET /api/pods/active`
- `POST /api/pods/register`
- `POST /api/pods/heartbeat`
- `GET /api/alerts`
- `PATCH /api/alerts/:id/resolve`
- `GET /api/metrics/stream/:name`
- `GET /api/stream-inspection`
- `GET /api/stream-inspection/:streamName`
- `GET /api/stream-inspection/:streamName/history`
- `GET /api/docs`

WebSocket: connect via Socket.IO and listen for `stream.synced`, `stream.removed`, `stream.assigned`, `stream.unassigned`, `stream.inspected`, `alert.created`, `alert.resolved`, `pod.registered`.

## Notes

- The backend talks to the real MediaMTX v3 HTTP API: `/v3/paths/list`, `/v3/paths/get/{name}`, `POST /v3/config/paths/add/{name}`, `DELETE /v3/config/paths/delete/{name}`.
- Pipeline creation logic lives in `src/infrastructure/media-mtx/services/pipeline/media-mtx-pipeline.service.ts` (`createClusterPullPipeline`); adjust it if your cluster MediaMTX configuration differs.
- Scheduling intervals (sync every 10s, metrics every 10s, inspection every 30s) are hard-coded in `@Cron` decorators; the corresponding `*_INTERVAL` env vars are currently not consumed.
