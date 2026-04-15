# MediaMTX Stream Sync Backend

NestJS backend for synchronizing streams between ingest and cluster MediaMTX instances.

## Features

- discovers ingest streams
- syncs pull pipelines in cluster MediaMTX
- metrics collection and alerting
- supports CRUD stream control via REST
- realtime notifications via WebSocket
- persisted state/metrics/alerts/alerts in MongoDB
- OpenAPI docs at `/api/docs`
- Multi-pod assignment and failover
- **Stream inspection**: periodic analysis of stream tracks (video, audio, subtitles, data) with alerting for missing/unexpected content

## Setup

1. `npm install`
2. configure `.env` values (defaults in .env)
3. run `npm run start:dev`

## Docker Testing

To test with Docker Compose:

1. Ensure Docker and Docker Compose are installed and Docker Desktop is running.
2. Run `docker-compose up --build`
3. Services will start: MongoDB, MediaMTX ingest, MediaMTX cluster (with automatic registration), and the app.
4. Run tests: `./test.ps1` (PowerShell script for API tests)

If Docker Desktop is not running, start it first.

The MediaMTX cluster pods automatically register themselves with the sync service on startup and maintain heartbeats. Streams are dynamically assigned to available pods. Scale the cluster by running multiple instances of the same service.

To scale the cluster horizontally for testing:

```bash
# Scale to 3 instances
docker-compose up --scale mediamtx-cluster=3 --build

# Or use the scale override file
docker-compose -f docker-compose.local -f docker-compose.cluster up --build
```

## Testing

Run the included test scripts:

```bash
# PowerShell - Full API tests
.\test.ps1

# PowerShell - Pod registration tests
.\test-pods.ps1
```

This will test all endpoints and report results.

## API Documentation

- **Interactive Docs**: Visit `/api/docs` when the server is running for Swagger UI
- **Complete Reference**: See `API_DOCUMENTATION.md` for detailed endpoint documentation

## Endpoints

- `GET /api/streams`
- `POST /api/streams`
- `PATCH /api/streams/:name`
- `DELETE /api/streams/:name`
- `PATCH /api/streams/:name/assign` (assign to pod)
- `PATCH /api/streams/:name/unassign`
- `GET /api/streams/assignment`
- `GET /api/alerts`
- `PATCH /api/alerts/:id/resolve`
- `GET /api/metrics/stream/:name`
- `GET /api/stream-inspection`
- `GET /api/stream-inspection/:streamName`
- `GET /api/stream-inspection/:streamName/history`
- `GET /api/docs`

WebSocket: connect to server and listen `stream.synced`, `stream.removed`, `alert.created`.

## Notes

- MediaMTX API paths are assumed (e.g., `/api/streams`, `/api/stream-pipelines`).
- adjust pipeline creation logic in `MediaMtxService.createClusterPullPipeline` to match your OpenShift MediaMTX configuration.
