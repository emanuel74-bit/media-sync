# Architecture Principles Violations Audit

Reference standard: .github/prompts/architecture-guidelines.prompt.md
Date: 2026-04-12
Scope reviewed: backend/src/** and frontend/src/**

## Summary

- Confirmed violations: 15
- Backend violations: 12
- Frontend violations: 3

Severity breakdown:

- High: 6
- Medium: 7
- Low: 2

---

## Confirmed Violations

### 1) Domain layer depends on persistence schema types

- Principle violated: 7 (Domain Integrity), 2 (Data Flow)
- File: backend/src/alerts/alert.domain.ts
- Line: 1
- Code:
    - import { AlertSeverity, AlertType } from "./alert.schema";
- Why this violates:
    - Domain contracts are importing schema-layer enums. This couples core domain types to persistence/infrastructure.
- Severity: High
- Fix direction:
    - Move AlertSeverity and AlertType to alert.domain.ts (or a domain-only enum file), then import those in schema/repository/service layers.

### 2) Repository abstraction depends on schema layer

- Principle violated: 2 (Data Flow), 4 (Coupling Control)
- File: backend/src/alerts/alert.repository.ts
- Line: 1
- Code:
    - import { AlertType } from "./alert.schema";
- Why this violates:
    - Repository contract should depend on domain model types, not Mongoose schema types.
- Severity: High
- Fix direction:
    - Use AlertType from domain enum, not schema enum.

### 3) Alert rule contract depends on another module barrel and config service

- Principle violated: 4 (Coupling Control), 7 (Domain Integrity)
- File: backend/src/alerts/metric-alert-rule.ts
- Lines: 1-2
- Code:
    - import { Metric } from "../metrics";
    - import { ConfigService } from "../config";
- Why this violates:
    - Rule contract is tied to a module barrel and a concrete infrastructure/config service type, increasing coupling at the domain-rule boundary.
- Severity: High
- Fix direction:
    - Depend on a small domain metric shape and a threshold/policy interface local to alerts.

### 4) Alerts service also depends on metrics module barrel

- Principle violated: 4 (Coupling Control)
- File: backend/src/alerts/alerts.service.ts
- Line: 4
- Code:
    - import { Metric } from "../metrics";
- Why this violates:
    - Alerts module has direct compile-time dependency on metrics module barrel exports, increasing cross-module coupling.
- Severity: Medium
- Fix direction:
    - Import a domain-only metric type from a shared domain contract file (common/domain).

### 5) Stream-inspection rule contract imports stream module barrel and alert schema

- Principle violated: 2 (Data Flow), 4 (Coupling Control), 7 (Domain Integrity)
- File: backend/src/stream-inspection/stream-track-alert-rule.ts
- Lines: 1, 3
- Code:
    - import { Stream } from "../streams";
    - import { AlertSeverity, AlertType } from "../alerts/alert.schema";
- Why this violates:
    - Rule interface in one feature depends on another feature barrel and schema-layer types.
- Severity: High
- Fix direction:
    - Replace with domain-only imports: stream.domain and alert domain enums.

### 6) Stream-inspection rules use alert schema types directly

- Principle violated: 4 (Coupling Control), 7 (Domain Integrity)
- File: backend/src/stream-inspection/stream-track-alert-rules.ts
- Line: 3
- Code:
    - import { AlertSeverity, AlertType } from "../alerts/alert.schema";
- Why this violates:
    - Business rule definitions are tied to persistence schema enums.
- Severity: High
- Fix direction:
    - Use domain enums from alerts domain layer.

### 7) Metrics service is a fat service with too many responsibilities

- Principle violated: 3 (Cohesion and SoC), 6 (Service Design Constraints)
- File: backend/src/metrics/metrics.service.ts
- Lines: 21-29
- Code (constructor dependencies):
    - metricRepository, mediaMtxListing, mediaMtxStats, config, alertsService, streamQuery, streamAssignment, podsService
- Why this violates:
    - One service handles collection, persistence, alerting, failover decision, and pod selection orchestration.
- Severity: High
- Fix direction:
    - Split into focused services (e.g., MetricCollectionService, MetricAlertService, StreamFailoverService).

### 8) Sync service is another orchestration-heavy service with broad coupling

- Principle violated: 3 (Cohesion and SoC), 4 (Coupling Control)
- File: backend/src/sync/sync.service.ts
- Lines: 16-22
- Code (constructor dependencies):
    - mediaMtxQuery, streamQuery, podsService, events, ingestSync, reconcile, staleness
- Why this violates:
    - The service aggregates many concerns and module dependencies in one place.
- Severity: Medium
- Fix direction:
    - Keep SyncService as thin scheduler/orchestrator and delegate all workflow branches to dedicated strategies/facades with narrower contracts.

### 9) MediaMtx stream listing bypasses registry and hardcodes endpoint construction

- Principle violated: 4 (Coupling Control), 6 (Service Design Constraints)
- File: backend/src/media-mtx/media-mtx-stream-listing.service.ts
- Line: 43
- Code:
    - (pod) => new MediaMtxClient(`http://${pod.host || pod.podId}:9000`),
- Why this violates:
    - Client creation logic and endpoint construction are duplicated in service code; this bypasses the registry abstraction and hardcodes infrastructure details.
- Severity: Medium
- Fix direction:
    - Move pod-derived client construction into MediaMtxClientRegistry and consume registry methods only.

### 10) MediaMtx pipeline service performs infrastructure-specific axios error checks directly

- Principle violated: 6 (Service Design Constraints)
- File: backend/src/media-mtx/media-mtx-pipeline.service.ts
- Line: 1
- Code:
    - import axios from "axios";
- Why this violates:
    - Service-level business flow is coupled to HTTP-client-specific error typing.
- Severity: Medium
- Fix direction:
    - Push HTTP error normalization into MediaMtxClient; service should consume domain-level results/errors.

### 11) Stream-inspection module has direct compile-time dependency on alerts module

- Principle violated: 1 (Structural Design), 4 (Coupling Control)
- File: backend/src/stream-inspection/stream-inspection.module.ts
- Lines: 4, 22
- Code:
    - import { AlertsModule } from "../alerts";
    - AlertsModule,
- Why this violates:
    - Creates direct feature-to-feature coupling where event-driven decoupling could be used.
- Severity: Medium
- Fix direction:
    - Publish inspection-derived alert events/contracts; let alerts subscribe without direct module import where feasible.

### 12) Metrics module imports many feature modules (high fan-in/fan-out coupling)

- Principle violated: 1 (Structural Design), 4 (Coupling Control)
- File: backend/src/metrics/metrics.module.ts
- Lines: 18-22
- Code:
    - MediaMtxModule, PodsModule, ConfigModule, AlertsModule, StreamsModule
- Why this violates:
    - High module coupling indicates service boundaries are too broad.
- Severity: Medium
- Fix direction:
    - Split metrics responsibilities and narrow module dependencies per sub-service.

### 13) Frontend global singleton state for websocket manager

- Principle violated: Anti-patterns to eliminate (global state), 4 (Coupling Control)
- File: frontend/src/services/websocket.ts
- Line: 151
- Code:
    - export const wsManager = new WebSocketManager();
- Why this violates:
    - Process-wide mutable singleton state creates implicit coupling and lifecycle side effects across UI features.
- Severity: Medium
- Fix direction:
    - Provide websocket manager through DI/context provider with explicit lifecycle ownership.

### 14) Frontend websocket manager stores untyped listener collections

- Principle violated: 9 (Maintainability), 4 (Coupling Control)
- File: frontend/src/services/websocket.ts
- Line: 22
- Code:
    - private listeners = new Map<string, Set<Function>>();
- Why this violates:
    - Generic Function storage reduces contract clarity and increases accidental misuse risk.
- Severity: Low
- Fix direction:
    - Use fully typed listener map keyed by EventMap.

### 15) Frontend stream filtering embeds backend role literal

- Principle violated: 8 (Consistency), 9 (Maintainability)
- File: frontend/src/hooks/use-streams.ts
- Line: 49
- Code:
    - return pods.filter((pod) => pod.type === "cluster");
- Why this violates:
    - Business role literal is duplicated in UI flow; this encourages drift from backend domain contracts.
- Severity: Low
- Fix direction:
    - Share a role constant/type from frontend domain types and use it consistently.

---

## Areas Reviewed With No Major Principle Violations

- backend/src/streams/stream-query.service.ts
- backend/src/streams/stream-crud.service.ts
- backend/src/streams/stream-status.service.ts
- backend/src/pods/pods.service.ts
- backend/src/gateway/gateway.gateway.ts
- frontend/src/services/api.ts (good central API boundary)

---

## Remediation Priority

1. Move alert enums/types out of schema and eliminate schema imports from domain/repository/rule files.
2. Split MetricsService responsibilities and reduce MetricsModule dependency breadth.
3. Refactor MediaMtx listing/pipeline boundaries so registry/client own infrastructure details.
4. Decouple stream-inspection from direct alerts module import where possible.
5. Replace frontend websocket singleton with provider-managed lifecycle.
