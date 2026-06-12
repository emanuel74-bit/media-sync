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

**MediaMTX Stream Sync** is a distributed streaming orchestration platform built on NestJS that manages the lifecycle of media streams across multiple MediaMTX nodes.

### Core Purpose

The system solves the problem of coordinating media stream ingestion and distribution across a cluster:

1. **Dynamic Discovery**: Automatically discovers streams from the ingest MediaMTX node (with fallback to registered ingest pods)
2. **Distribution**: Creates pull pipelines for discovered streams on cluster nodes
3. **Load Balancing**: Uses a deterministic hash policy to assign streams across active cluster pods
4. **Monitoring**: Continuously collects metrics and raises threshold-based alerts
5. **Failover**: Reassigns degraded cluster streams to a different active pod
6. **Analysis**: Inspects media tracks at regular intervals for missing or unexpected content
7. **Real-time Awareness**: Broadcasts state changes to connected clients via WebSocket

### Technology Stack

- **Framework**: NestJS 9.x with TypeScript (strict layering, barrel exports via barrelsby)
- **Database**: MongoDB via Mongoose ODM (repository pattern; Mongo implementations in `infrastructure/`)
- **Real-time**: Socket.IO for WebSocket events
- **Scheduling**: @nestjs/schedule with `@Cron` decorators
- **Eventing**: @nestjs/event-emitter (in-process event bus, bridged to WebSocket by the gateway)
- **HTTP Clients**: Axios clients wrapping the MediaMTX v3 HTTP API

### Deployment Models

- **Docker Compose** (`docker-compose.local`): Local development and single-machine deployments
- **Docker Compose Scale** (`docker-compose.local` + `docker-compose.cluster`): Multi-instance cluster with automatic pod registration
- **Kubernetes**: Production deployments with health probes and automatic restarts

---

## Architecture

### High-Level System Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                      NestJS Application                        │
│                     (Stream Sync Service)                      │
├────────────────────────────────────────────────────────────────┤
│  HTTP Controllers                                              │
│  ┌─────────┐ ┌──────┐ ┌────────┐ ┌─────────┐ ┌─────────────┐  │
│  │ Streams │ │ Pods │ │ Alerts │ │ Metrics │ │ Inspection  │  │
│  └────┬────┘ └──┬───┘ └───┬────┘ └────┬────┘ └──────┬──────┘  │
│       ▼         ▼         ▼           ▼             ▼          │
│  Feature Services (query / mutation / lifecycle / orchestration│
│  per feature; StreamsFacadeService is the cross-module entry   │
│  point into the streams feature)                               │
│                                                                │
│  Scheduled Workers (@Cron)                                     │
│  ┌──────────────────┐ ┌────────────────────┐ ┌──────────────┐  │
│  │ SyncService      │ │ MetricCollection   │ │ Inspection   │  │
│  │ (every 10s)      │ │ Service (every 10s)│ │ Scheduler    │  │
│  │ runs SyncWorkflow│ │ collect → alert →  │ │ (every 30s)  │  │
│  │ pipeline         │ │ failover reactions │ │ inspect+save │  │
│  └────────┬─────────┘ └─────────┬──────────┘ └──────┬───────┘  │
│           ▼                     ▼                   ▼          │
│  Infrastructure Layer (src/infrastructure/)                    │
│  ┌──────────────────────────────┐ ┌─────────────────────────┐  │
│  │ media-mtx/                   │ │ database/               │  │
│  │  clients (axios, v3 API)     │ │  Mongo repositories     │  │
│  │  registry (client pool,      │ │  Mongoose schemas       │  │
│  │   round-robin)               │ │                         │  │
│  │  listing / pipeline / stats  │ │                         │  │
│  └──────────────┬───────────────┘ └────────────┬────────────┘  │
│                 │                              │               │
│  ┌──────────────▼──────────────────────────────▼────────────┐  │
│  │ EventsGateway: bridges EventEmitter2 events → Socket.IO  │  │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────┬───────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌────────┐  ┌─────────┐  ┌──────────┐
   │MongoDB │  │ MediaMTX│  │ MediaMTX │
   │        │  │ (Ingest)│  │(Cluster*)│
   └────────┘  └─────────┘  └──────────┘
```

### Module Layout

```
src/
├── app.module.ts                 # Root module
├── main.ts                       # Bootstrap (ValidationPipe, Swagger at /api/docs)
├── config/                       # ConfigService (env var access)
├── common/                       # Shared domain + cross-cutting services
│   ├── domain/
│   │   ├── consts/               # system-event-names.const.ts
│   │   ├── enums/                # AlertSeverity, AlertType, PodRole, PodStatus,
│   │   │                         #   StreamStatus, TrackType
│   │   └── types/                # event payloads, alert rule shapes, StreamTrack
│   ├── rules/                    # metric-threshold predicate utils
│   └── services/                 # RuleEvaluator, SequentialStreamTaskRunner
├── infrastructure/
│   ├── database/
│   │   ├── repositories/         # mongo-*.repository.ts (concrete implementations)
│   │   └── schemas/              # Mongoose schemas (pod, stream, alert, metric,
│   │                             #   stream-inspection)
│   └── media-mtx/
│       ├── clients/              # MediaMtxClient (axios wrapper, v3 paths API)
│       ├── registry/             # client factory (cached) + registry (round-robin)
│       ├── mappers/              # v3 → domain mappers + TRACK_FIELD_MAP table
│       ├── services/
│       │   ├── listing/          # ingest/cluster listing strategies + fan-out
│       │   ├── pipeline/         # MediaMtxPipelineService (create/delete paths)
│       │   └── stats/            # MediaMtxStreamStatsService
│       └── types/                # V3PathItem, StreamStats, etc.
├── pods/
│   ├── controllers/              # POST register/heartbeat, GET /, GET /active
│   ├── domain/types/
│   ├── dto/                      # RegisterPodDto, HeartbeatDto
│   ├── repositories/             # PodRepository (abstract contract)
│   └── services/                 # PodQueryService, PodRegistrationService
├── streams/
│   ├── controllers/
│   ├── domain/types/
│   ├── dto/                      # CreateStreamDto, UpdateStreamDto, AssignStreamDto
│   ├── repositories/             # StreamRepository (abstract contract)
│   └── services/
│       ├── assignment/           # StreamAssignmentPolicy (abstract) +
│       │                         #   HashStreamAssignmentPolicy + assignment service
│       ├── mutation/             # StreamCrudService, StreamStatusService
│       ├── orchestration/        # StreamLifecycleService, StreamProvisioningService
│       ├── query/                # StreamQueryService
│       └── streams-facade.service.ts  # public entry point for other modules
├── alerts/
│   ├── controllers/
│   ├── domain/types/
│   ├── repositories/             # AlertRepository (abstract contract)
│   └── services/                 # AlertEvaluationService, AlertLifecycleService
├── metrics/
│   ├── controllers/
│   ├── domain/                   # METRIC_ALERT_RULES const, metric types
│   ├── repositories/             # MetricRepository (abstract contract)
│   └── services/
│       ├── alerts/               # MetricAlertInvocationService
│       ├── collection/           # scheduler, workflow, per-stream collector
│       ├── failover/             # StreamFailoverService + stream gateway
│       ├── persistence/          # MetricPersistenceService
├── stream-inspection/
│   ├── controllers/
│   ├── domain/                   # STREAM_TRACK_ALERT_RULES const, types
│   ├── repositories/             # StreamInspectionRepository (abstract contract)
│   └── services/
│       ├── alerts/               # StreamTrackAlertService (@OnEvent stream.inspected)
│       ├── query/                # StreamInspectionQueryService
│       ├── recording/            # StreamInspectionRecorderService
│       └── scheduling/           # StreamInspectionSchedulerService (@Cron 30s)
├── sync/
│   ├── domain/                   # SyncContext/SyncWorkflow types, SYNC_WORKFLOWS token
│   └── services/
│       ├── scheduler/            # SyncService (@Cron 10s)
│       ├── query/                # SyncQueryAggregatorService (builds SyncContext)
│       ├── orchestration/        # SyncOrchestratorService (runs workflow list)
│       └── workflows/            # IngestStreamSynchronizer, StreamReconcile,
│                                 #   StreamStaleness (+ discovery/activation helpers)
└── gateway/                      # EventsGateway (Socket.IO broadcast)
```

Every folder has a barrelsby-generated `index.ts`; imports between features go through `@/<feature>` path aliases.

---

## Module Design

### Pods Module

**Responsibility**: Pod registration, heartbeats, and active-pod queries.

**Services**:

- `PodRegistrationService.registerPod(data)`: Upsert by `podId`, set status `active`, refresh `lastHeartbeatAt`, emit `pod.registered`
- `PodRegistrationService.heartbeat(podId)`: Refresh heartbeat only (no event)
- `PodQueryService.getActivePods(role?)`: Pods with a heartbeat within `POD_HEALTH_TOLERANCE_SECONDS`
- `PodQueryService.listActivePodRefs(role?)` / `listActivePodIds(role?)`: Lightweight projections used by sync/metrics/infrastructure

**Used By**:

- `IngestStreamListingStrategy`: To discover ingest pods when the primary ingest endpoint fails
- `SyncQueryAggregatorService`: To select active cluster pod IDs for assignment
- `StreamFailoverService` / `StreamLifecycleService`: To pick failover/assignment candidates

---

### Streams Module

**Responsibility**: Stream metadata, status transitions, pod assignment, and pipeline provisioning.

Internally split by service role; `StreamsFacadeService` is the single entry point other modules (sync, metrics) use.

**Services**:

- `StreamQueryService` (read): `findAll`, `findByName`, `findRequiredByName`, `findAssignedByName`, `getAssignmentInfo`
- `StreamCrudService` (mutation): `create`, `update`, `patch`, `remove`
- `StreamStatusService` (mutation): `upsertFromDiscovery`, `markStale`
- `StreamAssignmentService` (mutation): `assignToPod` (emits `stream.assigned`), `clearAssignment` (emits `stream.unassigned`), `ensureAssigned`, `reassign`
- `StreamLifecycleService` (orchestration): `create` → assign → provision; marks `pending_assignment` if no active cluster pods
- `StreamProvisioningService` (orchestration): creates the cluster pull pipeline, sets `synced`/`sync_error`, emits `stream.synced`
- `StreamsFacadeService`: thin facade re-exposing the above for cross-module callers

**Assignment Policy**:

- `StreamAssignmentPolicy` is an abstract class used as a DI token
- `HashStreamAssignmentPolicy` implements it: djb2-style hash of the stream name modulo the candidate pod count — deterministic as long as pod list order is stable

---

### Alerts Module

**Responsibility**: Alert persistence, deduplication, and rule-based evaluation.

**Services**:

- `AlertEvaluationService.evaluateAndCreate(streamName, input, context, rules)`: Generic — runs any list of `RuntimeAlertRule`s through the shared `RuleEvaluator` and persists hits
- `AlertLifecycleService.findOrCreateAlert(data)`: Deduplicates on unresolved `{streamName, type}`; emits `alert.created` only for new alerts
- `AlertLifecycleService.resolveAlert(id)`: Marks resolved, emits `alert.resolved`

**Rule sources** (data-driven, declared as consts):

- `METRIC_ALERT_RULES` (metrics domain): bitrate < `ALERT_BITRATE_LOW` (warning), packet loss > `ALERT_PACKET_LOSS` (critical), latency > `ALERT_LATENCY_HIGH` (warning) — thresholds read from `ConfigService`
- `STREAM_TRACK_ALERT_RULES` (inspection domain): missing video/audio track (warning, unless `metadata.hasExpectedVideo/Audio === false`), unexpected track types (info)

---

### Metrics Module

**Responsibility**: Collect performance samples, trigger alerts and failover.

**Flow** (`MetricCollectionService`, `@Cron` every 10 seconds):

1. `MediaMtxStreamListingService.listContextualStreams()` — all ingest + cluster streams with their context
2. For each stream sequentially (`SequentialStreamTaskRunner`), `MetricCollectionWorkflowService`:
   - `StreamMetricCollectorService` fetches stats and persists a `Metric`
   - `MetricAlertInvocationService` evaluates `METRIC_ALERT_RULES`
   - `StreamFailoverService` evaluates failover (cluster context only)

**Failover Logic** (`StreamFailoverService`):

- Degraded = packet loss or latency above the configured thresholds (`isMetricDegraded`)
- Only applies to streams that are currently assigned; requires ≥ 2 active cluster pods
- Reassigns via `StreamAssignmentService.reassign`, excluding the current pod

---

### Sync Module

**Responsibility**: Core orchestration — discovery, assignment, pipeline creation, staleness cleanup.

**Flow** (`SyncService`, `@Cron` every 10 seconds):

1. `SyncQueryAggregatorService.buildContext()` gathers in parallel: ingest stream list, cluster stream list, active cluster pod IDs, all DB streams → `SyncContext`
2. `SyncOrchestratorService.execute(context)`:
   - Skips entirely (with a warning) if no active cluster pods are registered
   - Runs each registered `SyncWorkflow` in order, isolating failures per workflow
   - Emits `sync.tick` with `{ ingest, cluster, failures }`

**Workflows** (injected via the `SYNC_WORKFLOWS` token):

- `IngestStreamSynchronizerService`: For each discovered ingest stream — upsert into DB (`StreamIngestDiscoveryService`), ensure pod assignment, ensure a cluster pipeline exists (`StreamIngestActivationService`)
- `StreamReconcileService`: For enabled manual streams (`isManual`) — ensure assignment and recreate missing cluster pipelines
- `StreamStalenessService`: For non-manual DB streams no longer present on ingest — mark `stale`, delete the cluster pipeline, emit `stream.removed`

---

### Stream Inspection Module

**Responsibility**: Analyze media tracks and raise content alerts.

**Flow** (`StreamInspectionSchedulerService`, `@Cron` every 30 seconds):

1. List all contextual streams (ingest + cluster)
2. For each, `StreamInspectionRecorderService.inspectAndRecord`:
   - Fetch `/v3/paths/get/{name}` details (errors recorded in `lastError`, inspection still persisted)
   - Track parsing happens inside infrastructure: `getStreamDetails` returns a domain `StreamDetails` (tracks mapped via the `TRACK_FIELD_MAP` table in `infrastructure/media-mtx/mappers/`); the recorder assembles the record inline, defaulting to empty tracks/metadata when inspection failed
   - Persist the inspection record and emit `stream.inspected`
3. `StreamTrackAlertService` listens on `stream.inspected` (`@OnEvent`) and, for error-free inspections, evaluates `STREAM_TRACK_ALERT_RULES` against the stream's metadata expectations

**Query API**: `StreamInspectionQueryService` provides latest-per-stream, latest-for-one, and history.

---

### MediaMTX Infrastructure (`src/infrastructure/media-mtx/`)

**Responsibility**: All HTTP communication with MediaMTX nodes, using the real **v3 API**.

**Layers**:

- `MediaMtxClient` (client): thin axios wrapper per endpoint URL (8s timeout) —
  `listPaths()` → `GET /v3/paths/list`, `getPathItem(name)` → `GET /v3/paths/get/{name}`,
  `addPath(name, source)` → `POST /v3/config/paths/add/{name}`, `removePath(name)` → `POST /v3/config/paths/remove/{name}`.
  Raw `V3PathItem`s are mapped to domain shapes (`mapV3PathToStream`) before leaving the client. No error handling — errors propagate.
- `MediaMtxClientFactory` (registry): creates and **caches** one client per base URL
- `MediaMtxClientRegistry` (registry): owns the ingest client and the cluster client pool; round-robin `pickClusterClient()`; builds ingest-pod clients at `http://{host||podId}:{INGEST_POD_MEDIAMTX_PORT}`
- `MediaMtxStreamListingService` (service): ingest listing (primary endpoint with fallback to registered ingest pods) and cluster listing (fan-out over all cluster nodes with per-node error isolation via `StreamCollectionService`)
- `MediaMtxPipelineService` (service): create cluster pull pipelines (source URI from the stream, falling back to `rtsp://{ingest-host}/{name}`; treats HTTP 409 as already-exists) and delete pipelines from all cluster nodes
- `MediaMtxStreamStatsService` (service): `getStreamStats(context, name)` and `getStreamDetails(name, source)` — public methods, selected by pod role

---

### Database Infrastructure (`src/infrastructure/database/`)

Each feature defines an **abstract repository contract** in its own `repositories/` folder (e.g. `StreamRepository`); the concrete Mongoose implementations (`mongo-stream.repository.ts`, etc.) and schemas live in `infrastructure/database/`. Services depend only on the abstractions.

---

### Gateway (WebSocket)

**Responsibility**: Bridge in-process events to Socket.IO clients (`EventsGateway`, CORS open).

**Broadcast events** (subscribed at module init):

`stream.synced`, `stream.removed`, `stream.assigned`, `stream.unassigned`, `alert.created`, `alert.resolved`, `stream.inspected`, `pod.registered`

**Not forwarded**: `sync.tick` (internal diagnostics only).

---

## Data Flow

### Typical Stream Lifecycle

```
1. POD REGISTRATION
   MediaMTX pod ──POST /api/pods/register──▶ PodRegistrationService
        └─▶ upsert Pod in MongoDB ──▶ emit pod.registered ──▶ Gateway ──▶ clients
   (subsequent POST /api/pods/heartbeat refreshes lastHeartbeatAt, no event)

2. STREAM SYNC (every 10 seconds)
   SyncService
     └─▶ SyncQueryAggregatorService.buildContext()
           ├─ listIngestStreams()   (v3 paths API, fallback to ingest pods)
           ├─ listClusterStreams()  (fan-out over cluster nodes)
           ├─ listActivePodIds(CLUSTER)
           └─ streams.findAll()
     └─▶ SyncOrchestratorService.execute(context)   [skip if no active pods]
           ├─ IngestStreamSynchronizer: per ingest stream
           │     ├─ upsertFromDiscovery (status, metadata, lastSeenAt)
           │     ├─ ensureAssigned → HashStreamAssignmentPolicy
           │     │     └─ emit stream.assigned
           │     └─ if not on cluster: provisionClusterPipeline
           │           ├─ POST /v3/config/paths/add/{name} {source}
           │           ├─ status=synced, lastSyncedAt  (or sync_error + lastError)
           │           └─ emit stream.synced
           ├─ StreamReconcile: same for enabled manual streams
           └─ StreamStaleness: DB streams missing from ingest
                 ├─ markStale
                 ├─ POST /v3/config/paths/remove/{name} (if on cluster)
                 └─ emit stream.removed
     └─▶ emit sync.tick {ingest, cluster, failures}

3. METRICS COLLECTION (every 10 seconds)
   MetricCollectionService
     └─▶ listContextualStreams() → per stream (sequential):
           ├─ getStreamStats → persist Metric (missing v3 fields default to 0)
           ├─ MetricAlertInvocationService: METRIC_ALERT_RULES with config
           │     thresholds → AlertEvaluationService → dedup →
           │     emit alert.created (new alerts only)
           └─ (cluster only) StreamFailoverService:
                 if degraded and ≥2 active pods → reassign → emit stream.assigned

4. STREAM INSPECTION (every 30 seconds)
   StreamInspectionSchedulerService
     └─▶ listContextualStreams() → per stream (sequential):
           ├─ GET /v3/paths/get/{name} (errors recorded as lastError)
           ├─ tracks parsed in infrastructure (TRACK_FIELD_MAP-driven mapper)
           ├─ persist StreamInspection record
           └─ emit stream.inspected
                 └─▶ StreamTrackAlertService (@OnEvent):
                       STREAM_TRACK_ALERT_RULES vs stream.metadata expectations
                       → alert.created (deduped)
```

---

## Deployment Architecture

### Docker Compose (Single Machine)

`docker-compose -f docker-compose.local up --build`

```
┌──────────────────────────────────────────────────────┐
│ Docker Host                                          │
│                                                      │
│  app (NestJS)           port 3000 (API & WebSocket)  │
│  mongodb                port 27017                   │
│  mediamtx-ingest        API 9000, RTSP 8554, HLS 8888│
│  mediamtx-cluster       API 9001, RTSP 8555, HLS 8889│
│                                                      │
│  MediaMTX pods register with the app on startup and  │
│  send heartbeats (script-pod-heartbeat.sh).          │
│  Compose healthcheck: GET /v3/paths/list             │
└──────────────────────────────────────────────────────┘
```

### Docker Compose Scale (Multiple Cluster Instances)

```
docker-compose -f docker-compose.local -f docker-compose.cluster up --build
```

The override sets `scale: 3` on `mediamtx-cluster`; instances self-register via `POST /api/pods/register` with `type: cluster`.

### Kubernetes/OpenShift Production

```
┌──────────────────────────────────────────────────┐
│ Kubernetes Cluster                               │
│                                                  │
│  Deployment: sync-service (port 3000)            │
│  Deployment: mediamtx-cluster (replicas, API 9000│
│    per pod, register/heartbeat sidecar scripts)  │
│  StatefulSet: mongodb (27017)                    │
│  ConfigMap: mediamtx-config                      │
│                                                  │
│  Scaling: kubectl scale deployment               │
│    mediamtx-cluster --replicas=5                 │
│  New pods auto-register via the heartbeat script │
│  running in the container on startup             │
└──────────────────────────────────────────────────┘
```

Manifests: `k8s-configmap-mediamtx.yaml`, `k8s-pod-template-mediamtx.yaml`, `k8s-deployment-mediamtx-cluster.yaml`, `k8s-deployment-mediamtx-ingest.yaml`.

---

## Database Schema

### MongoDB Collections

All schemas use `{ timestamps: true }` (automatic `createdAt`/`updatedAt`).

#### pods

```javascript
{
  "_id": ObjectId,
  "podId": String (unique),
  "host": String | null,
  "type": String ("ingest" | "cluster", default "cluster"),
  "tags": [String],
  "status": String ("active" | "inactive" | "draining", default "active"),
  "lastHeartbeatAt": Date
}
```

#### streams

```javascript
{
  "_id": ObjectId,
  "name": String (unique),
  "source": String,
  "status": String ("created" | "discovered" | "pending_assignment" |
                    "assigned" | "synced" | "sync_error" | "stale"),
  "metadata": Mixed (codec/resolution/fps/channels + bytesReceived/bytesSent/readers),
  "isEnabled": Boolean (default false),
  "lastSeenAt": Date | null,
  "lastSyncedAt": Date | null,
  "lastError": String | null,
  "activeConsumers": Number (default 0),
  "isManual": Boolean (default false),
  "assignedPod": String | null,
  "assignedAt": Date | null
}
```

#### alerts

```javascript
{
  "_id": ObjectId,
  "streamName": String,
  "type": String (AlertType enum),
  "severity": String ("info" | "warning" | "critical"),
  "message": String,
  "isResolved": Boolean (default false),
  "resolvedAt": Date | null
}
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
  "consumers": Number
}
```

#### streaminspections

```javascript
{
  "_id": ObjectId,
  "streamName": String,
  "source": String ("ingest" | "cluster"),
  "tracks": [Mixed],            // StreamTrack[]
  "metadata": Mixed,            // bytesReceived, bytesSent, readers
  "lastError": String | null,
  "inspectedAt": Date
}
```

---

## Service Integration

### Call Graph

```
External Callers (HTTP/WebSocket)
├─ StreamsController ──▶ StreamQuery / StreamCrud / StreamLifecycle /
│                        StreamAssignment services
├─ PodsController ─────▶ PodRegistrationService, PodQueryService
├─ AlertsController ───▶ AlertLifecycleService
├─ MetricsController ──▶ MetricPersistenceService
└─ StreamInspectionController ──▶ StreamInspectionQueryService

Scheduled Services
├─ SyncService (10s)
│    ├─▶ SyncQueryAggregatorService
│    │     ├─▶ MediaMtxStreamListingService
│    │     ├─▶ PodQueryService
│    │     └─▶ StreamsFacadeService
│    └─▶ SyncOrchestratorService ─▶ SyncWorkflow[] (SYNC_WORKFLOWS token)
│          └─▶ StreamsFacadeService, MediaMtxPipelineService
├─ MetricCollectionService (10s)
│    ├─▶ MediaMtxStreamListingService
│    └─▶ MetricCollectionWorkflowService
│          ├─▶ StreamMetricCollectorService ─▶ MediaMtxStreamStatsService,
│          │                                   MetricPersistenceService
│          ├─▶ MetricAlertInvocationService ─▶ AlertEvaluationService
│          └─▶ StreamFailoverService (cluster context only)
│                ─▶ PodQueryService, StreamAssignmentService
└─ StreamInspectionSchedulerService (30s)
     ├─▶ MediaMtxStreamListingService
     └─▶ StreamInspectionRecorderService ─▶ MediaMtxStreamStatsService,
           StreamInspectionRepository, emits stream.inspected
             └─▶ StreamTrackAlertService (@OnEvent) ─▶ StreamQueryService,
                   AlertEvaluationService

Event Bus (EventEmitter2)
└─ EventsGateway subscribes to broadcast events ─▶ Socket.IO clients
```

### ConfigService Consumers

- **MediaMtxClientRegistry**: `ingestBaseUrl`, `clusterBaseUrls`, `ingestPodMediaMtxPort`
- **MediaMtxPipelineService**: `ingestBaseUrl` (fallback RTSP source)
- **PodQueryService**: `podHeartbeatToleranceSeconds`
- **MetricAlertInvocationService / StreamFailoverService**: `alertBitrateLowThreshold`, `alertPacketLossThreshold`, `alertLatencyHighThreshold`

Getters for `syncPollInterval`, `metricsPollInterval`, `inspectionInterval`, `bitrateDropPercent`, and `staleSeconds` exist but are **not consumed** — scheduling is fixed in `@Cron` decorators.

---

## Operational Patterns

### Stream Lifecycle States

```
created ──┐                       (manual creation via POST /api/streams)
discovered ┴─▶ pending_assignment ─▶ assigned ─▶ synced
                  (no active pods)        │          │
                                          │          ├─ failover: reassigned to
                                          │          │   another pod (stays synced)
                                          ▼          ▼
                                     sync_error   stale (removed from ingest;
                                  (pipeline create   cluster pipeline deleted)
                                   failed; retried
                                   on next sync)
```

Statuses are the `StreamStatus` enum: `created`, `discovered`, `pending_assignment`, `assigned`, `synced`, `sync_error`, `stale`.

### Pod Health Pattern

```
POD ALIVE:
  POST /api/pods/heartbeat → lastHeartbeatAt = now, status = active

POD DEAD:
  heartbeats stop → after POD_HEALTH_TOLERANCE_SECONDS (default 120s)
    → filtered out of all active-pod queries
      → sync skips it for new assignments; ensureAssigned reassigns streams
        whose pod is no longer in the candidate list
      → failover won't select it
```

There is no `pod.removed` event; pods silently age out of the active window. Their DB records remain.

### High-Availability Considerations

**Single Cluster Pod Failure**:

- Streams assigned to the dead pod are reassigned on the next sync cycle (`ensureAssigned` detects the pod is no longer an active candidate)
- Metrics-driven failover also moves degraded streams to healthy pods

**Ingest Failure**:

- Primary ingest endpoint failure falls back to querying registered ingest pods
- Streams that disappear from ingest are marked `stale` and their cluster pipelines deleted

**No Active Cluster Pods**:

- The whole sync orchestration cycle is skipped (logged warning)
- Manually created streams are stored as `pending_assignment`

**Database Failure**:

- Pods re-register on recovery (register is an upsert)
- Stream state is recovered from MediaMTX discovery on the next sync cycles

---

## Known Limitations

1. **Scheduling intervals are hard-coded**:
    - Sync and metrics run every 10 seconds, inspection every 30 seconds, fixed in `@Cron` decorators
    - `SYNC_POLL_INTERVAL`, `METRICS_POLL_INTERVAL`, `INSPECTION_INTERVAL`, `ALERT_BITRATE_DROP_PERCENT`, `ALERT_STALE_SECONDS` are defined in `ConfigService` but never consumed

2. **MediaMTX v3 does not provide runtime quality stats**:
    - `getStreamStats` returns the v3 path item (`bytesReceived`, `bytesSent`, `readers`, tracks); `bitrate`, `fps`, `latency`, `jitter`, `packetLoss` are not present and are persisted as `0`
    - Consequently the bitrate/packet-loss/latency alert rules and metric-driven failover will effectively never trigger until real stat extraction is implemented

3. **Alert deduplication is type-scoped**:
    - Dedup key is unresolved `{streamName, type}`; after resolving an alert the same condition can fire a new alert (by design), and only the first occurrence emits `alert.created`

4. **No pod removal signal**:
    - Inactive pods age out of the active window but are never deleted, and no `pod.removed` event is emitted

5. **Sequential scheduled processing**:
    - Metrics and inspection process streams one at a time (`SequentialStreamTaskRunner`); with many streams a cycle can exceed its 10s/30s interval

6. **Discovery source fallback assumes RTSP**:
    - When a discovered stream has no usable source, the pipeline source defaults to `rtsp://{INGEST_MEDIAMTX_BASE_URL host}/{name}`

Previously documented limitations that are now fixed: route shadowing of `GET /api/streams/assignment` (route is declared before `:name`), private bracket access into the MediaMTX service (replaced by public `getStreamDetails`), unbounded axios client creation (clients are cached per URL by `MediaMtxClientFactory`), and hard-coded alert thresholds (now env-configurable).

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

3. **Run Supporting Services**:

    ```bash
    docker-compose -f docker-compose.local up
    ```

4. **Start Dev Server**:

    ```bash
    npm run start:dev       # watch mode
    npm run dev             # watch mode + barrel regeneration
    ```

5. **Access API**:
    - REST: `http://localhost:3000`
    - Swagger: `http://localhost:3000/api/docs`
    - WebSocket: `ws://localhost:3000` (Socket.IO)

### Adding a New Endpoint

Follow `CONVENTIONS.md` (file suffixes, folder structure, service roles). In short:

1. **Create a DTO** with `class-validator` decorators in the feature's `dto/` folder
2. **Add the controller method** in `controllers/`, delegating to a service
3. **Add the service method** in the appropriate role folder (`query/`, `mutation/`, `orchestration/`, …); data access goes through the feature's abstract repository
4. **Emit events** via `EventEmitter2` using a name from `SystemEventNames`
5. **Broadcast if needed** by adding the event to `EventsGateway.BROADCAST_EVENTS`
6. **Regenerate barrels** (`npm run barrels:generate`) — or use `npm run dev`, which does it on save
7. **Add tests** under `test/`, mirroring the `src/` path

### Testing

```bash
npm test               # Jest unit tests (test/ mirrors src/)
npm run verify         # typecheck + lint + build + test
./test.ps1             # API integration script (PowerShell, stack must run)
./test.sh              # API integration script (bash)
./test-pods.ps1        # Pod registration integration script
```

### Debugging

- Logs appear in the terminal running the dev server (NestJS Logger)
- Use MongoDB Compass to inspect collection documents
- Use a Socket.IO client to subscribe to broadcast events
- `sync.tick` payloads (internal event) include per-cycle inventory counts and failed workflow names

---

**Last Updated**: June 2026
