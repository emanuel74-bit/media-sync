## Plan: MediaMTX Stream Sync Backend

TL;DR: Build a NestJS + Node backend with a sync worker that polls ingest MediaMTX, manages stream state, creates/removes pull configurations on OpenShift MediaMTX, and exposes REST + WebSocket control/observability APIs. Include metrics collection, alerting rules, durable state in MongoDB, and extensible design for future UI.

Steps
1. Establish initial folder + NestJS skeleton in d:\codeShit\media-sync.
2. Define domain model: Stream, MediaMtxInstance, SyncState, Metric, Alert.
3. Implement configuration module for MediaMTX endpoints and polling intervals.
4. Build MediaMTX API clients for ingest and cluster (get streams, add/remove source, get stats).
5. Implement SourceDiscoveryService with a periodic poll (RxJS interval and lock), detect created/removed/modified by comparing current set with persisted map.
6. Implement SyncService: create/update/remove pull pipelines in cluster MediaMTX for ingest streams via API operations. Handle idempotency and retries.
7. Create StreamStateRepository wrapping Mongoose model operations and caching for quick reads.
8. Implement MetricsCollectorService: gather ingest output and cluster output metrics, calculate fps/bitrate/jitter/loss, persist to Mongo time-series collection and in-memory queue for event notifications.
9. Implement AlertingService with policies (bitrate drop 30%, disconnect, sync failure, unused stream) and alert event stream via WebSocket.
10. Implement Control module (REST + WebSocket): list streams, details, add/remove/update/restart, inspect health, query alerts, query metrics.
11. Implement event bus (Nest EventEmitter or RxJS Subjects) to propagate changes from discovery/pipeline status to WebSocket gateway.
12. Ensure observability: structured logging (pino), context tags, and metrics export (Prometheus endpoints using @willsoto/nestjs-prometheus).
13. Add OpenAPI docs for all endpoints.
14. Build tests: unit tests for services (supertest for controller), integration tests with mocked MediaMTX API via nock, e2e test flows.
15. Add README and architecture doc in docs/ detailing API, flows, states, assumptions, extension points.

Verification
1. run npm ci and npm run test
2. run npm run start:dev and call GET /api/streams, ensure service boots and polls (mock endpoints) Logs show discovery and sync updates.
3. run integration scenario: ingest endpoint returns one stream; pipeline created in cluster endpoint; check persisted state.
4. run alert scenario with low bitrate and verify /api/alerts returns event and WebSocket event emitted.
5. run endpoint coverage check with nestjs tests and Postman.

Decisions
- Use MongoDB + Mongoose for durable state and metrics; optional Prometheus export adapter later.
- Separate ingest vs cluster API client classes for clear responsibilities.
- Poll-based discovery with configurable interval; use webhooks later.
- Stream composition extracted from MediaMTX stream object.
- Synchronization is on-demand: cluster endpoints are created only after stream discovery and control request (enable). Configuration supports demand mode.

Further Considerations
1. Need MediaMTX API schema details and sample responses. optional: refresh from mtx openapi.
2. Verify whether streams can be dynamically removed by source; ensure stale entries cleanup.
3. Define exact alert thresholds (bitrate ratio, stale window) in config.
