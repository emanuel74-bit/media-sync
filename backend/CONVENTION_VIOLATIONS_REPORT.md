# Convention Violations Report

This report audits current code against `backend/CONVENTIONS.md`.

## Scope

- Audited: `backend/src/**`
- Not audited against these rules: `frontend/**` (the conventions document explicitly applies to backend code)
- Date: 2026-04-12

## Summary

- Total confirmed violations: 37
- Rule categories with violations:
    - Explicit return type requirement: 19
    - Stream assignment rule (consistent hashing): 1
    - Service cohesion (dependency count threshold): 1
    - Lambda parameter naming (single-letter abbreviations): 16

---

## 1) Explicit Return Types Missing

Convention reference:

- Type Safety -> Explicit Function Signatures
- "Every function must declare explicit return type, especially all async methods and all public service methods"

### 1.1 Streams controller methods

File: `backend/src/streams/streams.controller.ts`

1. Line 30: `findAll()`
2. Line 35: `create(@Body() createStreamDto: CreateStreamDto)`
3. Line 40: `assignment()`
4. Line 45: `findOne(@Param("name") name: string)`
5. Line 50: `update(...)`
6. Line 58: `remove(@Param("name") name: string)`
7. Line 63: `assign(...)`
8. Line 71: `unassign(@Param("name") name: string)`

Why this violates conventions:

- Public controller methods omit explicit return types.

Fix direction:

- Add explicit return signatures (for example `Promise<Stream[]>`, `Promise<Stream | null>`, `Promise<void>`, etc. as appropriate).

### 1.2 Alerts controller methods

File: `backend/src/alerts/alerts.controller.ts`

1. Line 11: `findAll()`
2. Line 16: `resolve(@Param("id") id: string)`

Why this violates conventions:

- Public controller methods omit explicit return types.

Fix direction:

- Add explicit return signatures matching `AlertsService` contracts.

### 1.3 Metrics controller method

File: `backend/src/metrics/metrics.controller.ts`

1. Line 11: `async streamMetrics(...)`

Why this violates conventions:

- Async controller method has no explicit return type.

Fix direction:

- Add `Promise<...>` return type.

### 1.4 Stream inspection controller methods

File: `backend/src/stream-inspection/stream-inspection.controller.ts`

1. Line 13: `getAllLatestInspections()`
2. Line 18: `getLatestInspection(...)`
3. Line 23: `getInspectionHistory(...)`

Why this violates conventions:

- Public controller methods omit explicit return types.

Fix direction:

- Add explicit `Promise<...>` signatures.

### 1.5 Pods controller methods

File: `backend/src/pods/pods.controller.ts`

1. Line 13: `async listPods()`
2. Line 18: `async listActivePods()`
3. Line 23: `async registerPod(@Body() dto: RegisterPodDto)`
4. Line 33: `async heartbeat(@Body() dto: RegisterPodDto)`

Why this violates conventions:

- Async controller methods omit explicit return types.

Fix direction:

- Add explicit `Promise<...>` return types.

### 1.6 Top-level bootstrap function

File: `backend/src/main.ts`

1. Line 7: `async function bootstrap()`

Why this violates conventions:

- Async function has no explicit return type.

Fix direction:

- Change to `async function bootstrap(): Promise<void>`.

---

## 2) Stream Assignment Rule Violation (Consistent Hashing)

Convention reference:

- Streams Domain Rules -> Assignment Rules
- "Use `hashStreamToPod(streamName, podIds)` for all assignment decisions"
- "Never hardcode pod selection"

File: `backend/src/streams/stream-assignment.service.ts`

1. Line 50: `return this.assignToPod(name, available[0]);`

Why this violates conventions:

- Reassignment chooses the first available pod directly (`available[0]`) instead of using consistent hashing.
- This can break idempotency and assignment stability.

Fix direction:

- Use `hashStreamToPod(name, available)` and assign based on that result.

---

## 3) Service Cohesion Threshold Violation

Convention reference:

- Do's and Don'ts
- "Do not create god services - if a service has more than ~6 injected dependencies, split it"

File: `backend/src/metrics/metrics.service.ts`

1. Lines 21-28: constructor injects 8 dependencies

Why this violates conventions:

- `MetricsService` exceeds the stated dependency threshold and mixes multiple concerns (collection, persistence, alerts, failover).

Fix direction:

- Split into focused services (for example collection/persistence vs failover/orchestration) and inject only what each caller needs.

---

## 4) Lambda Parameter Naming Violations

Convention reference:

- Function Design -> Lambda Parameter Names
- "Never single-letter abbreviations; use full descriptive names"

### 4.1 Stream repository

File: `backend/src/streams/mongo-stream.repository.ts`

1. Line 44: `docs.map((d) => this.toDomain(d));`
2. Line 52: `docs.map((d) => this.toDomain(d));`
3. Line 60: `docs.map((d) => this.toDomain(d));`
4. Line 120: `docs.map((d) => ({ ... }))`

Why this violates conventions:

- `d` is a single-letter lambda parameter; convention requires descriptive names.

Fix direction:

- Rename to descriptive names (for example `streamDocument` or `assignment`).

### 4.2 Pod repository

File: `backend/src/pods/mongo-pod.repository.ts`

1. Line 38: `docs.map((d) => this.toDomain(d));`
2. Line 47: `docs.map((d) => this.toDomain(d));`
3. Line 56: `docs.map((d) => d.podId);`

Why this violates conventions:

- Single-letter lambda parameter (`d`).

Fix direction:

- Use descriptive names (for example `podDocument`).

### 4.3 Metric repository

File: `backend/src/metrics/mongo-metric.repository.ts`

1. Line 27: `docs.map((d) => this.toDomain(d));`

Why this violates conventions:

- Single-letter lambda parameter (`d`).

Fix direction:

- Use descriptive names (for example `metricDocument`).

### 4.4 Stream track alert rules

File: `backend/src/stream-inspection/stream-track-alert-rules.ts`

1. Line 9: `tracks.some((t) => t.type === TrackType.VIDEO)`
2. Line 17: `tracks.some((t) => t.type === TrackType.AUDIO)`
3. Line 24: `tracks.some((t) => !Object.values(TrackType).includes(t.type))`
4. Line 29: `.filter((t) => !Object.values(TrackType).includes(t.type))`
5. Line 30: `.map((t) => t.type)`

Why this violates conventions:

- Single-letter lambda parameter (`t`) used repeatedly.

Fix direction:

- Use descriptive names (for example `track`).

### 4.5 Stream inspection repository

File: `backend/src/stream-inspection/mongo-stream-inspection.repository.ts`

1. Line 57: `docs.map((d) => this.toDomain(d));`
2. Line 66: `results.map((r) => this.toDomain(...));`

Why this violates conventions:

- Single-letter lambda parameters (`d`, `r`).

Fix direction:

- Use descriptive names (for example `inspectionDocument`, `aggregateResult`).

### 4.6 Alert repository

File: `backend/src/alerts/mongo-alert.repository.ts`

1. Line 57: `docs.map((d) => this.toDomain(d));`

Why this violates conventions:

- Single-letter lambda parameter (`d`).

Fix direction:

- Use descriptive names (for example `alertDocument`).

---

## Notes

- No confirmed `any` usage was found under `backend/src/**`.
- No confirmed `console.log` / `console.warn` / `console.error` usage was found under `backend/src/**`.
- No confirmed private-member bracket-access anti-pattern (`service["privateField"]`) was found.
- No confirmed string-token DI pattern (`@Inject("TOKEN")`) was found in `backend/src/**`.

---

## Suggested Remediation Order

1. Fix `stream-assignment.service.ts` reassignment hashing (behavioral correctness).
2. Add all explicit return types (consistency and type-safety baseline).
3. Rename lambda parameters across repositories and rules.
4. Split `MetricsService` by responsibility to meet cohesion guidelines.
