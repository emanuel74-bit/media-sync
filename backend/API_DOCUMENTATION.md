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

- Discovers streams from the ingest MediaMTX node (with fallback to registered ingest pods)
- Automatically synchronizes them to a cluster of MediaMTX nodes via pull pipelines
- Distributes load across cluster nodes using a deterministic hash assignment policy
- Monitors stream health with periodic metrics and threshold-based alerts
- Inspects stream tracks and raises alerts on missing/unexpected content
- Provides WebSocket-based real-time notifications

### Key Concepts

- **Pod**: A MediaMTX instance (ingest or cluster type) that registers with the system
- **Stream**: A media stream discovered from ingest (or created manually), tracked in the database, and assigned to cluster pods
- **Assignment**: A stream's current pod assignment, used for load distribution and failover
- **Metric**: A timestamped performance sample (bitrate, FPS, latency, etc.) for a stream on a pod
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
    "status": "created|discovered|pending_assignment|assigned|synced|sync_error|stale",
    "metadata": {},
    "isEnabled": boolean,
    "lastSeenAt": "2023-01-01T00:00:00.000Z",
    "lastSyncedAt": "2023-01-01T00:00:00.000Z",
    "lastError": "string|null",
    "activeConsumers": number,
    "isManual": boolean,
    "assignedPod": "string|null",
    "assignedAt": "2023-01-01T00:00:00.000Z|null",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Create Stream

Create a new stream. The stream is immediately assigned to an active cluster pod and a pull pipeline is provisioned. If no cluster pods are active, the stream is stored with status `pending_assignment`.

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
        "status": "created|discovered|pending_assignment|assigned|synced|sync_error|stale",
        "assignedPod": "string|null",
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
  "status": "created|discovered|pending_assignment|assigned|synced|sync_error|stale (optional)"
}
```

**Response:** Updated stream object

### Delete Stream

Delete a stream.

**Endpoint:** `DELETE /api/streams/{name}`

**Parameters:**

- `name` (path): Stream name

**Response:** Empty

### Assign Stream to Pod

Assign a stream to a specific pod.

**Endpoint:** `PATCH /api/streams/{name}/assign`

**Parameters:**

- `name` (path): Stream name

**Request Body:**

```json
{
    "podId": "string (required)"
}
```

**Response:** Updated stream object with `assignedPod` and `assignedAt`

### Unassign Stream

Remove pod assignment from a stream.

**Endpoint:** `PATCH /api/streams/{name}/unassign`

**Parameters:**

- `name` (path): Stream name

**Response:** Updated stream object with `assignedPod: null`

---

## Pods API

Pods automatically register on startup and send periodic heartbeats to stay active.

### Register Pod

Register a pod or refresh an existing one. Upserts by `podId`, sets status to `active`, and updates `lastHeartbeatAt`. Emits the `pod.registered` WebSocket event.

**Endpoint:** `POST /api/pods/register`

**Request Body:**

```json
{
  "podId": "string (required)",
  "host": "string (optional)",
  "tags": ["string"] (optional),
  "type": "ingest|cluster (optional, default: cluster)"
}
```

**Response:** Pod object

### Pod Heartbeat

Refresh a pod's heartbeat timestamp to keep it active. Unlike `register`, it only takes the pod ID and does not emit an event.

**Endpoint:** `POST /api/pods/heartbeat`

**Request Body:**

```json
{
    "podId": "string (required)"
}
```

**Response:** Pod object

### List Pods

**Endpoint:** `GET /api/pods`

**Response:** Array of Pod objects

### List Active Pods

Get pods that have sent heartbeats within the configured tolerance window (default: 120 seconds).

**Endpoint:** `GET /api/pods/active`

**Response:** Array of Pod objects active in heartbeat window

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
    "streamName": "string",
    "type": "bitrate_low|packet_loss|latency_high|missing_video_track|missing_audio_track|unexpected_track_types",
    "severity": "info|warning|critical",
    "message": "string",
    "isResolved": boolean,
    "resolvedAt": "2023-01-01T00:00:00.000Z|null",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Resolve Alert

Mark an alert as resolved. Emits the `alert.resolved` WebSocket event.

**Endpoint:** `PATCH /api/alerts/{id}/resolve`

**Parameters:**

- `id` (path): Alert ID (`_id`)

**Response:** Updated alert object, or `null` if not found

---

## Metrics API

### Get Stream Metrics

Retrieve recent metrics for a specific stream.

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
    "bitrate": number,
    "fps": number,
    "latency": number,
    "jitter": number,
    "packetLoss": number,
    "consumers": number,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

**Note:** The MediaMTX v3 path API does not expose bitrate/fps/latency/jitter/packetLoss directly; absent fields are persisted as `0`.

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

Emitted when a stream is successfully synchronized to a cluster pod (pipeline created).

**Event Name:** `stream.synced`

**Payload:** Full stream document

#### Stream Removed

Emitted when a stale stream's cluster pipeline is removed.

**Event Name:** `stream.removed`

**Payload:** Stream name (string)

#### Stream Assigned

Emitted when a stream is assigned to a pod.

**Event Name:** `stream.assigned`

**Payload:**

```json
{
    "streamName": "string",
    "podId": "string",
    "assignedAt": "2023-01-01T00:00:00.000Z"
}
```

#### Stream Unassigned

Emitted when a stream is unassigned from a pod.

**Event Name:** `stream.unassigned`

**Payload:** Stream name (string)

#### Alert Created

Emitted when a new alert is created.

**Event Name:** `alert.created`

**Payload:** Full alert document

#### Alert Resolved

Emitted when an alert is marked as resolved.

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

#### Pod Registered

Emitted when a pod registers (not on plain heartbeats).

**Event Name:** `pod.registered`

**Payload:** Full pod document

### Internal Events (not broadcast)

These are emitted on the in-process event bus only and are not forwarded to WebSocket clients:

- `sync.tick` — `{ ingest: number, cluster: number, failures: string[] }` inventory counts and failed workflow names per sync cycle

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
  status: 'created' | 'discovered' | 'pending_assignment' | 'assigned' | 'synced' | 'sync_error' | 'stale';
  metadata: Record<string, any>;
  isEnabled: boolean;
  lastSeenAt?: Date | null;
  lastSyncedAt?: Date | null;
  lastError?: string | null;
  activeConsumers: number;
  isManual: boolean;
  assignedPod?: string | null;
  assignedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Alert

```typescript
{
  _id: string;
  streamName: string;
  type: 'bitrate_low' | 'packet_loss' | 'latency_high' | 'missing_video_track' | 'missing_audio_track' | 'unexpected_track_types';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  isResolved: boolean;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Metric

```typescript
{
    _id: string;
    streamName: string;
    context: "ingest" | "cluster";
    bitrate: number;
    fps: number;
    latency: number;
    jitter: number;
    packetLoss: number;
    consumers: number;
    createdAt: Date;
    updatedAt: Date;
}
```

### Pod

```typescript
{
  _id: string;
  podId: string;                // unique
  host?: string;
  type: 'ingest' | 'cluster';   // default: cluster
  tags: string[];
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
| `INGEST_MEDIAMTX_BASE_URL`     | string | `http://localhost:9000`                 | Primary ingest MediaMTX API URL                              |
| `CLUSTER_MEDIAMTX_BASE_URL`    | string | `http://localhost:9001`                 | Fallback cluster MediaMTX API URL                            |
| `CLUSTER_MEDIAMTX_BASE_URLS`   | string | falls back to CLUSTER_MEDIAMTX_BASE_URL | Comma-separated cluster URLs                                 |
| `POD_HEALTH_TOLERANCE_SECONDS` | number | `120`                                   | Max seconds without heartbeat before pod considered inactive |
| `INGEST_POD_MEDIAMTX_PORT`     | number | `9000`                                  | MediaMTX API port used when querying registered ingest pods  |
| `CLUSTER_POD_MEDIAMTX_PORT`    | number | `9000`                                  | MediaMTX API port used when building per-pod cluster clients  |
| `INGEST_RTSP_URL`              | string | `rtsp://mediamtx-ingest:8554`           | RTSP base the cluster pulls relayed paths from (include creds for ingest read auth) |
| `ALERT_BITRATE_LOW`            | number | `500`                                   | Bitrate-low alert threshold (warning)                        |
| `ALERT_PACKET_LOSS`            | number | `2`                                     | Packet-loss alert threshold % (critical; also triggers failover) |
| `ALERT_LATENCY_HIGH`           | number | `1000`                                  | High-latency alert threshold ms (warning; also triggers failover) |
| `SYNC_POLL_INTERVAL`           | number | `10000`                                 | (unused) intended sync interval in ms                        |
| `METRICS_POLL_INTERVAL`        | number | `5000`                                  | (unused) intended metrics interval in ms                     |
| `INSPECTION_INTERVAL`          | number | `30000`                                 | (unused) intended inspection interval in ms                  |
| `ALERT_BITRATE_DROP_PERCENT`   | number | `30`                                    | (unused) bitrate drop threshold %                            |
| `ALERT_STALE_SECONDS`          | number | `60`                                    | (unused) stale stream threshold seconds                      |

**Note:** Interval properties are currently unused; scheduling is hard-coded in `@Cron` decorators (sync 10s, metrics 10s, inspection 30s).

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

The MediaMTX cluster instances automatically register themselves with the sync service on startup and send periodic heartbeats. No manual pod configuration required.

## OpenShift/Kubernetes Deployment

For production deployment on OpenShift/Kubernetes, use the manifests in `deploy/k8s/`. This approach provides:

- **Automatic restarts** when MediaMTX crashes
- **Health monitoring** via Kubernetes probes
- **Proper lifecycle management** by the orchestrator
- **Pod registration** that stops when MediaMTX is unhealthy

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
- **Pod Registration**: Automatically deregisters unhealthy pods from stream assignment

## Testing

Run the included smoke test against a running stack:

```powershell
.\test.ps1          # against an already-running stack
.\test.ps1 -Up      # starts the compose stack first
```

This exercises all endpoints (including a create/assign/unassign/delete stream lifecycle with cleanup) and reports pass/fail counts. Unit tests run with `npm test` (Jest).
