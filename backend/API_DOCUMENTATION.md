# API Documentation - MediaMTX Stream Sync

This document provides comprehensive documentation for all API endpoints in the MediaMTX Stream Sync backend system.

## Base URL

```
http://localhost:3000
```

**WebSocket Server (Socket.IO):**

```
ws://localhost:3000  (path: /socket.io)
```

## Authentication

No authentication required for this version.

## Content Types

- Request: `application/json`
- Response: `application/json`

## OpenAPI Documentation

Interactive API documentation available at:

```
GET /api/docs
```

Provides Swagger UI for testing all endpoints.

---

The MediaMTX Stream Sync system is a NestJS-based distributed streaming orchestration platform that:

- Discovers streams from the ingest MediaMTX node (with fallback to registered ingest nodes)
- Automatically synchronizes them to a cluster of MediaMTX nodes via pull pipelines
- Distributes load across cluster nodes using a deterministic hash assignment policy
- Monitors stream health with periodic metrics and threshold-based alerts
- Inspects stream tracks and raises alerts on missing/unexpected content
- Provides WebSocket-based real-time notifications

### Key Concepts

- **Node**: A MediaMTX instance (ingest or cluster type) that registers with the system
- **Stream**: A media stream discovered from ingest (or created manually), tracked in the database, and assigned to cluster nodes
- **Assignment**: A stream's current node assignment, used for load distribution and failover
- **Metric**: A timestamped performance sample (bitrate, FPS, latency, etc.) for a stream on a node
- **Alert**: A system-generated notification for conditions like low bitrate or packet loss
- **Inspection**: Analysis of a stream's media tracks (video/audio/subtitle/data) and their codecs

## Streams API

### Get All Streams

Retrieve a list of all streams.

**Endpoint:** `GET /api/streams`

**Response:**

```json
[
  {
    "_id": "string",
    "name": "string",
    "source": "string",
    "status": "created|reserved|discovered|pending_assignment|assigned|synced|sync_error|stale",
    "metadata": {},
    "isEnabled": boolean,
    "lastSeenAt": "2023-01-01T00:00:00.000Z",
    "lastSyncedAt": "2023-01-01T00:00:00.000Z",
    "lastError": "string|null",
    "activeConsumers": number,
    "isManual": boolean,
    "assignedNode": "string|null",
    "assignedAt": "2023-01-01T00:00:00.000Z|null",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Create Stream

Create a new stream. The stream is immediately assigned to an active cluster node and a pull pipeline is provisioned. If no cluster nodes are active, the stream is stored with status `pending_assignment`.

**Endpoint:** `POST /api/streams`

**Request Body:**

```json
{
  "name": "string (required)",
  "source": "string (required)",
  "isEnabled": boolean (optional, default: false)
}
```

**Response:** Stream object (same as above)

### Get Stream Assignments

Get assignment information for all streams. (Declared before `GET /api/streams/{name}`, so the literal path `assignment` is never shadowed by the name parameter.)

**Endpoint:** `GET /api/streams/assignment`

**Response:**

```json
[
    {
        "name": "string",
        "status": "created|reserved|discovered|pending_assignment|assigned|synced|sync_error|stale",
        "assignedNode": "string|null",
        "assignedAt": "2023-01-01T00:00:00.000Z|null"
    }
]
```

### Get Stream by Name

Retrieve a specific stream by name.

**Endpoint:** `GET /api/streams/{name}`

**Parameters:**

- `name` (path): Stream name

**Response:** Stream object, or `null` if not found

### Update Stream

Update an existing stream.

**Endpoint:** `PATCH /api/streams/{name}`

**Parameters:**

- `name` (path): Stream name

**Request Body:**

```json
{
  "source": "string (optional)",
  "isEnabled": boolean (optional),
  "status": "created|reserved|discovered|pending_assignment|assigned|synced|sync_error|stale (optional)"
}
```

**Response:** Updated stream object

Lifecycle status changes are validated against the server's transition table and applied atomically. An illegal or concurrently superseded transition returns `409 Conflict`.

### Delete Stream

Delete a stream.

**Endpoint:** `DELETE /api/streams/{name}`

**Parameters:**

- `name` (path): Stream name

**Response:** Empty

### Assign Stream to Node

Assign a stream to a specific node.

**Endpoint:** `PATCH /api/streams/{name}/assign`

**Parameters:**

- `name` (path): Stream name

**Request Body:**

```json
{
    "nodeId": "string (required)"
}
```

**Response:** Updated stream object with `assignedNode` and `assignedAt`

### Unassign Stream

Remove node assignment from a stream.

**Endpoint:** `PATCH /api/streams/{name}/unassign`

**Parameters:**

- `name` (path): Stream name

**Response:** Updated stream object with `assignedNode: null`

---

## Ingest API

Publish-side API for the ingest cluster. A client **reserves** a slot (load-balanced onto the least-loaded ingest node) and receives the coordinates to publish to; it then pushes media straight to that node over RTSP. The sync loop relays the stream to a cluster node once media arrives — there is no confirm call. See [ADR-0013](../docs/adr/0013-reserve-publish-ingest-cluster.md).

### Reserve a Publish Slot

Reserve a publish slot for a new stream. Rejects a name that already exists (409) and returns 503 when no ingest nodes are active. Creates a `RESERVED` stream holding the slot until `expiresAt`; the sync staleness GC frees it if no media arrives.

**Endpoint:** `POST /api/ingest/streams`

**Request Body:**

```json
{
  "name": "string (required) — path-safe: letters, digits, underscores, hyphens"
}
```

**Response:**

```json
{
  "name": "cam-42",
  "ingestNode": "ingest-vm1-2",
  "publishUrl": "rtsp://publish:<secret>@10.0.0.5:8564/cam-42",
  "publishToken": "<opaque secret; also embedded in publishUrl>",
  "expiresAt": "2026-07-16T12:00:00.000Z"
}
```

Publish to `publishUrl` as-is (the per-reservation secret is already embedded as RTSP credentials). The reservation is held until `expiresAt`; publishing before then activates it.

### Ingest Publish Auth (internal)

Called by ingest MediaMTX nodes (`authMethod: http`, `authHTTPAddress`), not by clients. MediaMTX POSTs each publish attempt; a `200` permits it, any non-2xx denies. Authorizes a `publish` only when the presented secret matches the reservation for that path. `api`/`metrics`/`read` are excluded at the node and never reach here.

**Endpoint:** `POST /api/ingest/auth`

### Stream Ready Hook (internal)

Called by an ingest node's `runOnReady` hook the instant a path starts publishing. Relays **that** stream to a cluster node immediately — a targeted relay from the hook's `(nodeId, name)` (record live → assign → deploy), no whole-cluster scan — instead of waiting for the next poll. Node-sourced. Awaits the relay and returns `202`; a failure surfaces as a 5xx to the node's hook.

**Endpoint:** `POST /api/nodes/{nodeId}/stream-ready`

**Request Body:**

```json
{ "name": "string (required) — the path that went live" }
```

**Ingest environment:**

- `INGEST_MEDIAMTX_AUTH` — `user:pass` the sync control-plane uses for a node's API/metrics (`""` when none).
- `INGEST_PUBLISH_USER` — RTSP username embedded in publish URLs (default `publish`).
- `INGEST_RESERVATION_TTL_MS` — how long a reserved slot is held before GC (default `300000`).
- Per-node MediaMTX ports are self-reported at registration (`apiPort`/`rtspPort`/`metricsPort`).

---

## Nodes API

Nodes automatically register on startup and send periodic heartbeats to stay active.

### Register Node

Register a node or refresh an existing one. Upserts by `nodeId`, sets status to `active`, and updates `lastHeartbeatAt`. Emits the `node.registered` WebSocket event.

**Endpoint:** `POST /api/nodes/register`

**Request Body:**

```json
{
  "nodeId": "string (required)",
  "host": "string (required) — reachable address used to build the node's client URL",
  "apiPort": "number (optional) — MediaMTX API port on this node; defaults from config",
  "rtspPort": "number (optional) — MediaMTX RTSP port on this node; defaults from config",
  "metricsPort": "number (optional) — MediaMTX metrics port on this node; defaults from config",
  "type": "ingest|cluster (required)",
  "resources": { "cpu": 0-100, "memory": 0-100, "disk": 0-100 } (optional)
}
```

When `resources` are present the node's host CPU/memory/disk usage is forwarded to
the alert pipeline (`node.sampled`), which can raise `node_*_high` alerts.

**Response:** Node object

### Node Heartbeat

Refresh a node's heartbeat timestamp to keep it active. Unlike `register`, it does not emit `node.registered`. Accepts the same optional `resources` as register.

**Endpoint:** `POST /api/nodes/heartbeat`

**Request Body:**

```json
{
    "nodeId": "string (required)",
    "resources": { "cpu": 0-100, "memory": 0-100, "disk": 0-100 } (optional)
}
```

**Response:** Node object

### List Nodes

**Endpoint:** `GET /api/nodes`

**Response:** Array of Node objects

### List Active Nodes

Get nodes that have sent heartbeats within the configured tolerance window (default: 120 seconds).

**Endpoint:** `GET /api/nodes/active`

**Response:** Array of Node objects active in heartbeat window

---

## Alerts API

### Get All Alerts

Retrieve a list of all alerts.

**Endpoint:** `GET /api/alerts`

**Response:**

```json
[
  {
    "_id": "string",
    "source": "metrics|inspection|node",
    "subject": "string (stream name, or node id for node alerts)",
    "type": "stream_not_ready|frames_in_error|missing_video_track|missing_audio_track|unexpected_track_types|node_cpu_high|node_memory_high|node_disk_high",
    "severity": "info|warning|critical",
    "message": "string",
    "isResolved": boolean,
    "lastSeenAt": "2023-01-01T00:00:00.000Z",
    "resolvedAt": "2023-01-01T00:00:00.000Z|null",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

Alerts are reconciled automatically by source: a producer emits a data event, a
ruler evaluates rules into signals, and the alert is added / refreshed / updated
(`alert.updated`) / resolved (`alert.resolved`) as the condition changes. See
the WebSocket events and ADR-0010.

### Resolve Alert

Manually mark an alert as resolved (reconciliation also resolves alerts
automatically when their condition clears). Emits the `alert.resolved` event.

**Endpoint:** `PATCH /api/alerts/{id}/resolve`

**Parameters:**

- `id` (path): Alert ID (`_id`)

**Response:** Updated alert object, or `null` if not found

---

## Metrics API

Metrics are **MediaMTX operational data**, scraped from each node's Prometheus
`/metrics` endpoint every 10 seconds (per-stream quality is the stream-inspection
feature's job). Two record kinds are persisted: per-path and per-node.

### Get Stream (Path) Metrics

Recent per-path operational samples for a stream (one per node hosting it).

**Endpoint:** `GET /api/metrics/stream/{name}`

**Parameters:**

- `name` (path): Stream name
- `limit` (query, optional): Number of records to return (default: 50)

**Response:**

```json
[
  {
    "_id": "string",
    "streamName": "string",
    "context": "ingest|cluster",
    "node": "string",
    "state": "ready|notReady|...",
    "ready": boolean,
    "bytesReceived": number,
    "bytesSent": number,
    "readers": number,
    "framesInError": number,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Get Node Metrics

Recent per-node operational samples (how loaded each MediaMTX node is).

**Endpoint:** `GET /api/metrics/nodes`

**Parameters:**

- `limit` (query, optional): Number of records to return (default: 50)

**Response:**

```json
[
  {
    "_id": "string",
    "context": "ingest|cluster",
    "node": "string",
    "paths": number,
    "rtspConns": number,
    "rtspSessions": number,
    "rtmpConns": number,
    "srtConns": number,
    "webrtcSessions": number,
    "hlsMuxers": number,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
]
```

---

## Stream Inspection API

Inspections run automatically on a 30-second cycle.

### Get All Latest Inspections

Retrieve the latest inspection data for all streams.

**Endpoint:** `GET /api/stream-inspection`

**Response:**

```json
[
  {
    "_id": "string",
    "streamName": "string",
    "source": "ingest|cluster",
    "tracks": [
      {
        "type": "video|audio|data|subtitle",
        "codec": "string",
        "language": "string",
        "bitrate": number,
        "width": number,
        "height": number,
        "fps": number,
        "channels": number,
        "sampleRate": number
      }
    ],
    "metadata": {},
    "lastError": "string|null",
    "inspectedAt": "2023-01-01T00:00:00.000Z",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Get Latest Inspection for Stream

Retrieve the latest inspection data for a specific stream.

**Endpoint:** `GET /api/stream-inspection/{streamName}`

**Parameters:**

- `streamName` (path): Stream name

**Response:** Single inspection object (same format as above), or `null` if none exists

### Get Inspection History for Stream

Retrieve historical inspection data for a specific stream.

**Endpoint:** `GET /api/stream-inspection/{streamName}/history`

**Parameters:**

- `streamName` (path): Stream name
- `limit` (query, optional): Number of records to return (default: 10)

**Response:** Array of inspection objects

---

## WebSocket Events

Connect to the Socket.IO server at the base URL (path `/socket.io`) for real-time notifications. CORS is open (`origin: *`).

### Events

#### Stream Synced

Emitted when a stream is successfully synchronized to a cluster node (pipeline created).

**Event Name:** `stream.synced`

**Payload:** Full stream document

#### Stream Removed

Emitted when a stale stream's cluster pipeline is removed.

**Event Name:** `stream.removed`

**Payload:** Stream name (string)

#### Stream Assigned

Emitted when a stream is assigned to a node.

**Event Name:** `stream.assigned`

**Payload:**

```json
{
    "streamName": "string",
    "nodeId": "string",
    "assignedAt": "2023-01-01T00:00:00.000Z"
}
```

#### Stream Unassigned

Emitted when a stream is unassigned from a node.

**Event Name:** `stream.unassigned`

**Payload:** Stream name (string)

#### Alert Created

Emitted when reconciliation opens a new alert.

**Event Name:** `alert.created`

**Payload:** Full alert document

#### Alert Updated

Emitted when an open alert's severity or message changes (same condition, new detail).

**Event Name:** `alert.updated`

**Payload:** Full alert document

#### Alert Resolved

Emitted when an alert is resolved — automatically when its condition clears, or
manually via `PATCH /api/alerts/{id}/resolve`.

**Event Name:** `alert.resolved`

**Payload:** Full alert document

#### Stream Inspected

Emitted when a stream inspection completes (successfully or with error).

**Event Name:** `stream.inspected`

**Payload:**

```json
{
    "streamName": "string",
    "source": "ingest|cluster",
    "tracks": [
        {
            "type": "video|audio|subtitle|data",
            "codec": "string",
            "language": "string",
            "width": 1920,
            "height": 1080,
            "fps": 30,
            "channels": 2,
            "sampleRate": 48000
        }
    ],
    "metadata": { "bytesReceived": number, "bytesSent": number, "readers": number },
    "inspectedAt": "2023-01-01T00:00:00.000Z",
    "lastError": "string|null"
}
```

#### Node Registered

Emitted when a node registers (not on plain heartbeats).

**Event Name:** `node.registered`

**Payload:** Full node document

### Internal Events (not broadcast)

These are emitted on the in-process event bus only and are not forwarded to WebSocket clients:

- `sync.tick` — `{ ingest: number, cluster: number, failures: string[] }` inventory counts and failed workflow names per sync cycle
- `metrics.collected` — `{ nodes: NodeMetric[], paths: PathMetric[], collectedAt }` every metrics scrape; the alerts ruler consumes it to produce alerts
- `node.sampled` — `{ nodeId, context, cpu, memory, disk }` when a node reports host resources on register/heartbeat; the alerts ruler consumes it to produce `node_*_high` alerts

---

## Error Responses

All endpoints may return the following error formats:

### 400 Bad Request

```json
{
    "statusCode": 400,
    "message": ["Validation error messages"],
    "error": "Bad Request"
}
```

### 404 Not Found

```json
{
    "statusCode": 404,
    "message": "Resource not found",
    "error": "Not Found"
}
```

### 409 Conflict

```json
{
    "statusCode": 409,
    "message": "Illegal stream status transition",
    "error": "Conflict"
}
```

### 500 Internal Server Error

```json
{
    "statusCode": 500,
    "message": "Internal server error",
    "error": "Internal Server Error"
}
```

---

## Data Models

### Stream

```typescript
{
  _id: string;
  name: string;                 // unique
  source: string;
  status: 'created' | 'reserved' | 'discovered' | 'pending_assignment' | 'assigned' | 'synced' | 'sync_error' | 'stale';
  metadata: Record<string, any>;
  isEnabled: boolean;
  lastSeenAt?: Date | null;
  lastSyncedAt?: Date | null;
  lastError?: string | null;
  activeConsumers: number;
  isManual: boolean;
  assignedNode?: string | null;
  assignedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Alert

```typescript
{
  _id: string;
  source: 'metrics' | 'inspection' | 'node';
  subject: string; // stream name (metrics/inspection) or node id (node)
  type: 'stream_not_ready' | 'frames_in_error'
      | 'missing_video_track' | 'missing_audio_track' | 'unexpected_track_types'
      | 'node_cpu_high' | 'node_memory_high' | 'node_disk_high';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  isResolved: boolean;
  lastSeenAt: Date;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### PathMetric (per stream, per node)

```typescript
{
    _id: string;
    streamName: string;
    context: "ingest" | "cluster";
    node: string;
    state: string;
    ready: boolean;
    bytesReceived: number;
    bytesSent: number;
    readers: number;
    framesInError: number;
    createdAt: Date;
}
```

### NodeMetric (per node)

```typescript
{
    _id: string;
    context: "ingest" | "cluster";
    node: string;
    paths: number;
    rtspConns: number;
    rtspSessions: number;
    rtmpConns: number;
    srtConns: number;
    webrtcSessions: number;
    hlsMuxers: number;
    createdAt: Date;
}
```

### Node

```typescript
{
  _id: string;
  nodeId: string;                // unique
  host: string;                 // reachable address (required)
  type: 'ingest' | 'cluster';   // required
  status: 'active' | 'inactive' | 'draining';
  lastHeartbeatAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### StreamInspection

```typescript
{
  _id: string;
  streamName: string;
  source: 'ingest' | 'cluster';
  tracks: StreamTrack[];
  metadata: Record<string, unknown>;  // bytesReceived, bytesSent, readers
  lastError?: string;
  inspectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface StreamTrack {
  type: 'video' | 'audio' | 'data' | 'subtitle';
  codec?: string;
  language?: string;
  bitrate?: number;
  width?: number;       // video only
  height?: number;      // video only
  fps?: number;         // video only
  channels?: number;    // audio only
  sampleRate?: number;  // audio only
}
```

---

## Environment Variables

| Variable                       | Type   | Default                                 | Description                                                  |
| ------------------------------ | ------ | --------------------------------------- | ------------------------------------------------------------ |
| `MONGODB_URI`                  | string | `mongodb://localhost:27017/media-sync`  | MongoDB connection string                                    |
| `PORT`                         | number | `3000`                                  | HTTP server listening port                                   |
| `INGEST_MEDIAMTX_AUTH`         | string | `""`                                    | HTTP API credentials (`user:pass`) attached to ingest-node clients; nodes report only host, so auth is transport config |
| `CLUSTER_MEDIAMTX_AUTH`        | string | `""`                                    | HTTP API credentials (`user:pass`) attached to cluster-node clients |
| `NODE_HEALTH_TOLERANCE_SECONDS` | number | `120`                                   | Max seconds without heartbeat before node considered inactive |
| `INGEST_NODE_MEDIAMTX_PORT`     | number | `9000`                                  | MediaMTX API port used when querying registered ingest nodes  |
| `CLUSTER_NODE_MEDIAMTX_PORT`    | number | `9000`                                  | MediaMTX API port used when building per-node cluster clients  |
| `MEDIAMTX_METRICS_PORT`        | number | `9998`                                  | MediaMTX Prometheus `/metrics` port on every node            |
| `NODE_CPU_HIGH_PERCENT`        | number | `85`                                    | Node CPU% above this raises a `node_cpu_high` alert (warning)  |
| `NODE_MEMORY_HIGH_PERCENT`     | number | `90`                                    | Node memory% above this raises a `node_memory_high` alert (warning) |
| `NODE_DISK_HIGH_PERCENT`       | number | `85`                                    | Node disk% above this raises a `node_disk_high` alert (critical) |
| `INGEST_RTSP_URL`              | string | `rtsp://mediamtx-ingest:8554`           | RTSP base the cluster pulls relayed paths from (include creds for ingest read auth) |
| `PULLABLE_SOURCE_PROTOCOLS`    | string | `rtsp,rtsps,rtmp,rtmps,srt,http,https,udp` | CSV of protocols a cluster node pulls a stream source from directly instead of relaying from ingest (`MediaMtxPipelineService`) |
| `SYNC_POLL_INTERVAL`           | number | `10000`                                 | Periodic sync interval in ms (`SyncSchedulerService`)        |
| `METRICS_POLL_INTERVAL`        | number | `10000`                                 | Metrics scrape interval in ms (`MetricCollectionService`)    |
| `INSPECTION_INTERVAL`          | number | `30000`                                 | Stream inspection interval in ms (`StreamInspectionCollectionService`) |

**Note:** Scheduling is hard-coded in `@Cron` decorators (sync 10s, metrics 10s, inspection 30s); the `*_INTERVAL` getters exist but are not consumed. Operational alert rules (`stream_not_ready`, `frames_in_error`) are boolean checks with no configurable thresholds.

---

## Docker Deployment

Compose files live under `deploy/docker/`; pass them explicitly (or use the `stack:*` npm scripts):

```bash
docker-compose -f deploy/docker/compose.local.yml up --build
```

Services:

- App: `http://localhost:3000`
- MongoDB: `localhost:27017`
- MediaMTX Ingest: API `localhost:9000`, RTSP `8554`, HLS `8888`
- MediaMTX Cluster: API `localhost:9001`, RTSP `8555`, HLS `8889`

### Scaled Deployment

For multiple cluster instances:

```bash
docker-compose -f deploy/docker/compose.local.yml -f deploy/docker/compose.cluster.yml up --build
```

The MediaMTX cluster instances automatically register themselves with the sync service on startup and send periodic heartbeats. No manual node configuration required.

## OpenShift/Kubernetes Deployment

For production deployment on OpenShift/Kubernetes, use the manifests in `deploy/k8s/`. This approach provides:

- **Automatic restarts** when MediaMTX crashes
- **Health monitoring** via Kubernetes probes
- **Proper lifecycle management** by the orchestrator
- **Node registration** that stops when MediaMTX is unhealthy

### Deployment Steps:

1. Create the ConfigMap:

```bash
kubectl apply -f deploy/k8s/mediamtx-configmap.yaml
```

2. Deploy the MediaMTX cluster:

```bash
kubectl apply -f deploy/k8s/mediamtx-cluster-deployment.yaml
```

3. Scale as needed:

```bash
kubectl scale deployment mediamtx-cluster --replicas=3
```

### Health Monitoring

The deployment includes:

- **Readiness Probe**: Ensures MediaMTX API is responding before receiving traffic
- **Liveness Probe**: Restarts container if MediaMTX becomes unresponsive
- **Node Registration**: Automatically deregisters unhealthy nodes from stream assignment

## Testing

Run the included smoke test against a running stack:

```powershell
.\test.ps1          # against an already-running stack
.\test.ps1 -Up      # starts the compose stack first
```

This exercises all endpoints (including a create/assign/unassign/delete stream lifecycle with cleanup) and reports pass/fail counts. Unit tests run with `npm test` (Jest).
