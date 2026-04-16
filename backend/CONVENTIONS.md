# Code Conventions — MediaMTX Stream Sync Backend

This document defines the conventions, guardrails, and architectural rules for this NestJS codebase.
All contributors must follow these conventions to keep the codebase consistent and maintainable.

---

## Table of Contents

1. [Naming](#naming)
2. [File Structure](#file-structure)
3. [Function Size and Complexity](#function-size-and-complexity)
4. [Architecture and Layers](#architecture-and-layers)
5. [Type Safety](#type-safety)
6. [Dependency Management](#dependency-management)
7. [Error Handling](#error-handling)
8. [Logging](#logging)
9. [Streams Domain Rules](#streams-domain-rules)
10. [Code Structure](#code-structure)
11. [Class Design](#class-design)
12. [Reuse Rules](#reuse-rules)
13. [Polymorphism Guidelines](#polymorphism-guidelines)
14. [Function Design](#function-design)
15. [Anti-Patterns](#anti-patterns)
16. [Repository Pattern Rules](#repository-pattern-rules)
17. [Do's and Don'ts](#dos-and-donts)

---

## Naming

### Files

| Kind                       | Convention                 | Example                          |
| -------------------------- | -------------------------- | -------------------------------- |
| Service                    | `{feature}.service.ts`     | `streams.service.ts`             |
| Controller                 | `{feature}.controller.ts`  | `streams.controller.ts`          |
| Module                     | `{feature}.module.ts`      | `streams.module.ts`              |
| Schema (Mongoose)          | `{entity}.schema.ts`       | `stream.schema.ts`               |
| DTO                        | `{action}-{entity}.dto.ts` | `create-stream.dto.ts`           |
| Utility / helper           | `{purpose}.util.ts`        | `stream-hash.util.ts`            |
| Domain type / shape file   | `{module}.types.ts`        | `media-mtx.types.ts`             |
| Shared event payload types | `events.ts`                | `src/common/events.ts`           |
| Shared utilities dir       | `src/common/`              | `src/common/stream-hash.util.ts` |

- Use **kebab-case** for all file names.
- Avoid generic names like `helpers.ts` or `utils.ts` — name after the actual purpose.

### Classes

| Kind       | Convention                         | Example             |
| ---------- | ---------------------------------- | ------------------- |
| Service    | `PascalCase` + `Service` suffix    | `StreamsService`    |
| Controller | `PascalCase` + `Controller` suffix | `StreamsController` |
| Module     | `PascalCase` + `Module` suffix     | `StreamsModule`     |
| Schema     | `PascalCase`                       | `Stream`, `Alert`   |
| DTO        | `PascalCase` + `Dto` suffix        | `CreateStreamDto`   |
| Gateway    | `PascalCase` + `Gateway` suffix    | `GatewayGateway`    |

### Methods

- Use **camelCase** for all method names.
- Method names must describe an action: `findByName`, `assignToPod`, `evaluateFailover`.
- Avoid vague verbs: prefer `listActivePods` over `getPods`, `inspectStream` over `doInspect`.
- Scheduled methods: name them after their job, e.g. `collectMetrics`, `periodicSync`, `inspectAllStreams`.
- Private helpers: prefix with the responsibility, e.g. `parseVideoTrack`, `saveMetric`, `buildActiveFilter`.

### Variables

- Use **camelCase**.
- Avoid abbreviations; prefer `streamName` over `sname`, `podId` over `pid`.
- Loop variables must be descriptive: `for (const stream of streams)` not `for (const s of arr)`.
- Boolean variables: use `is`/`has`/`should` prefixes — `isPacketLossDegraded`, `hasVideo`.
- Sets of names: suffix with `Names` — `clusterNames`, `ingestNames`.

### Max Recommended Lengths

| Item          | Limit         |
| ------------- | ------------- |
| Method name   | 40 characters |
| Variable name | 35 characters |
| File name     | 40 characters |
| Function body | 30 lines      |
| Class body    | 300 lines     |

---

## File Structure

```
src/
├── common/                     # Shared, framework-agnostic domain contracts
│   ├── domain/                 # Cross-module enums and interfaces
│   │   ├── pod-role.enum.ts
│   │   ├── pod-status.enum.ts
│   │   ├── stream-status.enum.ts
│   │   ├── track-type.enum.ts
│   │   ├── stream-track.interface.ts
│   │   ├── alert-severity.enum.ts
│   │   ├── alert-type.enum.ts
│   │   ├── alert-metric-input.interface.ts
│   │   └── index.ts
│   ├── events/                 # Event name constants and typed payloads
│   │   ├── system-event-names.ts
│   │   ├── event-payloads.ts
│   │   └── index.ts
│   ├── rules/                  # Shared predicate functions and rule types
│   │   ├── metric-threshold-predicates.ts
│   │   ├── runtime-alert-rule.type.ts
│   │   └── index.ts
│   ├── services/               # Injectable shared services
│   │   ├── alert-rule-evaluator.service.ts
│   │   ├── sequential-stream-task-runner.service.ts
│   │   └── index.ts
│   ├── common-services.module.ts
│   └── index.ts
├── config/                     # Environment → typed config
│   ├── config.module.ts
│   └── config.service.ts
├── {feature}/                  # One folder per domain feature
│   ├── {entity}.schema.ts      # Mongoose schema + types
│   ├── {feature}.module.ts
│   ├── {feature}.controller.ts
│   ├── {feature}.service.ts
│   └── dto/
│       └── {action}-{entity}.dto.ts
├── gateway/                    # WebSocket broadcasting only
├── media-mtx/                  # External HTTP adapter
│   ├── media-mtx.service.ts
│   └── media-mtx.types.ts      # Typed shapes for MediaMTX API responses
└── app.module.ts
```

Rules:

- Each feature module is self-contained; all its files live in one folder.
- Cross-cutting utilities and enums go in `src/common/` — not inside a feature folder.
- External API response shapes live alongside their adapter in a `{adapter}.types.ts` file.
- DTOs live inside the feature's `dto/` subfolder.
- Do not place business logic in schemas, controllers, or modules.

---

## Function Size and Complexity

- **Target ≤ 25 lines** per function body (excluding blank lines and comments).
- **Hard limit: 50 lines** — if a function body exceeds this, extract helpers.
- **Cyclomatic complexity ≤ 5** per function. If you need more than 4 branches, split the function.
- Extract repeated logic immediately — do not copy code across services.

**When to extract a function:**

- The logic has a distinct name (e.g. "build the filter", "parse video track").
- The block appears more than once.
- The block changes for a different reason than the surrounding code.
- The block is hard to read without a comment explaining it.

**Good — focused helpers:**

```typescript
private async evaluateFailover(streamName: string, metric: Metric): Promise<void> {
    if (!this.isDegraded(metric)) return;
    // ... reassignment logic
}

private isDegraded(metric: Metric): boolean {
    return metric.packetLoss > this.config.alertPacketLossThreshold
        || metric.latency > this.config.alertLatencyHighThreshold;
}
```

**Bad — god method:**

```typescript
async collectMetrics() {
    // 80 lines mixing HTTP, DB writes, alert logic, and failover
}
```

---

## Architecture and Layers

### Layer Responsibilities

| Layer      | Responsibility                                                        | Examples                              |
| ---------- | --------------------------------------------------------------------- | ------------------------------------- |
| Controller | Route mapping, HTTP in/out, call one service method                   | `StreamsController`                   |
| Service    | Business logic, orchestration, event emission                         | `StreamsService`, `SyncService`       |
| Repository | Data access only (via Mongoose models)                                | Inline in services via `@InjectModel` |
| Adapter    | External integration — error handling, fallback logic, domain mapping | `MediaMtxService`                     |
| Client     | Thin HTTP adapter — owns connection, raw API calls only               | `MediaMtxClient`                      |
| Utility    | Pure, stateless helper functions                                      | `stream-hash.util.ts`                 |
| Gateway    | WebSocket broadcasting — listen to events, forward to clients         | `GatewayGateway`                      |

### Allowed Dependency Directions

```
Controller → Service
Service → Repository (via injected model)
Service → Adapter (MediaMtxService)
Service → EventEmitter2
Service → ConfigService
Adapter → Client (MediaMtxClient)
Adapter → PodsService (for pod discovery)
Adapter → ConfigService
Gateway → EventEmitter2 (via @OnEvent)
Client → (no dependencies except axios)
Utility ← (no dependencies, pure functions)
```

### Forbidden

- **Controller → DB model directly** — must go through a service.
- **Service → other module's DB model** — use that module's exported service.
- **Private field access via bracket notation** — `this.service['privateField']` is banned; expose a public method instead.
- **Circular imports** — if two services need each other, extract a shared service or reconsider the design.
- **Global state / module-level variables** — all state must live inside injectable classes.

### Infrastructure Client Design

When a service integrates with an external HTTP API, split it into two layers:

1. **Client** — a plain (non-injectable) class that owns its `AxiosInstance` and performs raw HTTP calls only. One instance per endpoint URL. Zero business logic; all errors propagate to the caller.
2. **Adapter / Service** — an `@Injectable` that creates and owns one or more client instances, applies error handling, fallback logic, and maps raw API types to domain types.

**Rules:**

- The client must **own** its connection: `private readonly http: AxiosInstance` created in the constructor from the provided `baseUrl`.
- A client must **never** be `@Injectable` — it is instantiated directly (`new MediaMtxClient(url)`) by its parent service.
- A client method must **never** catch errors — all error handling belongs in the adapter layer above it.
- A client method must declare an explicit typed return; never return raw `AxiosResponse` or `any`.
- A client method must return **domain-typed values**. If a mapping function exists to translate the raw API shape into a codebase-wide domain type, that mapping is part of the client method's contract and must happen inside it — not at every call site. Callers receive domain types directly; they never re-apply a formatter.

```typescript
// Good — client owns its connection; adapter owns the clients;
//         listPaths maps to domain type internally
export class MediaMtxClient {
    private readonly http: AxiosInstance;
    constructor(baseUrl: string) {
        this.http = axios.create({ baseURL: baseUrl, timeout: 8000 });
    }
    async listPaths(): Promise<MediaMtxStreamInfo[]> {
        const items: V3PathItem[] = ...;
        return items.map((item) => mapV3PathToStream(item)); // mapping is the client's job
    }
}

// Bad — caller forced to re-apply mapping at every call site
export class MediaMtxClient {
    async listPaths(): Promise<V3PathItem[]> { ... } // exposes raw API shape
}
// in service:
const paths = await client.listPaths();
return paths.map((path) => mapV3PathToStream(path)); // duplicated at every call site

// Bad — connection injected per call
class MediaMtxClient {
    async listPaths(http: AxiosInstance): Promise<V3PathItem[]> { ... }
}

// Bad — @Injectable on a plain client
@Injectable()
export class MediaMtxClient { ... }
```

---

## Type Safety

These rules enforce explicit, safe typing across the entire codebase.

### No `any`

- **`any` is forbidden** in all service, adapter, schema, and utility files.
- At external API boundaries (raw HTTP response data), cast through a typed interface immediately — never pass raw `any` further into the system.
- `unknown` is allowed only at external boundaries and must be narrowed before use.

```typescript
// Good — boundary cast
const res = await client.get("/v3/paths/list");
const items: V3PathItem[] = Array.isArray(res?.data?.items) ? res.data.items : [];

// Bad — leaking any into business logic
const items = res.data.items; // items: any
```

### Enums over String Unions

- **Never use raw string unions** for values that have a fixed domain set.
- Define enums in `src/common/types.ts` (cross-cutting) or inside the relevant schema file (domain-specific).
- Use the enum constant everywhere — in schemas, services, filters, and comparisons.

| Concept                                | Enum           | Location                     |
| -------------------------------------- | -------------- | ---------------------------- |
| Pod architecture role (ingest/cluster) | `PodRole`      | `src/common/types.ts`        |
| Pod lifecycle state                    | `PodStatus`    | `src/common/types.ts`        |
| Stream lifecycle state                 | `StreamStatus` | `src/common/types.ts`        |
| Media track type                       | `TrackType`    | `src/common/types.ts`        |
| Alert type identifiers                 | `AlertType`    | `src/alerts/alert.schema.ts` |

```typescript
// Good
stream.status = StreamStatus.SYNCED;
if (context === PodRole.CLUSTER) { ... }

// Bad
stream.status = "synced";
if (context === "cluster") { ... }
```

### Explicit Function Signatures

Every function must declare:

1. **Explicit parameter types** — no implicit `any` from untyped parameters.
2. **Explicit return type** — especially on all `async` methods and all public service methods.
3. **Named types for complex parameters** — if a function takes more than 3–4 related parameters, group them into a named interface.

```typescript
// Good
async inspectStream(streamInfo: MediaMtxStreamInfo, source: PodRole): Promise<void>

// Bad
async inspectStream(streamInfo, source) { ... }
```

### Parameter Objects (>3 Parameters)

When a function requires more than 3–4 parameters, create a **named domain interface** rather than expanding the argument list.

Rules for the interface:

- Name it after the **concept**, not the function — e.g. `AlertCreationData`, not `CreateAlertParams`.
- It must be **reusable** across call sites.
- Avoid generic names like `options`, `params`, `data`, `config`.

```typescript
// Good
export interface AlertCreationData {
    streamName: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
}
async createAlert(data: AlertCreationData): Promise<AlertDocument>

// Bad
async createAlert(streamName: string, type: string, severity: AlertSeverity, message: string)
```

### Shared Domain Types Location

| What                                           | Where                                              |
| ---------------------------------------------- | -------------------------------------------------- |
| Cross-domain enums and interfaces              | `src/common/domain/`                               |
| Event name constants                           | `src/common/events/system-event-names.ts`          |
| Event payload interfaces                       | `src/common/events/event-payloads.ts`              |
| Shared predicate functions and rule types      | `src/common/rules/`                                |
| Injectable shared services                     | `src/common/services/`                             |
| External API shapes (HTTP response interfaces) | `src/{adapter}/{adapter}.types.ts`                 |
| Domain concept interfaces for a single feature | Co-located in the feature's schema or service file |

### Schema Field Types

- Mongoose schema class fields must use **enum types**, not raw strings: `type!: PodRole` not `type!: "ingest" | "cluster"`.
- Open-ended metadata fields use `Record<string, unknown>` not `Record<string, any>`.
- Remove index signatures (`[key: string]: any`) from domain interfaces unless truly necessary.

---

## Dependency Management

- Declare all dependencies in the constructor (constructor injection only).
- If a dependency is unused — remove it from both the constructor and the module import.
- Do not use `forwardRef()` unless absolutely required; prefer restructuring.
- Keep modules focused: only import modules whose providers you actually use.
- Export from a module only what other modules need to inject.

```typescript
// Good — explicit, minimal
@Module({
    imports: [MongooseModule.forFeature([...]), ConfigModule],
    providers: [AlertsService],
    controllers: [AlertsController],
    exports: [AlertsService],
})

// Bad — importing everything "just in case"
@Module({
    imports: [ConfigModule, MediaMtxModule, PodsModule, AlertsModule, StreamsModule],
    // ...but only uses AlertsService
})
```

---

## Error Handling

### Rules

1. **Never swallow errors silently** — always log at minimum `this.logger.error(...)`.
2. **Use guard clauses** — return early on null/empty before processing.
3. **Fail fast at boundaries** — throw `NotFoundException` / `BadRequestException` in controllers and services when an entity is missing by ID.
4. **Use try/catch at scheduled job level** — periodic jobs must never crash the process.
5. **Preserve error messages** — when catching unknown errors, use `error instanceof Error ? error.message : String(error)`.
6. **Do not retry in code** — retry logic belongs in infrastructure (Kubernetes restart policies, Docker healthchecks).

### Standard Pattern

```typescript
// Scheduled job — catch at the top level
async collectMetrics(): Promise<void> {
    try {
        // ... work
    } catch (error) {
        this.logger.error("collectMetrics failed", error);
    }
}

// Service with guard clause
async findByName(name: string): Promise<StreamDocument> {
    const stream = await this.streamModel.findOne({ name }).exec();
    if (!stream) throw new NotFoundException(`Stream ${name} not found`);
    return stream;
}
```

### What Not To Do

```typescript
// Bad — silently returns undefined
async findByName(name: string) {
    return this.streamModel.findOne({ name });
}

// Bad — catch that does nothing
try { ... } catch (_) {}
```

---

## Logging

### What Must Be Logged

| Event                      | Level   | Example message                                    |
| -------------------------- | ------- | -------------------------------------------------- |
| Pod registered / heartbeat | `log`   | `Registered/heartbeat pod: mediamtx-cluster-1`     |
| Stream assigned to pod     | `log`   | `Assigned stream:my-stream to pod:cluster-1`       |
| Relay pipeline created     | `log`   | `Created cluster pull pipeline for my-stream`      |
| Stream removed / stale     | `warn`  | `Stream my-stream is stale, removing pipeline`     |
| Failover triggered         | `warn`  | `Reassigned my-stream from cluster-1 to cluster-2` |
| Scheduled job failure      | `error` | `Periodic sync failed`                             |
| External HTTP failure      | `warn`  | `Failed to list streams from ingest pod pod-1`     |
| Stream inspection result   | `debug` | `Inspected stream my-stream: 2 tracks`             |
| Alert created              | (event) | Handled by AlertsService; no extra log needed      |

### Format Rules

- Always use the class-scoped logger: `private readonly logger = new Logger(MyService.name);`
- Never use `console.log` — use the NestJS `Logger`.
- Include the **subject** (stream name, pod ID) in every message.
- Structured data goes in the second argument: `this.logger.error('msg', error)` or `this.logger.warn('msg', { podId, reason })`.
- Use `debug` for high-frequency, low-priority info (e.g. per-stream inspection success).

---

## Streams Domain Rules

### Stream Lifecycle

1. A stream is **discovered** (from ingest) or **created** (via API) → `StreamStatus.DISCOVERED` / `StreamStatus.CREATED`.
2. It is **assigned** to a cluster pod using consistent hashing → `StreamStatus.ASSIGNED`.
3. A relay pipeline is **provisioned** on the assigned cluster pod.
4. Stream becomes **synced** → `StreamStatus.SYNCED`.
5. Metrics and inspections run periodically.
6. If degraded (packet loss > threshold or latency > threshold), the stream is **reassigned** automatically.
7. If removed from ingest, the stream becomes **stale** → `StreamStatus.STALE` — and its relay pipeline is deleted.
8. A pipeline provisioning failure sets → `StreamStatus.SYNC_ERROR`.

Always use the `StreamStatus` enum constants. Never use raw strings like `"synced"` or `"stale"`.

### Assignment Rules

- Use `hashStreamToPod(streamName, podIds)` from `src/common/stream-hash.util.ts` for all assignment decisions.
- Never hardcode pod selection. Never use random selection (breaks idempotency).
- Only reassign if the current pod is absent from the active pod list or if the stream is degraded.
- Consistent hashing ensures the same stream always maps to the same pod when the pod list is unchanged.

### Pipeline Lifecycle

- A relay pipeline must be created on the cluster pod after assignment.
- A `409 Conflict` from MediaMTX means the pipeline already exists — treat this as success.
- Delete pipeline on cluster when a stream becomes stale.
- Never delete a manually created stream's pipeline without an explicit API call.

### Manual vs Discovered Streams

- `isManual: true` — created via `POST /api/streams`. Included in reconciliation.
- `isManual: false` — discovered from ingest. Removed when ingest no longer reports them.
- Manual streams are never automatically deleted; they must be removed via `DELETE /api/streams/:name`.

### Pod Roles

Use `PodRole.INGEST` and `PodRole.CLUSTER` everywhere a pod or stream context must be identified. The same enum is used for:

- Pod `type` field in the schema
- `context` parameter in `MetricsService`
- `source` parameter in `StreamInspectionService` and `MediaMtxService`

---

## Do's and Don'ts

### Do's

- ✅ Inject dependencies through the constructor.
- ✅ Use `ConfigService` for all thresholds and environment-driven values.
- ✅ Emit domain events (`stream.assigned`, `alert.created`, etc.) from services.
- ✅ Use `Promise.all` when fetching independent data in parallel.
- ✅ Use guard clauses to reduce nesting depth.
- ✅ Keep controllers thin — one service call per route handler.
- ✅ Write pure utility functions in `src/common/` for logic shared across services.
- ✅ Use `FilterQuery<T>` from Mongoose for typed query objects.
- ✅ Use enums from `src/common/types.ts` for all fixed-domain values.
- ✅ Define API response shapes as interfaces in `{adapter}.types.ts` files.
- ✅ Group >3 related parameters into a named domain interface.
- ✅ Add explicit return types to every public and async method.

### Don'ts

- ❌ Access private members of another class via `service['privateField']`.
- ❌ Duplicate logic (e.g. hash function) across services.
- ❌ Hardcode thresholds (bitrate, packet loss, latency) — use `ConfigService`.
- ❌ Let a scheduled job propagate unhandled exceptions.
- ❌ Put business logic in controllers, modules, or schemas.
- ❌ Create "god services" — if a service has more than ~6 injected dependencies, split it.
- ❌ Skip error logging when catching exceptions.
- ❌ Use `any` — anywhere. Cast from raw API responses to typed interfaces immediately.
- ❌ Use raw string literals for enum values — `"synced"`, `"ingest"`, `"cluster"` etc.
- ❌ Define wide parameter lists (>3 args) — use a named interface instead.
- ❌ Define generic wrapper interfaces — `options`, `params`, `data` are not meaningful names.

---

## Code Structure

### One Entity Per File

Each file should define one primary entity. Interfaces, constants, and classes that stand on their own must each live in a dedicated file — do not bundle them into the service or schema file that happens to use them first.

Exceptions are tightly coupled pairs where the secondary type is meaningless without the primary (e.g. a Mongoose sub-document interface alongside its parent schema class, or `AlertCreationData` alongside the `Alert` schema).

**Good:**

```
alert.schema.ts          → Alert class + AlertCreationData (inseparable from the schema)
metric-alert-rule.ts     → MetricAlertRule interface
metric-alert-rules.ts    → METRIC_ALERT_RULES constant array
media-mtx.types.ts       → all external API response shapes for one adapter
```

**Bad:**

```typescript
// alerts.service.ts — MetricAlertRule interface + METRIC_ALERT_RULES const + AlertsService class
// alert.schema.ts   — AlertSeverity, AlertType, AlertCreationData, Alert — too many entities
```

Rule of thumb: if a reader would look for item X and be surprised to find it in file Y, it belongs in its own file.

**File naming for extracted entities:**

| Entity kind         | Naming convention                 | Example                 |
| ------------------- | --------------------------------- | ----------------------- |
| Interface           | `{concept}.ts`                    | `metric-alert-rule.ts`  |
| Constant / rule set | `{concept}s.ts` (pluralised noun) | `metric-alert-rules.ts` |
| Free utility fn     | `{purpose}.util.ts`               | `stream-hash.util.ts`   |

### Module-Level Free Functions

Pure functions — those that do not access `this` and have no side effects — must **not** be private class methods. Extract them as module-level (file-scope) free functions. This makes their purity explicit and allows direct unit testing.

```typescript
// Good — module-level, testable, explicit
function buildDiscoveryMetadata(ingest: MediaMtxStreamInfo): StreamMetadata {
    return { ...ingest.video, ...ingest.audio, ...ingest.metadata };
}

// Bad — impure-looking even if it doesn't use `this`
private buildDiscoveryMetadata(ingest: MediaMtxStreamInfo): StreamMetadata { ... }
```

### Module-Level Constants

Declare constant arrays, rule sets, and configuration maps at module level (file scope), not inline inside methods. When the constant is non-trivial (e.g. a rule array with lambdas, a map with multiple entries), **extract it into its own file** — one constant per file, named after the concept.

```typescript
// Good — own file: metric-alert-rules.ts
export const METRIC_ALERT_RULES: MetricAlertRule[] = [
    { check: (metric, config) => metric.bitrate < config.alertBitrateLowThreshold, ... },
    ...
];

// Bad — inline inside the service file
async checkMetricsAndAlert(): Promise<void> {
    const rules = [ { check: ..., type: ... } ]; // rebuilt on every call
}

// Also bad — module-level in the service file when the constant is large enough to own a file
const METRIC_ALERT_RULES = [ ... ]; // should be in metric-alert-rules.ts
```

Use `UPPER_SNAKE_CASE` for all exported constants. Prefer typed arrays (`MetricAlertRule[]`) over `as const` for rule sets where entries are structurally typed.

---

## Class Design

- **Soft limit: ~120 lines** per injectable class body. If the class significantly exceeds this, examine whether it has multiple distinct responsibilities.
- **Hard limit: ~250 lines** — beyond this, refactor is mandatory.
- When reducing class size, extract **pure logic first** (to module-level free functions) before reaching for new service abstractions.
- Do not split a service purely for size if the resulting pieces would be tightly coupled or create circular dependencies. Prefer vertical extraction (fewer, richer modules) over horizontal layer proliferation.

---

## Reuse Rules

- **Do not inline the same logic in two places.** Any block of logic that appears in ≥2 functions must be named and extracted.
- Prefer module-level free functions over private helpers for logic that does not depend on class state.
- When identifying reuse candidates, ask: _do both call sites change for the same reason?_ If yes → shared function. If no → stay separate.

```typescript
// Good — shared, named
function buildDiscoveryMetadata(ingest: MediaMtxStreamInfo): StreamMetadata {
    return { ...ingest.video, ...ingest.audio, ...ingest.metadata };
}

// Bad — spread repeated inline in two places
metadata: { ...ingest.video, ...ingest.audio, ...ingest.metadata } // in SyncService
metadata: { ...ingest.video, ...ingest.audio, ...ingest.metadata } // in StreamsService
```

---

## Polymorphism Guidelines

### Declarative Rule Arrays over Sequential Conditionals

When a function applies the same operation to multiple variants of a concept (e.g. evaluate N alert conditions, handle N event types), prefer a **declarative rule/data array** over sequential `if`/`else if` blocks.

```typescript
// Good — one loop, N rules as data
const METRIC_ALERT_RULES: MetricAlertRule[] = [
    { check: (metric, config) => metric.bitrate < config.alertBitrateLowThreshold, type: AlertType.BITRATE_LOW, ... },
    { check: (metric, config) => metric.packetLoss > config.alertPacketLossThreshold, type: AlertType.PACKET_LOSS, ... },
    { check: (metric, config) => metric.latency > config.alertLatencyHighThreshold, type: AlertType.LATENCY_HIGH, ... },
];

for (const rule of METRIC_ALERT_RULES) {
    if (rule.check(metric, this.config)) {
        await this.createAlert({ type: rule.type, severity: rule.severity, message: rule.message(metric) });
    }
}

// Bad — sequential ifs, each duplicating the same createAlert call
if (metric.bitrate < threshold) { await this.createAlert(...); }
if (metric.packetLoss > threshold) { await this.createAlert(...); }
if (metric.latency > threshold) { await this.createAlert(...); }
```

### Event Registration in `onModuleInit()` over Repeated `@OnEvent` Handlers

When a Gateway (or similar class) handles multiple events using **identical logic** (e.g. receive payload → broadcast), prefer a registration loop in `onModuleInit()` over N identical decorated handler methods.

```typescript
// Good — one registration loop
private static readonly BROADCAST_EVENTS: readonly string[] = [
    "stream.synced", "stream.removed", "alert.created", /* ... */
];

onModuleInit(): void {
    for (const event of GatewayGateway.BROADCAST_EVENTS) {
        this.events.on(event, (payload: unknown) => this.broadcast(event, payload));
    }
}

// Bad — 9 methods with identical body differing only by event name
@OnEvent("stream.synced")
handleStreamSynced(payload: StreamSyncedPayload): void { this.broadcast("stream.synced", payload); }
// ... repeated 8 more times
```

---

## Function Design

- Extract any non-trivial spread/transform/map operation into a named function if:
    - It appears more than once, OR
    - It is the only logic in a line but its intent is not self-evident from the variable names alone.
- Prefer returning a named result type over returning raw object literals from multi-field builds.
- Module-level functions must be declared with `function` keyword (not `const fn = () =>`), so they are hoisted and consistent in stack traces.

### Single-Responsibility Splits for Fallback and Conditional Paths

When a method contains two or more **distinct strategies** — whether triggered by a fallback on error, a conditional flag, or a runtime state — split each strategy into its own private method. The public method becomes a thin orchestrator that decides which strategy to invoke.

Rules:

1. Each private method must do **one thing** and be named after what it does, not when it runs (`listIngestStreamsFromEndpoint`, not `tryPrimary`).
2. The public orchestrator must contain **no implementation detail** — only the call sequence, the fallback condition, and logging.
3. Name the private methods symmetrically so the distinction between strategies is clear at a glance.

```typescript
// Good — orchestrator delegates cleanly; each path is named and isolated
async listIngestStreams(): Promise<MediaMtxStreamInfo[]> {
    try {
        return await this.listIngestStreamsFromEndpoint();
    } catch (error) {
        this.logger.warn("Primary endpoint failed, falling back to pod discovery", error);
    }
    return this.listIngestStreamsFromPods();
}

private async listIngestStreamsFromEndpoint(): Promise<MediaMtxStreamInfo[]> { ... }
private async listIngestStreamsFromPods(): Promise<MediaMtxStreamInfo[]> { ... }

// Bad — two strategies tangled in one method body
async listIngestStreams(): Promise<MediaMtxStreamInfo[]> {
    try {
        const paths = await this.ingestClient.listPaths();
        return paths.map(...); // strategy 1 inline
    } catch {
        // strategy 2 inline — 30 more lines here
    }
}
```

### Lambda Parameter Names

Lambda (arrow function) parameters must use the same full, descriptive names as their types suggest — never single-letter abbreviations or vague shortcuts.

```typescript
// Good — readable at a glance
check: (metric, config) => metric.bitrate < config.alertBitrateLowThreshold;
message: (metric) => `Latency high: ${metric.latency}ms`;

// Bad — opaque abbreviations
check: (m, cfg) => m.bitrate < cfg.alertBitrateLowThreshold;
message: (m) => `Latency high: ${m.latency}ms`;
```

This applies everywhere lambdas appear: rule arrays, `.map()`, `.filter()`, `.forEach()`, event handlers, and promise chains.

---

## Error Handling

### Self-Contained Error Handling

Every function should manage its own errors. When calling a function, **do not wrap that call in a try/catch** unless the caller has context-specific recovery logic — updating related DB state, emitting a domain failure event, or returning a typed fallback.

If the catch block only logs the error, the try/catch belongs **inside the called function**, not the caller. Callers then invoke the function without wrapping it — it sorts itself out.

```typescript
// Good — processStreamMetric handles its own errors; collectMetrics needs no try/catch
private async processStreamMetric(streamName: string, context: PodRole): Promise<void> {
    try {
        const stats = await this.mediaMtx.getStreamStats(context, streamName);
        const metric = await this.saveMetric(streamName, context, stats);
        await this.alertsService.checkMetricsAndAlert(streamName, metric);
    } catch (error) {
        this.logger.error(`Failed to process metric for stream ${streamName}`, error);
    }
}

async collectMetrics(): Promise<void> {
    for (const entry of entries) {
        await this.processStreamMetric(entry.name, entry.context); // no try/catch needed
    }
}

// Bad — caller wraps with a generic log that belongs inside the called function
async collectMetrics(): Promise<void> {
    try {
        for (const entry of entries) {
            await this.processStreamMetric(entry.name, entry.context);
        }
    } catch (error) {
        this.logger.error("Failed metrics collect", error); // too generic — move into processStreamMetric
    }
}
```

**Exception — caller-specific recovery:** When the catch block updates related state, emits domain events, or returns a typed failure result, keep the try/catch in the caller — that logic is context-specific and cannot be generalised into the called function (see `syncSingleIngestStream`, `provisionClusterPipeline`).

**Exception — top-level cron safety net:** A cron method may add a minimal outer catch only as a last-resort guard against unexpected infrastructure failures (e.g. DB connection down). That catch must only log — zero business logic.

### Logical Unit Extraction

Any section of a function body that forms a self-contained logical unit must be extracted to a named private method. This applies to loop iteration bodies, branch arms, and sequential statement groups that share a single clear purpose.

"Self-contained" means: the block's purpose can be expressed as a single verb-object name, and its entire interface fits as typed parameters and a return value.

```typescript
// Good — each iteration step is a named unit
private async removeStaleStreams(...) {
    for (const stream of staleStreams) {
        await this.markStreamAsStale(stream, clusterNames);
    }
}

private async markStreamAsStale(stream: StreamDocument, clusterNames: Set<string>): Promise<void> {
    stream.status = StreamStatus.STALE;
    stream.lastSeenAt = new Date();
    await stream.save();
    if (clusterNames.has(stream.name)) { ... }
}

// Bad — loop body inlined; reader must parse intent line-by-line
private async removeStaleStreams(...) {
    for (const stream of staleStreams) {
        stream.status = StreamStatus.STALE;
        stream.lastSeenAt = new Date();
        await stream.save();
        if (clusterNames.has(stream.name)) { ... }
    }
}
```

---

## Service Cohesion and Interface Segregation

An injectable service must have a single, clearly nameable responsibility. When a service accumulates methods that fall into multiple distinct named roles — such as "query streams", "manage pipelines", and "provide clients" — it must be split into one service per role.

Callers inject **only the service(s) they actually use** — never an aggregate that exposes more than they need. This is the Interface Segregation Principle applied to NestJS providers.

**When to split:**

- You can express the class's purpose only with an `and` ("this service lists streams **and** manages pipelines").
- Callers need only a strict subset of the public API, meaning they are forced to depend on methods they never call.
- Line count approaches or exceeds the hard limit, driven by truly distinct responsibilities (not just size).

**How to split:**

1. Name each new service after what it **does**, not what it **touches** (`MediaMtxStreamQueryService`, not `MediaMtxReadService`).
2. Extract shared infrastructure (connection pools, round-robin logic) into a dedicated registry/provider that the focused services inject — never duplicate it.
3. No facade: if callers are few and clearly separated, update them directly. A facade re-introduces the coupling being removed.
4. Update the module's `providers` and `exports` arrays to include all new services; remove the old one.

```typescript
// Good — three focused services; each caller injects only what it needs
class MediaMtxClientRegistry  { getIngestClient(); pickClusterClient(); getClusterClients(); }
class MediaMtxStreamQueryService { listIngestStreams(); listClusterStreams(); getStreamStats(); getStreamDetails(); }
class MediaMtxPipelineService    { createClusterPullPipeline(); deleteClusterPipeline(); }

// SyncService uses both query and pipeline:
constructor(private readonly mediaMtxQuery: MediaMtxStreamQueryService,
            private readonly mediaMtxPipeline: MediaMtxPipelineService) {}

// MetricsService uses only query:
constructor(private readonly mediaMtx: MediaMtxStreamQueryService) {}

// Bad — one monolith that every caller must fully inject:
class MediaMtxService { listIngestStreams(); listClusterStreams(); getStreamStats();
                        getStreamDetails(); createClusterPullPipeline(); deleteClusterPipeline(); }
```

**Repository query delegation vs. orchestration:**

When all public methods of a service are single-call delegations to a repository (no branching, no side effects, no event emission), those methods belong in a dedicated `{Concept}RecordService`, not in the orchestrating service. The orchestrator retains scheduling, side effects, and multi-step logic; read-only callers (e.g. controllers) inject the record service directly.

```typescript
// Good — controller injects only what it reads; orchestrator owns scheduling and events
class StreamInspectionRecordService {
    findLatest(name: string):  Promise<StreamInspectionRecord | null> { ... }
    findHistory(name: string, limit: number): Promise<StreamInspectionRecord[]> { ... }
    findAllLatest(): Promise<StreamInspectionRecord[]> { ... }
    save(data: NewStreamInspectionData): Promise<void> { ... }
}
class StreamInspectionService {
    constructor(private readonly streamInspectionRecords: StreamInspectionRecordService, ...) {}
    @Cron(...) inspectAllStreams() { ... }  // schedules; emits events; delegates save
}

// Bad — orchestrator used as a pass-through for reads that the controller only needs:
class StreamInspectionService {
    getLatestInspection(name: string) { return this.repo.findLatest(name); }  // pure delegation
    getInspectionHistory(name: string, limit: number) { return this.repo.findHistory(name, limit); }
    getAllLatestInspections() { return this.repo.findAllLatest(); }
}
```

**Splitting by verb family — query / assignment / status / lifecycle:**

When a service accumulates methods that fall into multiple named verb families (reads, assignment mutations, status transitions, provisioning side-effects), split it one service per family. Each caller injects only the families it actually uses.

| Family     | Responsibility                                        | Example class             |
| ---------- | ----------------------------------------------------- | ------------------------- |
| Query      | Pure reads; no side effects                           | `StreamQueryService`      |
| Assignment | Pod-binding mutations + event emission                | `StreamAssignmentService` |
| Status     | Discovery upsert + status flag mutations              | `StreamStatusService`     |
| Lifecycle  | Create/update/delete + external pipeline side-effects | `StreamLifecycleService`  |

```typescript
// Good — each caller injects only what it uses:
// StreamTrackAlertService needs only a lookup:
constructor(private readonly streamQuery: StreamQueryService) {}

// SyncService cron needs discovery, assignment, and status flags — not lifecycle:
constructor(
    private readonly streamQuery: StreamQueryService,
    private readonly streamAssignment: StreamAssignmentService,
    private readonly streamStatus: StreamStatusService,
) {}

// MetricsService needs a lookup and failover reassignment:
constructor(
    private readonly streamQuery: StreamQueryService,
    private readonly streamAssignment: StreamAssignmentService,
) {}

// StreamsController needs all three non-query families to serve HTTP:
constructor(
    private readonly streamQuery: StreamQueryService,
    private readonly streamLifecycle: StreamLifecycleService,
    private readonly streamAssignment: StreamAssignmentService,
) {}

// Bad — one monolith that every caller must fully inject:
class StreamsService {
    findAll(); findByName(); findUnassigned(); findByAssignedPod(); getAssignmentInfo();
    assignToPod(); clearAssignment(); reassign();
    upsertFromDiscovery(); markSynced(); markSyncError(); markStale();
    create(); update(); remove();
}
```

**Dependency chain rule:** Query services depend only on the repository. Mutation/assignment services may depend on query services. Lifecycle services may depend on assignment services. No cycles.

```
StreamLifecycleService → StreamAssignmentService → StreamQueryService → StreamRepository
StreamStatusService                              → StreamRepository
```

---

## Anti-Patterns

The following patterns are explicitly prohibited in this codebase:

| Anti-Pattern                                                                  | Reason                                                                                               | Fix                                                                                                           |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| String literal where enum exists (`"active"`, `"ingest"`)                     | Breaks refactoring, bypasses type safety                                                             | Use the enum constant                                                                                         |
| DTO class defined inside a controller file                                    | Prevents reuse, mixes layers                                                                         | Move to `dto/{action}-{entity}.dto.ts`                                                                        |
| N identical `@OnEvent` handlers differing only by event name                  | Violates DRY, hard to extend                                                                         | Registration loop in `onModuleInit()`                                                                         |
| Sequential `if (cond1) doX(); if (cond2) doX();` with same body               | Declarative data is clearer                                                                          | Rule array + single loop                                                                                      |
| Inline metadata spread repeated at two call sites                             | DRY violation                                                                                        | Named `buildXxx` free function                                                                                |
| Private class method that never accesses `this`                               | Hides purity, prevents easy testing                                                                  | Extract as module-level free function                                                                         |
| Data / constant rebuilt on every call inside a method body                    | CPU waste, harder to read                                                                            | Declare as module-level `const`, or in its own file                                                           |
| Interface or constant defined in the same file as the service                 | Inflates service file, hides the entity                                                              | Extract to `{concept}.ts` / `{concept}s.ts`                                                                   |
| Shortened lambda parameter names (`m`, `cfg`, `s`, `p`)                       | Hides type intent, reduces readability                                                               | Use full descriptive names (`metric`, `config`)                                                               |
| `@Injectable()` on a plain client class                                       | Clients are lightweight, instantiated directly — not NestJS providers                                | Remove decorator; instantiate with `new`                                                                      |
| Injecting `AxiosInstance` per call instead of owning it                       | Defeats encapsulation, leaks connection config                                                       | Client owns `private readonly http` set in constructor                                                        |
| Fallback and primary strategy inlined in one method body                      | Hides each strategy's intent; hard to test either path in isolation                                  | Extract each strategy to a named private method; orchestrator calls them                                      |
| Caller try/catch that only logs around a single reusable call                 | Duplicates error handling; callers must not know how to handle a called function's internal failures | Move try/catch into the called function                                                                       |
| Self-contained logic block left inline in a function body                     | Forces reader to infer purpose line-by-line; hinders isolated testing                                | Extract to a named private method                                                                             |
| Service with methods falling into multiple distinct named roles               | Callers must inject a superset of what they use; violates ISP and SRP                                | Split into one service per responsibility; share infrastructure via a registry                                |
| `@InjectModel` inside a service                                               | Couples business logic to Mongoose; prevents testing without a real DB                               | Inject an abstract repository class; implement Mongoose details in `mongo-*.repository.ts`                    |
| `StreamDocument`, `PodDocument`, etc. in service signatures                   | Leaks ORM types into the application layer                                                           | Use domain interfaces (`Stream`, `Pod`) defined in `*.domain.ts` files                                        |
| Calling `.save()` on a Mongoose document inside a service                     | ORM mutation belongs in the infrastructure layer                                                     | Add a named method to the service that delegates to the repository                                            |
| Same object literal constructed twice at two call sites with identical fields | DRY violation; fields can drift silently between the two copies                                      | Build the object once as a named, typed `const record: T = { ... }` and pass the reference to both call sites |

---

## Repository Pattern Rules

These rules codify the 3-layer architecture introduced in Phase 8.

### Layer Definitions

| Layer          | Purpose                                           | May Import From                                             |
| -------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| **Domain**     | Plain TypeScript interfaces; no framework imports | nothing (or only enums from `*.schema.ts`)                  |
| **Repository** | Abstract contract for data access                 | Domain files only                                           |
| **Mongo impl** | Concrete Mongoose implementation                  | Repository abstract class, schema files, `@nestjs/mongoose` |
| **Service**    | Business logic and orchestration                  | Repository abstract class, domain types, other services     |
| **Controller** | HTTP routing                                      | Service only                                                |

### Dependency Direction

```
Controller → Service
Service → abstract Repository (injected token)
Service → Domain types
Mongo impl → abstract Repository (extends)
Mongo impl → Mongoose schema/model
Module → wires MongoImpl to abstract Repository token
```

### DI Token Convention

- Abstract repository classes (not interfaces, not string tokens) are used as DI tokens.
- Concrete Mongo implementations extend the abstract class and are wired in the module:

```typescript
// Good — abstract class as token, no @Inject() boilerplate needed
{ provide: PodRepository, useClass: MongoPodRepository }
constructor(private readonly podRepository: PodRepository) {}

// Bad — string token requires @Inject()
{ provide: 'POD_REPOSITORY', useClass: MongoPodRepository }
constructor(@Inject('POD_REPOSITORY') private readonly repo: ...) {}
```

### Repository Method Naming

| Operation           | Method Name                             |
| ------------------- | --------------------------------------- |
| Insert new record   | `create(data)` / `save(data)`           |
| Find by primary key | `findByName(name)` / `findByPodId(id)`  |
| Find many           | `findAll()` / `findRecent(name, limit)` |
| Insert or update    | `upsert(key, data)`                     |
| Partial update      | `update(key, patch)`                    |
| Domain action       | `assignToPod(name, podId, assignedAt)`  |
| Delete              | `delete(key): Promise<boolean>`         |

### File Naming

Each domain concept `{concept}` must have these companion files if it has persistence:

- `{concept}.domain.ts` — plain TypeScript interfaces (no Mongoose)
- `{concept}.repository.ts` — abstract class with method signatures
- `mongo-{concept}.repository.ts` — concrete Mongoose implementation
- `{concept}.schema.ts` — Mongoose schema class and `SchemaFactory` (unchanged)

---

**Last Updated**: April 2026 (Phase 8 — Repository Pattern)
**Applies To**: `backend/src/**`
