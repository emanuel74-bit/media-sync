# API Documentation - MediaMTX Stream Sync

This document provides comprehensive documentation for all API endpoints in the MediaMTX Stream Sync backend system.

## Base URL

```
http://localhost:3000
```

**WebSocket Server:**

```
ws://localhost:3000
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

- Discovers streams from one or more MediaMTX ingest pods
- Automatically synchronizes them to a cluster of MediaMTX nodes
- Distributes load across cluster nodes intelligently
- Monitors stream health with real-time metrics
- Inspects stream tracks and raises alerts on issues
- Provides WebSocket-based real-time notifications

### Key Concepts

- **Pod**: A MediaMTX instance (ingest or cluster type) that registers with the system
- **Stream**: A media stream discovered from ingest, tracked in the database, and assigned to cluster pods
- **Assignment**: A stream's current pod assignment, used for load distributing and failover
- **Metric**: A timestamped performance sample (bitrate, FPS, latency, etc.) for a stream on a pod
- **Alert**: A system-generated notification for conditions like bitrate drops or packet loss
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
      "status": "discovered|assigned|active|inactive|error",
    "status": "string",
    "metadata": {},
    "enabled": boolean,
    "lastSeenAt": "2023-01-01T00:00:00.000Z",
    "lastSyncedAt": "2023-01-01T00:00:00.000Z",
    "lastError": "string",
    "activeConsumers": number,
    "assignedPod": "string",
    "assignedAt": "2023-01-01T00:00:00.000Z",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Create Stream

Create a new stream.

**Endpoint:** `POST /api/streams`

**Request Body:**

```json
{
  "name": "string (required)",
  "source": "string (required)",
  "enabled": boolean (optional, default: false)
}
```

**Response:** Stream object (same as above)

### Get Stream by Name

Retrieve a specific stream by name.

**Endpoint:** `GET /api/streams/{name}`

**Parameters:**

- `name` (path): Stream name

**Response:** Stream object

### Update Stream

Update an existing stream.

**Endpoint:** `PATCH /api/streams/{name}`

**Parameters:**

- `name` (path): Stream name

**Request Body:**

```json
{
  "source": "string (optional)",
  "enabled": boolean (optional),
  "status": "string (optional)"
  "metadata": "object (optional)"
}
```

**Response:** Updated stream object

### Delete Stream

Delete a stream.

**Endpoint:** `DELETE /api/streams/{name}`

**Parameters:**

- `name` (path): Stream name

**Response:** Empty (204)

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

### Get Stream Assignments

Get assignment information for all streams.

**Endpoint:** `GET /api/streams/assignment`

**Response:**

````json
[
    {
        "name": "string",
        "assignedPod": "string",
        "assignedAt": "2023-01-01T00:00:00.000Z"
    ### Rebalance Streams

    Trigger automatic load-balancing of unassigned streams across available cluster pods.

    **Endpoint:** `POST /api/streams/rebalance`

    **Request Body:** (empty)

    **Response:**

    ```json
    {
      "message": "Rebalancing initiated",
      "totalStreams": 42,
      "assignedStreams": 35,
      "unassignedStreams": 7
    }
    ```

    **Notes:**
    - Uses consistent hashing to assign streams to available pods
    - Preserves existing assignments

    }
]
````

---

## Pods API

Register or re-heartbeat a MediaMTX pod. Pods automatically call this on startup and periodically.

### Register/Heartbeat Pod

Register a pod or update heartbeat timestamp. This enables dynamic discovery of available pod IDs.

**Endpoint:** `POST /api/pods/register`

**Request Body:**

```json
{
  "podId": "string (required)",
  "host": "string (optional)",
  "tags": ["string"] (optional)
}
```

**Response:** Pod object

### Pod Heartbeat

Send a heartbeat to keep a pod active (identical to register request, alternate endpoint).

Send periodic heartbeat to stay active.

**Endpoint:** `POST /api/pods/heartbeat`

**Request Body:** same as `register`

**Response:** Pod object

### List Pods

**Endpoint:** `GET /api/pods`

**Response:** Array of Pod objects

### List Active Pods

Get pods that have sent heartbeats within the configured tolerance window (default: 120 seconds).

**Endpoint:** `GET /api/pods/active`
Get active pods with `type: 'ingest'`.
Get active pods with `type: 'cluster'`.

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
    "type": "string",
    "severity": "info|warning|critical",
    "message": "string",
    "resolved": boolean,
    "resolvedAt": "2023-01-01T00:00:00.000Z",
    Manually create an alert (typically called by monitoring integrations).
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Resolve Alert

Mark an alert as resolved.

**Endpoint:** `PATCH /api/alerts/{id}/resolve`

**Parameters:**

- `id` (path): Alert ID

**Response:** Updated alert object

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
    Retrieve metrics across all streams or filter by stream name.
    Get the most recent metric sample for each active stream.
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

---

## Stream Inspection API

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
    "lastError": "string",
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

**Response:** Single inspection object (same format as above)

### Get Inspection History for Stream

Retrieve historical inspection data for a specific stream.

**Endpoint:** `GET /api/stream-inspection/{streamName}/history`

**Parameters:**

- `streamName` (path): Stream name
- `limit` (query, optional): Number of records to return (default: 10)

**Response:** Array of inspection objects
Trigger an immediate inspection of a stream (normally runs on 30-second cycle).

---

## WebSocket Events

Connect to the WebSocket server at `ws://localhost:3000` for real-time notifications.

Connect to the WebSocket server at the base URL for real-time notifications.

### Events

#### Stream Synced

Emitted when a stream is successfully synchronized to a cluster pod (pipeline created).

**Event Name:** `stream.synced`

**Payload:** Full stream document

#### Stream Removed

Emitted when a stream is deleted from the system.

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

Emitted when a stream inspection completes successfully or with error.

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
            "bitrate": 1800000,
            "width": 1920,
            "height": 1080,
            "fps": 30,
            "channels": 2,
            "sampleRate": 48000
        }
    ],
    "metadata": {},
    "inspectedAt": "2023-01-01T00:00:00.000Z",
    "lastError": "string|null"
}
```

#### Pod Registered

Emitted when a new pod registers or sends a heartbeat.

**Event Name:** `pod.registered`

**Payload:** Full pod document

#### Pod Removed

Emitted when a pod is deleted or becomes inactive.

**Event Name:** `pod.removed`

**Payload:** Pod ID (string)

---

#### Stream Synced

Emitted when a stream is successfully synced.

**Event:** `stream.synced`

**Payload:**

```json
{
    "_id": "string",
    "name": "string",
    "source": "string",
    "status": "string"
    // ... full stream object
}
```

#### Stream Removed

Emitted when a stream is removed.

**Event:** `stream.removed`

**Payload:** Stream name (string)

#### Alert Created

Emitted when a new alert is created.

**Event:** `alert.created`

**Payload:** Alert object (same as GET /api/alerts response)

#### Stream Inspected

Emitted when a stream inspection is completed.

**Event:** `stream.inspected`

**Payload:**

```json
{
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
    "inspectedAt": "ISO date string",
    "lastError": "string|null"
}
```

---

## OpenAPI Documentation

Interactive API documentation is available at:

```
GET /api/docs
```

This provides a Swagger UI interface for testing all endpoints.

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
  name: string;
  source: string;
  status: string;
  metadata: Record<string, any>;
  enabled: boolean;
  lastSeenAt?: Date;
  lastSyncedAt?: Date;
  lastError?: string;
  activeConsumers: number;
  assignedPod?: string;
  assignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Alert

```typescript
{
  _id: string;
  streamName: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  resolved: boolean;
  resolvedAt?: Date;
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
  podId: string;
  host?: string;
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
  metadata: Record<string, any>;
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
  width?: number;
  height?: number;
  fps?: number;
  channels?: number;
  sampleRate?: number;
  [key: string]: any;
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
| `SYNC_POLL_INTERVAL`           | number | `10000`                                 | (unused) intended sync interval in ms                        |
| `METRICS_POLL_INTERVAL`        | number | `5000`                                  | (unused) intended metrics interval in ms                     |
| `INSPECTION_INTERVAL`          | number | `30000`                                 | (unused) intended inspection interval in ms                  |
| `ALERT_BITRATE_DROP_PERCENT`   | number | `30`                                    | (unused) bitrate drop threshold %                            |
| `ALERT_STALE_SECONDS`          | number | `60`                                    | (unused) stale stream threshold seconds                      |

**Note:** Interval configurable properties are currently unused; scheduling is hard-coded in decorators.

The following environment variables can be configured:

- `MONGODB_URI`: MongoDB connection string
- `INGEST_MEDIAMTX_BASE_URL`: MediaMTX ingest server URL
- `CLUSTER_MEDIAMTX_BASE_URL`: MediaMTX cluster server URL
- `CLUSTER_MEDIAMTX_BASE_URLS`: Comma-separated list of cluster URLs
- `SYNC_POLL_INTERVAL`: Sync polling interval in ms
- `METRICS_POLL_INTERVAL`: Metrics polling interval in ms
- `INSPECTION_INTERVAL`: Stream inspection interval in ms (default: 30000)
- `POD_HEALTH_TOLERANCE_SECONDS`: Pod heartbeat timeout in seconds (default: 120)
- `ALERT_BITRATE_DROP_PERCENT`: Bitrate drop alert threshold
- `ALERT_STALE_SECONDS`: Stale stream alert threshold

---

## Docker Deployment

To run with Docker Compose:

```bash
docker-compose up --build
```

Services:

- App: `http://localhost:3000`
- MongoDB: `localhost:27017`
- MediaMTX Ingest: `localhost:9000`

### Scaled Deployment

For production with multiple cluster instances:

```bash
docker-compose -f docker-compose.scale.yml up --scale mediamtx-cluster=3
```

The MediaMTX cluster instances automatically register themselves via the pod registration endpoint.

- MediaMTX Cluster: `localhost:9001` (scales horizontally with automatic pod registration)

The MediaMTX cluster instances automatically register themselves with the sync service on startup and send periodic heartbeats. No manual pod configuration required. Scale the cluster by running multiple instances of the same service.

## OpenShift/Kubernetes Deployment

For production deployment on OpenShift/Kubernetes, use the provided `k8s-pod-template-mediamtx.yaml` and `k8s-configmap-mediamtx.yaml` files. This approach provides:

- **Automatic restarts** when MediaMTX crashes
- **Health monitoring** via Kubernetes probes
- **Proper lifecycle management** by the orchestrator
- **Pod registration** that stops when MediaMTX is unhealthy

### Deployment Steps:

1. Create the ConfigMap:

```bash
kubectl apply -f k8s-configmap-mediamtx.yaml
```

2. Deploy the MediaMTX cluster:

```bash
kubectl apply -f k8s-pod-template-mediamtx.yaml
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

Run the included test script:

```bash
# PowerShell
.\test.ps1

# Or bash (requires curl and jq)
./test.sh
```

This will test all endpoints and report results.
