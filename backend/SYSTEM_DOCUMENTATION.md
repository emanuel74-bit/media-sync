# System Documentation - MediaMTX Stream Sync

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Module Design](#module-design)
4. [Data Flow](#data-flow)
5. [Deployment Architecture](#deployment-architecture)
6. [Database Schema](#database-schema)
7. [Service Integration](#service-integration)
8. [Operational Patterns](#operational-patterns)
9. [Known Limitations](#known-limitations)
10. [Development Guide](#development-guide)

---

## System Overview

**MediaMTX Stream Sync** is a distributed streaming orchestration platform built on NestJS that manages the lifecycle of RTSP/RTMP/HLS media streams across multiple MediaMTX nodes.

### Core Purpose

The system solves the problem of coordinating media stream ingestion and distribution across a cluster:

1. **Dynamic Discovery**: Automatically discovers streams from one or more ingest sources
2. **Distribution**: Distributes discovered streams to available cluster nodes
3. **Load Balancing**: Uses consistent hashing to assign streams across cluster capacity
4. **Monitoring**: Continuously monitors stream health with metrics and alerts
5. **Analysis**: Inspects media tracks at regular intervals for quality and configuration issues
6. **Real-time Awareness**: Broadcasts all state changes to connected clients via WebSocket

### Technology Stack

- **Framework**: NestJS 9.x with TypeScript
- **Database**: MongoDB via Mongoose ODM
- **Real-time**: Socket.IO for WebSocket events
- **Scheduling**: @nestjs/schedule with Cron decorators
- **HTTP Clients**: Axios for outbound API calls
- **Media Integration**: Direct HTTP calls to MediaMTX REST APIs

### Deployment Models

- **Docker Compose**: Local development and single-machine deployments
- **Docker Compose Scale**: Multi-instance deployments with automatic pod registration
- **Kubernetes**: Production deployments with health probes and automatic restarts

---

## Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     NestJS Application                       │
│                    (Stream Sync Service)                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   Streams   │  │    Pods      │  │     Alerts      │    │
│  │  Controller │  │  Controller  │  │   Controller    │    │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘    │
│         │                │                    │              │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌────────▼────────┐   │
│  │  Streams    │  │    Pods      │  │    Alerts       │   │
│  │  Service    │  │   Service    │  │    Service      │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                │                    │              │
│  ┌──────▼──────────────────────────────────────────┐       │
│  │          Sync Service (Periodic)                │       │
│  │  - Discovers streams from ingest               │       │
│  │  - Assigns to cluster pods                     │       │
│  │  - Creates relay pipelines                     │       │
│  │  - Cleans up deleted streams                   │       │
│  └──────┬─────────────────────────────────────────┘       │
│         │                                                   │
│  ┌──────▼────────────────┐     ┌──────────────────────┐   │
│  │   Metrics Service     │     │  Inspection Service  │   │
│  │  - Samples stream     │     │  - Analyzes tracks   │   │
│  │    performance        │     │  - Detects changes   │   │
│  │  - Triggers failover  │     │  - Triggers alerts   │   │
│  └──────┬────────────────┘     └──────────┬───────────┘   │
│         │                              │                   │
│  ┌──────▼──────────────────────────────────────┐           │
│  │    MediaMTX Integration Service              │           │
│  │  - Queries stream lists                    │           │
│  │  - Collects statistics                     │           │
│  │  - Creates/deletes relay pipelines         │           │
│  └──────┬──────────────────────────────────────┘           │
│         │                                                   │
│  ┌──────▼──────────────────────────────────────┐           │
│  │    Gateway (WebSocket Server)                │           │
│  │  - Listens to application events            │           │
│  │  - Broadcasts to connected clients          │           │
│  └──────────────────────────────────────────────┘           │
│                                                               │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌────────┐  ┌─────────┐  ┌──────────┐
   │MongoDB │  │ MediaMTX│  │ MediaMTX │
   │ (Sync) │  │ (Ingest)│  │(Cluster) │
   └────────┘  └─────────┘  └──────────┘
```

### Module Layout

```
src/
├── app.module.ts                 # Root module, imports all others
├── main.ts                       # Entry point, bootstrap
├── config/                       # Configuration service
│   ├── config.module.ts
│   └── config.service.ts
├── pods/                         # Pod (MediaMTX instance) management
│   ├── pods.module.ts
│   ├── pods.controller.ts
│   ├── pods.service.ts
│   ├── pod.schema.ts             # Mongoose schema
│   └── dto/
│       └── register-pod.dto.ts
├── streams/                      # Stream discovery and assignment
│   ├── streams.module.ts
│   ├── streams.controller.ts
│   ├── streams.service.ts
│   ├── stream.schema.ts
│   └── dto/
│       ├── create-stream.dto.ts
│       ├── update-stream.dto.ts
│       └── assign-stream.dto.ts
├── alerts/                       # Alert management and generation
│   ├── alerts.module.ts
│   ├── alerts.controller.ts
│   ├── alerts.service.ts
│   └── alert.schema.ts
├── metrics/                      # Performance metrics collection
│   ├── metrics.module.ts
│   ├── metrics.controller.ts
│   ├── metrics.service.ts
│   └── metric.schema.ts
├── stream-inspection/            # Media track analysis
│   ├── stream-inspection.module.ts
│   ├── stream-inspection.controller.ts
│   ├── stream-inspection.service.ts
│   ├── stream-inspection.schema.ts
│   └── dto/
├── sync/                         # Background stream synchronization
│   ├── sync.module.ts
│   └── sync.service.ts
├── media-mtx/                    # MediaMTX API integration
│   ├── media-mtx.module.ts
│   └── media-mtx.service.ts
└── gateway/                      # WebSocket event broadcasting
    ├── gateway.module.ts
    └── gateway.gateway.ts
```

---

## Module Design

### Pods Module

**Responsibility**: Manage MediaMTX pod registration and lifecycle.

**Key Entities**:

- Pod: Represents a running MediaMTX instance (ingest or cluster type)

**Key Methods**:

- `registerPod(podId, host?, type?, tags?)`: Register a new pod or update existing
- `getActivePods()`: Get pods that have sent heartbeats within tolerance window
- `getActiveIngestPods()`: Get active pods of type "ingest"
- `getActiveClusterPods()`: Get active pods of type "cluster"

**Schema**:

```typescript
{
  podId: string (unique)
  host: string?        // IP/hostname for API calls
  type: 'ingest' | 'cluster'
  tags: string[]
  status: 'active' | 'inactive' | 'draining'
  lastHeartbeatAt: Date
  createdAt: Date
  updatedAt: Date
}
```

**Used By**:

- MediaMtxService: To discover active ingest pods for stream queries
- SyncService: To select available cluster pods for stream assignment
- MetricsService: To identify pod health during failover decisions

---

### Streams Module

**Responsibility**: Manage stream metadata and pod assignment.

**Key Entities**:

- Stream: Represents a media stream discovered from ingest or created manually

**Key Methods**:

- `create(dto)`: Create a new stream
- `findAll()`: List all streams
- `upsertFromDiscovery(info)`: Create or update stream from ingest discovery
- `assignToPod(name, podId)`: Assign stream to a pod
- `findUnassigned()`: Get streams not assigned to any pod
- `reassign(name, candidatePods)`: Move assignment to a different pod

**Schema**:

```typescript
{
    name: string(unique);
    source: string; // Origin or description
    status: string; // discovered|assigned|active|inactive|error
    metadata: object;
    enabled: boolean;
    lastSeenAt: Date
        ? lastSyncedAt
        : Date
          ? lastError
          : string
            ? activeConsumers
            : number;
    assignedPod: string // Pod ID if assigned
        ? assignedAt
        : Date
          ? createdAt
          : Date;
    updatedAt: Date;
}
```

**Used By**:

- SyncService: To track discovered streams
- MetricsService: To route metrics to assigned pod
- AlertsService: To generate stream-specific alerts
- StreamInspectionService: To analyze tracks

---

### Pods + Streams Integration Points

1. **Pod Registration Events**: When a new pod registers, no immediate action occurs
2. **Stream Assignment**: SyncService uses hash(`streamName`) % `activePodCount` to assign
3. **Pod Removal Impact**: Streams assigned to removed pods become unassigned but are not deleted
4. **Active Pod Queries**: Both modules independently query active pods; Sync uses results for assignment

---

### Alerts Module

**Responsibility**: Track system alerts and conditions.

**Key Entities**:

- Alert: Represents a system condition (performance or configuration issue)

**Key Methods**:

- `createAlert(streamName, type, severity, message)`: Create an alert with deduplication
- `checkMetricsAndAlert(streamName, metric)`: Analyze metric and create alerts
- `resolveAlert(alertId)`: Mark as resolved

**Schema**:

```typescript
{
    streamName: string;
    type: string; // bitrate_low|packet_loss|latency_high|etc.
    severity: "info" | "warning" | "critical";
    message: string;
    resolved: boolean;
    resolvedAt: Date ? createdAt : Date;
    updatedAt: Date;
}
```

**Deduplication**:

- If an unresolved alert of type X already exists for stream Y, no new alert is created
- Only first alert of a type emits an event

**Conditions Checked**:

- Bitrate < 500 kbps → warning
- Packet loss > 2% → critical
- Latency > 1000 ms → warning

---

### Metrics Module

**Responsibility**: Collect performance data and trigger failover.

**Key Methods**:

- `collectMetrics()`: Periodic job (every 10 seconds) that:
    1. Lists ingest streams and cluster streams
    2. Queries stats for each
    3. Saves metric samples
    4. Checks for alerts
    5. Triggers pod failover if degraded

**Failover Logic**:

- If cluster stream has `packetLoss > 2%` or `latency > 1000 ms`
- Pick a different active pod from candidates
- Call `streamsService.reassign(streamName, otherPodIds)`

**Schema**:

```typescript
{
    streamName: string;
    context: "ingest" | "cluster";
    bitrate: number; // bps
    fps: number;
    latency: number; // ms
    jitter: number; // ms
    packetLoss: number; // 0-100 percentage
    consumers: number;
    createdAt: Date;
    updatedAt: Date;
}
```

---

### Sync Module

**Responsibility**: Core stream orchestration - discovery, assignment, relay creation.

**Key Methods**:

- `periodicSync()`: Executed on a schedule (method marked with @Cron decorator)
    1. Query ingest streams
    2. Query cluster streams
    3. Upsert discovered ingest streams into DB
    4. For unassigned streams, assign to pod using hash
    5. For assigned streams, create relay pipeline on cluster if missing
    6. Mark ingest streams as stale if removed from ingest
    7. Delete relay pipelines for stale streams
    8. Emit sync events

**Events Emitted**:

- `stream.synced`: Full stream document after successful relay creation
- `stream.removed`: Stream name when ingest stream disappears
- `sync.tick`: Inventory counts {ingest, cluster}
- `stream.sync.failure`: {stream, error} on pipeline creation failure

---

### Stream Inspection Module

**Responsibility**: Analyze media tracks and detect content changes.

**Key Methods**:

- `inspectAllStreams()`: Periodic job (every 30 seconds) that:
    1. Lists ingest and cluster streams
    2. For each, calls getStreamDetails() to get track list
    3. Persists inspection record
    4. Checks for expected/unexpected tracks

**Track Analysis**:

- Extracts codec, resolution, fps, channels, sample rate from MediaMTX stream details
- Compares against stream.metadata.expectedVideo and expectedAudio
- Creates warning if expected video/audio missing
- Creates info alert for unexpected track types

**Schema**:

```typescript
{
  streamName: string
  source: 'ingest' | 'cluster'
  tracks: StreamTrack[]
  metadata: object
  lastError: string?
  inspectedAt: Date
  createdAt: Date
  updatedAt: Date
}

interface StreamTrack {
  type: 'video' | 'audio' | 'subtitle' | 'data'
  codec?: string
  language?: string
  bitrate?: number
  width?: number         // video only
  height?: number        // video only
  fps?: number           // video only
  channels?: number      // audio only
  sampleRate?: number    // audio only
}
```

---

### MediaMTX Integration Module

**Responsibility**: Encapsulate all HTTP calls to MediaMTX instances.

**Key Methods**:

- `listIngestStreams()`: GET /api/streams from active ingest pods, with fallback
- `listClusterStreams()`: GET /api/streams from all configured cluster nodes, deduplicate
- `getStreamStats(context, streamName)`: GET /api/streams/{name}/stats
- `createClusterPullPipeline(stream)`: POST /api/stream-pipelines with RTSP URI
- `deleteClusterPipeline(streamName)`: DELETE /api/stream-pipelines/{name}

**Pod Discovery**:

- Active ingest pods queried at: `http://{pod.host || pod.podId}:9000/api/streams`
- Fallback to configured `INGEST_MEDIAMTX_BASE_URL` if no pods active

**Cluster Selection**:

- Maintains list of axios clients, one per configured cluster URL
- `pickClusterClient()` uses round-robin selection
- All cluster queries broadcast to each node, results deduplicated

---

### Gateway (WebSocket)

**Responsibility**: Real-time event broadcasting to connected clients.

**Subscribed Events**:

- `stream.synced` → Forward to clients as `stream.synced`
- `stream.removed` → Forward as `stream.removed`
- `stream.assigned` → Forward as `stream.assigned`
- `stream.unassigned` → Forward as `stream.unassigned`
- `alert.created` → Forward as `alert.created`
- `alert.resolved` → Forward as `alert.resolved`
- `stream.inspected` → Forward as `stream.inspected`
- `pod.registered` → Forward as `pod.registered`
- `pod.removed` → Forward as `pod.removed`

**Not Forwarded**:

- `sync.tick` (internal diagnostics only)
- `stream.sync.failure` (internal error tracking)

---

## Data Flow

### Typical Stream Lifecycle

```
1. POD REGISTRATION
   ┌──────────────┐
   │  MediaMTX    │ (ingest or cluster type)
   │  Instance    │
   └──────┬───────┘
          │ POST /api/pods/register
          │ {podId, host, type}
          ▼
   ┌──────────────────┐
   │ Pods Service     │
   │ registerPod()    │
   └──────┬───────────┘
          │
          ▼
   ┌──────────────────┐
   │ MongoDB: Pod     │
   │ Collection       │
   │ (new/upsert)     │
   └──────────────────┘
          │
          ▼ emit: pod.registered
   ┌──────────────────┐
   │ Gateway          │
   │ → send to clients│
   └──────────────────┘

2. STREAM DISCOVERY (periodic, every 10 seconds)
   ┌──────────────────┐
   │ Sync Service     │
   │ periodicSync()   │
   └──────┬───────────┘
          │
          ├─→ listIngestStreams()  ─→ MediaMTX Ingest API
          │   (via active pods or fallback)
          │
          └─→ For each discovered stream:

              a) Upsert into DB
              ┌──────────────────┐
              │ Streams Service  │
              │ upsertFrom       │
              │ Discovery()      │
              └─────┬────────────┘
                    │
                    ▼
              ┌──────────────────┐
              │ MongoDB: Stream   │
              │ (new/update)      │
              └──────────────────┘

              b) Assign to pod (if unassigned)
              ┌──────────────────┐
              │ hash(streamName) │
              │ % activePodCount │
              └─────┬────────────┘
                    │
                    ▼
              ┌──────────────────┐──────────────┐
              │ Streams Service  │ Pods Service │
              │ assignToPod()    │ getActive()  │
              └─────┬────────────┴──────────────┘
                    │
                    ▼
              ┌──────────────────┐
              │ MongoDB: Stream   │
              │ {assignedPod,    │
              │  assignedAt}     │
              └──────────────────┘
                    │
                    ▼ emit: stream.assigned
              ┌──────────────────┐
              │ Gateway          │
              │ → send to clients│
              └──────────────────┘

              c) Create relay pipeline
              ┌──────────────────────┐
              │ MediaMTX Service     │
              │ createCluster        │
              │ PullPipeline()       │
              └────┬─────────────────┘
                   │
                   │ POST /api/stream-pipelines
                   │ {name, source: rtsp://..., protocol}
                   ▼
              ┌──────────────────┐
              │ MediaMTX Cluster │
              │ Creates pipeline │
              │ Starts pulling   │
              └──────────────────┘
                   │
                   ▼ emit: stream.synced
              ┌──────────────────┐
              │ Gateway          │
              │ → send to clients│
              └──────────────────┘

3. METRICS COLLECTION (periodic, every 10 seconds)
   ┌──────────────────┐
   │ Metrics Service  │
   │ collectMetrics() │
   └──────┬───────────┘
          │
          ├─→ listIngestStreams()
          ├─→ listClusterStreams()
          │
          └─→ For each stream/context pair:

              a) Get stats
              ┌──────────────────┐
              │ MediaMTX Service │
              │ getStreamStats() │
              └────┬─────────────┘
                   │
                   ▼
              ┌──────────────────┐
              │ MediaMTX API     │
              │ /api/streams/:id/│
              │ stats            │
              └────┬─────────────┘
                   │
                   ▼
              ┌──────────────────┐
              │ Parse: bitrate,  │
              │ fps, latency,    │
              │ jitter,          │
              │ packetLoss       │
              └────┬─────────────┘

              b) Persist metric
              ┌──────────────────┐
              │ MongoDB: Metric   │
              │ (new doc)         │
              └──────────────────┘

              c) Check alerts
              ┌──────────────────┐
              │ Alerts Service   │
              │ checkMetrics     │
              │ AndAlert()       │
              └────┬─────────────┘
                   │
                   ├─ bitrate < 500?
                   ├─ packetLoss > 2?
                   └─ latency > 1000?
                        │
                        ▼ (if condition met)
                   ┌──────────────────┐
                   │ createAlert()    │
                   │ (with dedup)     │
                   └────┬─────────────┘
                        │
                        ├─→ MongoDB: Alert (if new)
                        │
                        └─→ emit: alert.created
                        ┌──────────────────┐
                        │ Gateway          │
                        │ → send to clients│
                        └──────────────────┘

              d) Failover (if degraded cluster stream)
              ┌──────────────────────────┐
              │ if packetLoss > 2 ||     │
              │ latency > 1000           │
              └────┬─────────────────────┘
                   │
                   ▼
              ┌──────────────────┐
              │ Pick different   │
              │ active pod       │
              └────┬─────────────┘
                   │
                   ▼
              ┌──────────────────────┐
              │ Streams Service      │
              │ reassign(name,       │
              │ otherPodIds)         │
              └────┬─────────────────┘
                   │
                   ▼
              ┌──────────────────┐
              │ MongoDB: Stream   │
              │ update assignedPod│
              └──────────────────┘

4. STREAM INSPECTION (periodic, every 30 seconds)
   ┌───────────────────────┐
   │ Inspection Service    │
   │ inspectAllStreams()   │
   └──────┬────────────────┘
          │
          ├─→ listIngestStreams()
          ├─→ listClusterStreams()
          │
          └─→ For each stream:

              a) Get stream details
              ┌──────────────────┐
              │ MediaMTX API     │
              │ /api/streams/:id │
              └────┬─────────────┘
                   │
                   ▼
              ┌──────────────────┐
              │ Extract tracks:  │
              │ type, codec,     │
              │ resolution, etc. │
              └────┬─────────────┘

              b) Persist inspection
              ┌──────────────────┐
              │ MongoDB:         │
              │ StreamInspection │
              │ {tracks, ...,    │
              │  inspectedAt}    │
              └──────────────────┘
                   │
                   ▼ emit: stream.inspected
              ┌──────────────────┐
              │ Gateway          │
              │ → send to clients│
              └──────────────────┘

              c) Check track alerts
              ┌──────────────────────┐
              │ checkInspection      │
              │ Alerts()             │
              └────┬─────────────────┘
                   │
                   ├─ expectedVideo? warn if missing
                   ├─ expectedAudio? warn if missing
                   └─ unexpected tracks? create info alert
```

---

## Deployment Architecture

### Docker Compose (Single Machine)

```
┌──────────────────────────────────────────────────────┐
│ Docker Host / Machine                                │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌────────────────┐                                  │
│  │ sync-service   │  port 3000 (API & WebSocket)    │
│  │ (NestJS App)   │                                  │
│  └────────┬───────┘                                  │
│           │                                           │
│  ┌────────▼──────────────┬──────────────────┐       │
│  │                       │                  │        │
│  │  ┌──────────┐    ┌────▼─────┐    ┌─────▼────┐   │
│  │  │ MongoDB  │    │MediaMTX  │    │MediaMTX  │   │
│  │  │(Sync DB) │    │(Ingest)  │    │(Cluster) │   │
│  │  │ 27017    │    │ 9000     │    │ 9001     │   │
│  │  └──────────┘    └──────────┘    └──────────┘   │
│  │                                                   │
│  │  localhost:3000 → curl http://localhost:3000/... │
│  │  localhost:9000 → ingest source streams         │
│  │  localhost:9001 → cluster relay target          │
│  │                                                   │
│  └───────────────────────────────────────────────────┘
│
```

### Docker Compose Scale (Multiple Cluster Instances)

```
docker-compose -f docker-compose.scale.yml up --scale mediamtx-cluster=3

┌──────────────────────────────────────────────────────┐
│ Docker Host / Machine                                │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │ sync-service                                   │ │
│  │ port 3000                                      │ │
│  └────────────────┬───────────────────────────────┘ │
│                   │                                  │
│         ┌─────────┼──────────┬────────┐             │
│         │         │          │        │              │
│    ┌────▼──┐  ┌───▼──┐  ┌───▼──┐  ┌─▼──────┐      │
│    │MongoDB│  │Ingest│  │Clust1│  │Clust2  │      │
│    │ 27017 │  │ 9000 │  │ 9001 │  │ 9002   │      │
│    └───────┘  └──────┘  └──────┘  └────────┘      │
│                                 │                   │
│                            ┌────▼──┐               │
│                            │Clust3 │               │
│                            │ 9003  │               │
│                            └───────┘               │
│                                                    │
│ Cluster instances auto-register via:              │
│ POST /api/pods/register                           │
│ {podId: "mediamtx-cluster_1", type: "cluster"}   │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Kubernetes/OpenShift Production

```
┌──────────────────────────────────────────────────┐
│ Kubernetes Cluster                               │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ Namespace: streaming                    │   │
│  ├─────────────────────────────────────────┤   │
│  │                                         │   │
│  │ Deployment: sync-service               │   │
│  │  └─ Pod: sync-service-xxxxx            │   │
│  │     └─ Container: sync-service:latest  │   │
│  │         Port: 3000 (API, WebSocket)    │   │
│  │         Liveness: GET /api/docs        │   │
│  │         Readiness: GET /api/docs       │   │
│  │                                        │   │
│  │ Deployment: mediamtx-cluster           │   │
│  │  ├─ Pod: mediamtx-cluster-1 (replicas)│   │
│  │  │  └─ Container: mediamtx:latest      │   │
│  │  │     Port: 9000 (API)                │   │
│  │  │     Healthcheck: GET /api/version   │   │
│  │  │     Pod init: register with sync    │   │
│  │  │     Pod death: deregister from sync │   │
│  │  ├─ Pod: mediamtx-cluster-2            │   │
│  │  └─ Pod: mediamtx-cluster-3            │   │
│  │                                        │   │
│  │ StatefulSet: mongodb                   │   │
│  │  └─ Pod: mongodb-0                     │   │
│  │     Port: 27017                        │   │
│  │                                        │   │
│  │ ConfigMap: mediamtx-config             │   │
│  │  └─ mediamtx.conf (shared config)     │   │
│  │                                        │   │
│  │ Service: sync-service                  │   │
│  │  └─ Exposes port 3000 internally       │   │
│  │     (accessible at sync-service:3000)  │   │
│  │                                        │   │
│  │ Service: mediamtx-cluster              │   │
│  │  └─ Headless or ClusterIP              │   │
│  │     (for pod-to-service discovery)     │   │
│  │                                        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│ Scaling:                                        │
│  kubectl scale deployment mediamtx-cluster --   │
│    replicas=5                                   │
│                                                 │
│ New pods auto-register via pod-heartbeat.sh   │
│ script running in container on startup         │
│                                                 │
└──────────────────────────────────────────────────┘
```

---

## Database Schema

### MongoDB Collections

#### pods

```javascript
{
  "_id": ObjectId,
  "podId": String (unique),
  "host": String,
  "type": String ("ingest" | "cluster"),
  "tags": [String],
  "status": String ("active" | "inactive" | "draining"),
  "lastHeartbeatAt": Date,
  "createdAt": Date,
  "updatedAt": Date
}

// Index: podId (unique)
// Index: type, lastHeartbeatAt (for active pod queries)
```

#### streams

```javascript
{
  "_id": ObjectId,
  "name": String (unique),
  "source": String,
  "status": String ("discovered" | "assigned" | "active" | "inactive" | "error"),
  "metadata": Object,
  "enabled": Boolean,
  "lastSeenAt": Date,
  "lastSyncedAt": Date,
  "lastError": String,
  "activeConsumers": Number,
  "assignedPod": String,
  "assignedAt": Date,
  "createdAt": Date,
  "updatedAt": Date
}

// Index: name (unique)
// Index: assignedPod (for pod-scoped queries)
```

#### alerts

```javascript
{
  "_id": ObjectId,
  "streamName": String,
  "type": String,
  "severity": String ("info" | "warning" | "critical"),
  "message": String,
  "resolved": Boolean,
  "resolvedAt": Date,
  "createdAt": Date,
  "updatedAt": Date
}

// Index: streamName, type, resolved (for deduplication)
// Index: createdAt (for chronological queries)
```

#### metrics

```javascript
{
  "_id": ObjectId,
  "streamName": String,
  "context": String ("ingest" | "cluster"),
  "bitrate": Number,
  "fps": Number,
  "latency": Number,
  "jitter": Number,
  "packetLoss": Number,
  "consumers": Number,
  "createdAt": Date,
  "updatedAt": Date
}

// Index: streamName, createdAt (for time-series queries)
// TTL Index on createdAt (optional, for automatic cleanup)
```

#### streaminspections

```javascript
{
  "_id": ObjectId,
  "streamName": String,
  "source": String ("ingest" | "cluster"),
  "tracks": [
    {
      "type": String ("video" | "audio" | "subtitle" | "data"),
      "codec": String,
      "language": String,
      "bitrate": Number,
      "width": Number,        // video
      "height": Number,       // video
      "fps": Number,          // video
      "channels": Number,     // audio
      "sampleRate": Number    // audio
    }
  ],
  "metadata": Object,
  "lastError": String,
  "inspectedAt": Date,
  "createdAt": Date,
  "updatedAt": Date
}

// Index: streamName, inspectedAt (for history)
```

---

## Service Integration

### Call Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    External Callers (HTTP/WebSocket)         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Controllers:                                                 │
│  ├─ StreamsController ─→ StreamsService                      │
│  ├─ PodsController ───→ PodsService                          │
│  ├─ AlertsController ──→ AlertsService                       │
│  ├─ MetricsController ─→ MetricsService                      │
│  └─ InspectionController ──→ InspectionService              │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                   Scheduled/Event-Driven Services             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  SyncService (every 10 sec)                                  │
│  ├─→ MediaMtxService (ingest discovery)                      │
│  ├─→ MediaMtxService (cluster discovery)                     │
│  ├─→ StreamsService (upsert, assign, find unassigned)        │
│  ├─→ PodsService (get active cluster pods)                   │
│  └─→ MediaMtxService (create/delete pipelines)               │
│                                                               │
│  MetricsService (every 10 sec)                               │
│  ├─→ MediaMtxService (list ingest/cluster)                   │
│  ├─→ MediaMtxService (get stats)                             │
│  ├─→ AlertsService (check metrics)                           │
│  ├─→ StreamsService (reassign on failover)                   │
│  └─→ PodsService (get active pods)                           │
│                                                               │
│  InspectionService (every 30 sec)                            │
│  ├─→ MediaMtxService (list ingest/cluster)                   │
│  ├─→ MediaMtxService (get stream details)                    │
│  ├─→ AlertsService (create track alerts)                     │
│  └─→ StreamsService (read metadata expectations)             │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                      Integration Services                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  MediaMtxService                                              │
│  ├─→ ConfigService (read env vars)                           │
│  ├─→ PodsService (get active ingest pods)                    │
│  └─→ Axios HTTP clients                                      │
│                                                               │
│  PodsService                                                  │
│  └─→ Pod MongoDB model                                       │
│                                                               │
│  StreamsService                                               │
│  └─→ Stream MongoDB model                                    │
│                                                               │
│  AlertsService                                                │
│  └─→ Alert MongoDB model                                     │
│                                                               │
│  InspectionService                                            │
│  └─→ StreamInspection MongoDB model                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### ConfigService Dependencies

Config is provided to:

- **MediaMtxService**: For ingest/cluster base URLs
- **PodsService**: For pod health tolerance window
- **SyncService**: (unused getters exist)
- **MetricsService**: (unused getters exist)
- **InspectionService**: (unused getters exist)

**Note**: Many config getters are defined but not actually consumed. Environment variables should be explicitly documented as active or inactive.

---

## Operational Patterns

### Stream Lifecycle States

```
┌─────────────┐
│ discovered  │ (initial state after discovery)
└──────┬──────┘
       │ auto-assign to pod
       ▼
┌─────────────┐
│ assigned    │ (pod chosen, waiting for relay)
└──────┬──────┘
       │ relay pipeline created
       ▼
┌─────────────┐
│ active      │ (streaming actively)
└──────┬──────┘
       │ metrics collected, inspections run
       │
       │ ◄─── failover: reassign to different pod
       │      (if degraded)
       │
└──────┬──────┘
       │ stream removed from ingest
       ▼
┌─────────────┐
│ inactive    │ (no longer in ingest, marked stale)
└──────┬──────┘
       │ relay pipeline deleted
       │ stream optionally deleted
       ▼
┌─────────────┐
│  [removed]  │ (optionally deleted from DB)
└─────────────┘

Possible error state:
┌─────────────┐
│ error       │ (sync or relay failure)
└──────┬──────┘
       │ retry on next sync cycle
       │
       ▼
       (state may recover to assigned/active)
```

### Pod Health Pattern

```
POD ALIVE:
  └─→ Pod sends heartbeat
      └─→ POST /api/pods/heartbeat
          └─→ lastHeartbeatAt = now
              └─→ status = active

POD DEAD:
  └─→ Pod stops sending heartbeat
      └─→ After POD_HEALTH_TOLERANCE_SECONDS (default: 120s)
          └─→ PodsService filters it out of active queries
              └─→ SyncService stops selecting it for new assignments
                  └─→ MetricsService won't failover to it
                      └─→ Existing assigned streams remain but new ones pick other pods
```

### High-Availability Considerations

**Single Pod Failure**:

- Streams assigned to pod X remain in DB
- MetricsService detects degradation and fails them over to pod Y
- No manual action required

**Ingest Pod Failure**:

- After tolerance window, marked inactive
- Streams marked stale
- SyncService deletes relay pipelines on cluster

**Cluster Pod Failure**:

- After tolerance window, marked inactive
- Streams fail over to healthy pods
- If no healthy pods available, streams become unassigned

**Database Failure**:

- All pod registration lost
- Pods re-register on recovery
- All stream state recovered from DB

---

## Known Limitations

1. **Configuration Not Fully Respected**:
    - `SYNC_POLL_INTERVAL`, `METRICS_POLL_INTERVAL`, `INSPECTION_INTERVAL` are defined but hard-coded:
        - Sync: Every 10 seconds (via @Cron decorator)
        - Metrics: Every 10 seconds (via @Cron decorator)
        - Inspection: Every 30 seconds (via @Cron decorator)
    - Alert thresholds are hard-coded in AlertsService, not read from ConfigService
    - **Recommendation**: Refactor decorators to use DynamicModule pattern for configurable scheduling

2. **Route Shadowing Risk**:
    - `GET /api/streams/:name` before `GET /api/streams/assignment`
    - If `:name` parameter is "assignment", the named endpoint will match first
    - **Recommendation**: Reorder routes or use a prefix like `/api/streams/meta/assignment`

3. **MediaMtx Service Private Access**:
    - InspectionService uses bracket notation to access `mediaService['ingestClient']`
    - Should expose public methods instead
    - **Recommendation**: Add public `getStreamDetails(name, source)` method

4. **No Connection Pooling Limits**:
    - Axios clients created fresh for each cluster; no pooling
    - Can exhaust file descriptors in high-volume scenarios
    - **Recommendation**: Reuse axios instances, configure maxSockets

5. **Deduplication Only on Type**:
    - Alert deduplication: `{streamName, type, resolved: false}`
    - Multiple alerts of same type/stream/resolved status are deduplicated
    - But if you resolve an alert, the same type can fire again without an event
    - **Recommendation**: Document or add event on alert resolution

6. **No Graceful Shutdown**:
    - Pods that go offline still remain assigned to streams
    - No automatic cleanup of stale assignments
    - **Recommendation**: Add cleanup job or manual unassign endpoint

7. **Inspection Assumes MediaMTX StreamDetail Format**:
    - Track extraction hardcoded to expected MediaMTX API fields
    - No validation of track format
    - **Recommendation**: Add schema validation or graceful parsing

---

## Development Guide

### Local Development Setup

1. **Install Dependencies**:

    ```bash
    npm install
    ```

2. **Environment Configuration** (`.env`):

    ```
    MONGODB_URI=mongodb://localhost:27017/media-sync
    INGEST_MEDIAMTX_BASE_URL=http://localhost:9000
    CLUSTER_MEDIAMTX_BASE_URL=http://localhost:9001
    PORT=3000
    POD_HEALTH_TOLERANCE_SECONDS=120
    ```

3. **Run Services**:

    ```bash
    docker-compose up
    ```

4. **Start Dev Server**:

    ```bash
    npm run start:dev
    ```

5. **Access API**:
    - REST: `http://localhost:3000`
    - Swagger: `http://localhost:3000/api/docs`
    - WebSocket: `ws://localhost:3000`

### Adding a New Endpoint

1. **Create DTO** (if needed):

    ```typescript
    // src/module/dto/my-action.dto.ts
    export class MyActionDto {
        @IsString()
        field: string;
    }
    ```

2. **Add Controller Method**:

    ```typescript
    @Post('action')
    async myAction(@Body() dto: MyActionDto) {
      return this.service.doAction(dto);
    }
    ```

3. **Add Service Method**:

    ```typescript
    async doAction(dto: MyActionDto) {
      // Implement logic
      // Emit events if needed
    }
    ```

4. **Emit Events** (if publishing state):

    ```typescript
    this.eventEmitter.emit("my.event", { data });
    ```

5. **Update Gateway** (if real-time needed):
    ```typescript
    @OnEvent('my.event')
    handleMyEvent(payload: any) {
      this.server.emit('my.event', payload);
    }
    ```

### Testing

Run test scripts:

```bash
./test.ps1       # PowerShell
./test.sh        # Bash
./test-pods.ps1  # Pod registration test
```

### Debugging

- Logs available in terminal where `npm start` is running
- Enable debug logs: `DEBUG=* npm start`
- Use MongoDB compass to inspect collection documents
- Use WebSocket client (e.g., websocat) to subscribe to events

---

**Last Updated**: 2024
**Version**: 1.0
