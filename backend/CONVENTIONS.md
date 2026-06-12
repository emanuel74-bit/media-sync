# CONVENTIONS — media-sync backend

This file is the **rule registry** for the backend. It is derived from the actual codebase and is the single source of truth for how code here is named, structured, wired, and tested.

## How to use and edit this file

- Every rule has a **stable ID** (`CATEGORY-NN`). Refer to rules by ID in reviews, commits, and AI instructions ("apply DIR-04", "NAME-03 violation").
- Each rule is one block:
    - **Rule** — a single MUST/SHOULD/MAY statement. MUST = violation is a defect; SHOULD = deviation needs a stated reason; MAY = explicitly permitted.
    - **Example** _(optional)_ — a real path or snippet from this repo.
    - **Enforced** _(optional)_ — what catches violations: `tooling` (lint/build fails), `tests`, or `review` (humans/AI only).
- **To add a rule**: append it to the end of its category with the next free number. Never renumber existing rules.
- **To remove a rule**: don't delete the block; change its status line to `~~RETIRED~~` with a one-line reason. This keeps old references meaningful.
- **To change a rule**: edit the Rule text in place. If the meaning reverses, retire it and add a new ID instead.
- Rules marked **[ASPIRATIONAL]** describe the intended state; the code does not fully comply yet. The gap is listed in section 99 (Known Deviations). When the gap closes, drop the marker and the deviation entry.

---

## 1. PHIL — Philosophy

**PHIL-01** — Rule: Code MUST be organized by feature/domain (streams, pods, alerts, metrics, stream-inspection, sync), not by technical layer at the top level. Layers exist _inside_ each feature.

**PHIL-02** — Rule: Variation SHOULD be expressed as data, not branching. Alert conditions are declarative rule arrays; sync steps are an injected workflow list; track parsing is a field-map table.
Example: `src/metrics/domain/consts/metric-alert-rules.const.ts`, `src/sync/domain/consts/sync-workflows.const.ts`, `src/infrastructure/media-mtx/mappers/track-field-map.const.ts`.

**PHIL-03** — Rule: Every class MUST have exactly one responsibility, and the file/class name MUST state it. When a service grows a second role, split it (see SVC-01).

**PHIL-04** — Rule: Dependencies MUST point inward: controllers → services → repositories/clients. Outer layers never get imported by inner ones.

**PHIL-05** — Rule: Cross-module access goes through the target module's public surface (its barrel and, for streams, the facade — see SVC-04). Never reach into another module's internals.

---

## 2. TOOL — Tooling & enforcement

**TOOL-01** — Rule: Formatting is Prettier-owned and not debatable in review: 4-space indent, 100-col width, double quotes, semicolons, trailing commas, LF endings.
Enforced: tooling (`.prettierrc`, eslint-plugin-prettier).

**TOOL-02** — Rule: TypeScript MUST compile under `strict: true`. No `any` escapes without an explicit reason.
Enforced: tooling (`tsconfig.json`, `npm run typecheck`).

**TOOL-03** — Rule: Nested folder barrels (`index.ts`) are wildcard re-exports in barrelsby style; **feature-root barrels** (`src/<feature>/index.ts`) are curated by hand with named exports to control each feature's public surface. When adding or moving files, update the affected barrels in the matching style. Do NOT run `npm run barrels:generate` over the whole tree — it currently destroys the curated feature-root barrels (see DEVN-06). `.schema.ts` and `.spec.ts` files never appear in barrels.
Decision history: [ADR-0004](../docs/adr/0004-curated-feature-root-barrels.md).
Enforced: review.

**TOOL-04** — Rule: Imports MUST be sorted by the perfectionist scheme: grouped (builtin → external → internal `@/**` → relative), line-length ascending within groups, blank line between groups.
Enforced: tooling (`.eslintrc.json`).

**TOOL-05** — Rule: `npm run verify` (typecheck + lint + build + test) MUST pass before a change is considered done.
Enforced: tooling.

---

## 3. NAME — Naming

**NAME-01** — Rule: Files are kebab-case and MUST carry a role suffix. The allowed suffixes:

| Suffix           | Role                                            | Real example                                                               |
| ---------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| `.module.ts`     | NestJS module                                   | `streams/streams.module.ts`                                                |
| `.controller.ts` | HTTP entry point                                | `pods/controllers/pods.controller.ts`                                      |
| `.service.ts`    | Business logic / orchestration                  | `streams/services/query/stream-query.service.ts`                           |
| `.repository.ts` | Data access contract or implementation          | `streams/repositories/stream.repository.ts`                                |
| `.schema.ts`     | Mongoose schema                                 | `infrastructure/database/schemas/stream.schema.ts`                         |
| `.dto.ts`        | Transport-layer DTO                             | `streams/dto/create-stream.dto.ts`                                         |
| `.types.ts`      | Shape-only types/interfaces                     | `sync/domain/types/sync-context.types.ts`                                  |
| `.enum.ts`       | Finite domain state set                         | `common/domain/enums/stream-status.enum.ts`                                |
| `.const.ts`      | Fixed values / rule tables                      | `metrics/domain/consts/metric-alert-rules.const.ts`                        |
| `.mapper.ts`     | Pure shape transformation                       | `infrastructure/media-mtx/mappers/map-v3-path-to-stream.mapper.ts`         |
| `.policy.ts`     | Decision/selection logic                        | `streams/services/assignment/hash-stream-assignment.policy.ts`             |
| `.factory.ts`    | Controlled object construction                  | `infrastructure/media-mtx/registry/media-mtx-client.factory.ts`            |
| `.strategy.ts`   | Strategy implementation under a shared contract | `infrastructure/media-mtx/services/listing/ingest/ingest-stream-listing.strategy.ts` |
| `.util.ts`       | Pure stateless helpers                          | `common/rules/metric-threshold-predicates.util.ts`                         |
| `.client.ts`     | Low-level external communication                | `infrastructure/media-mtx/clients/media-mtx.client.ts`                     |
| `.gateway.ts`    | WebSocket/event gateway                         | `gateway/events.gateway.ts`                                                |

**NAME-02** — Rule: Suffix selection precedence: a shape transformer is a `.mapper.ts` (not util); candidate selection/ranking is a `.policy.ts` (not util); object assembly with defaults/timestamps is a `.factory.ts` (not util). `.util.ts` is the fallback only when no primary role fits.

**NAME-03** — Rule: Interfaces live in `.types.ts` files. There are no `.interface.ts` files in this codebase; do not introduce them.

**NAME-04** — Rule: Classes are PascalCase and mirror their file name (`StreamAssignmentService` ↔ `stream-assignment.service.ts`). Methods/variables are camelCase and intent-revealing; booleans use `is/has/should` (`isEnabled`, `isManual`, `isResolved`); collections are plural.

**NAME-05** — Rule: A module file MUST match its folder: `<folder-name>.module.ts` (`stream-inspection/stream-inspection.module.ts`).

**NAME-06** — Rule: Repository naming: abstract contract in the feature is `<entity>.repository.ts`; the concrete Mongo implementation in infrastructure is `mongo-<entity>.repository.ts`.
Example: `streams/repositories/stream.repository.ts` ↔ `infrastructure/database/repositories/mongo-stream.repository.ts`.

**NAME-07** — Rule: New event names MUST be added to `SystemEventNames` in `common/domain/consts/system-event-names.const.ts` using the `<subject>.<verb-past>` dotted form (`stream.synced`, `alert.created`, `pod.registered`). Never emit a string literal.

---

## 4. DIR — Folder structure

**DIR-01** — Rule: Top level of `src/` contains: one folder per feature (`streams/`, `pods/`, `alerts/`, `metrics/`, `stream-inspection/`, `sync/`, `gateway/`), plus `common/` (shared domain + cross-cutting services), `config/` (env access), and `infrastructure/` (outside-world adapters). New features get a new top-level folder.

**DIR-02** — Rule: Inside a feature, standard layers use these exact folder names, and only the layers the feature needs: `controllers/`, `services/`, `repositories/`, `domain/`, `dto/`.
Example: `sync/` has no controllers or dto — and therefore no such folders.

**DIR-03** — Rule: `domain/` holds framework-free business definitions, organized as `domain/types/`, `domain/enums/`, `domain/consts/`. No logic in enum/types/const files; no Nest imports in `domain/`.

**DIR-04** — Rule: When `services/` covers more than one concern, split it into purpose subfolders named after the concern, and move every file dedicated to one concern into its folder.
Example: `metrics/services/{alerts,collection,failover,persistence}/`, `streams/services/{assignment,mutation,orchestration,query}/`.

**DIR-05** — Rule: A file may sit at a feature/purpose root only if it is the feature's public contract or is shared across multiple child concerns.
Example: `streams/services/streams-facade.service.ts` (cross-module entry point) sits at `services/` root; everything narrower is in a subfolder.

**DIR-06** — Rule: Variant families under a shared contract get one child folder per variant, even single-file variants. Shared contracts/dispatchers stay at the parent level. Use variant folders only when the variants are real behavior (classes behind a contract) — if the variation is just data, prefer a single table + mapper (PHIL-02).
Example: `infrastructure/media-mtx/services/listing/{ingest,cluster}/` with `stream-collection.service.ts` (shared fan-out) at the parent.

**DIR-07** — Rule: `infrastructure/` contains one sub-module per external system (`database/`, `media-mtx/`), each internally organized by the same purpose-folder rules (`clients/`, `registry/`, `mappers/`, `services/`, `types/`, `schemas/`, `repositories/`).

**DIR-08** — Rule: A small module MAY stay flat until a second concern appears.
Example: `gateway/` is just `events.gateway.ts` + `gateway.module.ts`; `config/` is service + module.

---

## 5. ARCH — Architecture & layering

**ARCH-01** — Rule: Controllers handle I/O only: parse params, validate DTOs, delegate to exactly one service call, return its result. No business logic, no repository or client access.
Example: every controller in the repo is < 75 lines.

**ARCH-02** — Rule: Persistence is reachable only through repository abstractions (see DATA-01). Services never import Mongoose models or schemas.

**ARCH-03** — Rule: External systems are reachable only through `infrastructure/` services. Feature code never constructs an HTTP client.

**ARCH-04** — Rule: No circular dependencies between features. If two features need each other, the shared part moves to `common/` or communication switches to events. (`forwardRef` is a last resort and currently appears once — see Known Deviations DEVN-04.)

**ARCH-05** — Rule: No global mutable state. The only in-memory state is owned by injectable singletons with a clear reason (client cache in `MediaMtxClientFactory`, round-robin index in `MediaMtxClientRegistry`).

---

## 6. IMP — Imports & barrels

**IMP-01** — Rule: Deep **file** imports are forbidden: import from a folder's barrel. Allowed forms: same-folder sibling (`./stream-assignment.policy`), one-level (`../query`), feature alias (`@/streams`), and ancestor **layer-barrel** imports inside a feature (`../../domain`, `../../types`, `../../clients`, `../../mappers`, `../../repositories` — these are folder barrels, which is the rule's whole point). Test files are exempt: white-box tests legitimately import internals the curated feature barrels don't expose.
Enforced: tooling (`no-restricted-imports` bans `./*/*`, `../*/*`, `@/*/*` with explicit `!`-negations for the layer barrels; override disables the rule for `test/**` and legacy `src/**/*.spec.ts`).

**IMP-02** — Rule: Cross-feature imports MUST use the `@/<feature>` alias, never relative `../../` paths.
Enforced: tooling + review.

**IMP-03** — Rule: Every folder has a barrel re-exporting its public members (see TOOL-03 for the nested-vs-feature-root styles). Keeping something internal to a feature is done at the **feature-root** barrel (curated named exports); nested barrels export everything in their folder.

---

## 7. TYPE — Domain modeling & types

**TYPE-01** — Rule: Fixed value sets are TypeScript enums in `common/domain/enums/` when shared (`StreamStatus`, `PodRole`, `PodStatus`, `AlertType`, `AlertSeverity`, `TrackType`) or in the feature's `domain/enums/` when private. Never raw string unions for domain states.

**TYPE-02** — Rule: All function signatures declare parameter and return types explicitly, including `Promise<void>`.

**TYPE-03** — Rule: Shapes shared by multiple features live in `common/domain/types/` (e.g. `StreamTrack`, event payloads, rule shapes). External system shapes live in that integration's `types/` (e.g. `V3PathItem` in `infrastructure/media-mtx/types/`). Feature-private shapes live in the feature's `domain/types/`.

**TYPE-04** — Rule: Multi-parameter data is passed as a named structure, not positional primitives, when it crosses module boundaries (e.g. `PodRegistrationData`, `CreateStreamData`, `SyncContext`).

---

## 8. DTO — Transport DTOs & validation

**DTO-01** — Rule: Every controller body is a class in the feature's `dto/` folder with `class-validator` decorators. Validation runs via the global `ValidationPipe` (`whitelist: true, transform: true`) configured in `main.ts`.

**DTO-02** — Rule: DTOs are transport-only. Controllers translate DTOs into domain input types before calling services; services never receive or return DTO classes.
Example: `StreamsController.create` maps `CreateStreamDto` → `CreateStreamData` fields.

**DTO-03** — Rule: DTO names follow `<Action><Entity>Dto` (`CreateStreamDto`, `UpdateStreamDto`, `AssignStreamDto`, `RegisterPodDto`, `HeartbeatDto`).

---

## 9. SVC — Service design

**SVC-01** — Rule: Each service fulfills exactly one role; name it accordingly and place it in the matching purpose folder:

- **query** — reads, no side effects (`StreamQueryService`, `PodQueryService`)
- **mutation** — state changes (`StreamCrudService`, `StreamStatusService`)
- **orchestration / lifecycle** — multi-step coordination with side effects (`StreamLifecycleService`, `StreamProvisioningService`, `SyncOrchestratorService`)
- **reaction** — responds to a produced fact, typically via `@OnEvent` (`StreamTrackAlertService`)

**SVC-02** — Rule: Selection/decision logic is a policy class behind an abstract base used as the DI token, so the algorithm is swappable.
Example: `StreamAssignmentPolicy` (abstract) ← `HashStreamAssignmentPolicy`, bound in `streams.module.ts`.

**SVC-03** — Rule: Multi-step background processes are decomposed as: scheduler (`@Cron`, trivial) → context/query aggregator → orchestrator → workflow steps implementing a shared interface, injected as an ordered list via a `Symbol` token.
Example: `sync/services/{scheduler,query,orchestration,workflows}/`, token `SYNC_WORKFLOWS`.

**SVC-04** — Rule: When several services of one feature are consumed together by other modules, expose a facade and have outsiders depend on it only.
Example: `StreamsFacadeService` is what `sync/` and `metrics/` import; they never touch `StreamCrudService` directly. (Exception: `metrics/failover` wraps `StreamQueryService`/`StreamAssignmentService` in its own gateway service — `MetricFailoverStreamGatewayService` — which is the same pattern one level down.)

**SVC-05** — Rule: A service that delegates to another service MUST change at least one of: vocabulary/abstraction level, module boundary, exposed surface area — or carry at least one decision (guard, transformation, defaulting). If inlining the wrapper loses no concept, inline it. A pure same-module, same-vocabulary forwarder is forbidden, and a wrapper whose tests only assert "calls the delegate with the same arguments" is presumptively one. Facades and boundary gateways (SVC-04) are exempt: their value is the seam itself.
Example: `MetricAlertReactionService` and `MetricFailoverReactionService` were deleted under this rule — the metric workflow now calls `MetricAlertInvocationService` directly, and the cluster-only guard moved into `StreamFailoverService` where its sibling preconditions live.
Decision history: [ADR-0005](../docs/adr/0005-no-pass-through-services.md).
Enforced: review.

---

## 10. DATA — Data access

**DATA-01** — Rule: Each persisted entity has: an abstract repository class in `<feature>/repositories/` (the contract + DI token), a `Mongo<Entity>Repository` implementation in `infrastructure/database/repositories/`, and a schema in `infrastructure/database/schemas/`.

**DATA-02** — Rule: Schemas use `@Schema({ timestamps: true })`; never hand-manage `createdAt`/`updatedAt`. Enum-typed props declare `enum: Object.values(TheEnum)`.

**DATA-03** — Rule: Repository methods are named for the domain operation, not the Mongo verb: `findUnresolvedByStreamAndType`, `upsertByPodId`, `assignToPod`, `resolveById`.

**DATA-04** — Rule: Repositories return domain-shaped documents and `null` for not-found; throwing `NotFoundException` is the service's decision, not the repository's.
Example: `StreamAssignmentService.assignToPod` throws when the repo returns null.

---

## 11. INT — External integration (MediaMTX pattern)

**INT-01** — Rule: Integrations are two-layered. **Client** (`.client.ts`): owns the HTTP instance and raw endpoint calls, maps raw payloads to typed shapes, propagates errors, zero business logic. **Service**: orchestrates clients, owns fallbacks, error isolation, and domain decisions.
Example: `MediaMtxClient` vs `MediaMtxPipelineService` (409 → already-exists is service logic).

**INT-02** — Rule: Client instances are created only through the caching factory and selected/pooled only through the registry. No `axios.create` outside `media-mtx.client.ts`.
Example: `MediaMtxClientFactory` (cache per base URL), `MediaMtxClientRegistry` (ingest client, cluster pool, round-robin).

**INT-03** — Rule: Fan-out calls across multiple nodes MUST isolate per-node failures so one dead node doesn't poison the aggregate.
Example: `StreamCollectionService.collectFromClients` catches and logs per client, returns `[]` for the failed node.

**INT-04** — Rule: Raw API shapes (`V3PathItem`, `V3TrackItem`) never leave `infrastructure/media-mtx/`; integration services return domain shapes (`MediaMtxStreamInfo`, `StreamDetails`, `StreamTrack`), mapped at the boundary via `.mapper.ts` files.
Example: `MediaMtxStreamStatsService.getStreamDetails` returns `StreamDetails`, never the raw path item.

**INT-05** — Rule: V3 track interpretation happens in exactly one place: the `mappers/` folder of `infrastructure/media-mtx/`, driven by the `TRACK_FIELD_MAP` table (which V3 fields each `TrackType` carries into the domain `StreamTrack`). Supporting a new track type = add the `TrackType` enum member + one table row; never add a parser class or a type switch. Unknown track types are dropped by the mapper.
Example: `track-field-map.const.ts` + `map-v3-track-to-stream-track.mapper.ts`; covered by `test/infrastructure/media-mtx/mappers/`, including a completeness test that every `TrackType` has a field-map row.
Decision history: [ADR-0003](../docs/adr/0003-data-driven-track-parsing.md).
Enforced: tests.

---

## 12. EVT — Events & realtime

**EVT-01** — Rule: State changes that other modules or UI clients care about are announced on `EventEmitter2` using a `SystemEventNames` constant, emitted by the service that owns the mutation (assignment service emits `stream.assigned`, provisioning emits `stream.synced`, alert lifecycle emits `alert.created`/`alert.resolved`).

**EVT-02** — Rule: WebSocket broadcasting is exclusively the gateway's job: `EventsGateway` subscribes to the whitelist in `BROADCAST_EVENTS` and forwards payloads verbatim. To expose a new event to clients, add it there — never inject the Socket.IO server elsewhere.

**EVT-03** — Rule: Internal diagnostics events (`sync.tick`) stay off the broadcast whitelist.

**EVT-04** — Rule: Cross-feature _reactions_ MAY use `@OnEvent` instead of direct injection when the producer shouldn't know the consumer.
Example: `StreamTrackAlertService` reacts to `stream.inspected`.

**EVT-05** — Rule: Event payload shapes are typed in `common/domain/types/event-payloads.types.ts`; an event's payload is part of its contract.

---

## 13. JOB — Scheduled jobs

**JOB-01** — Rule: `@Cron` methods live in a dedicated scheduler service and contain no logic beyond: gather inputs, delegate, guard with error handling. Current cadence: sync 10s, metrics 10s, inspection 30s.

**JOB-02** — Rule: Scheduled iteration over streams goes through `SequentialStreamTaskRunner` (`processSequential` for per-item isolation, `runSafely` for whole-run guarding) so one bad stream/cycle never kills the job.

**JOB-03 [ASPIRATIONAL]** — Rule: Job cadence SHOULD come from `ConfigService` (`SYNC_POLL_INTERVAL`, `METRICS_POLL_INTERVAL`, `INSPECTION_INTERVAL`) instead of hard-coded `@Cron` expressions. See DEVN-01.

---

## 14. RULE — Declarative alert rules

**RULE-01** — Rule: Alert conditions are data: an exported `*_ALERT_RULES` const array in the owning feature's `domain/consts/`, each entry `{ check(input, context), type: AlertType, severity: AlertSeverity, message(input) }`.

**RULE-02** — Rule: Rule evaluation and persistence are generic and shared: `RuleEvaluator` (common) evaluates any rule list; `AlertEvaluationService` persists hits; `AlertLifecycleService.findOrCreateAlert` dedupes on unresolved `{streamName, type}` and emits `alert.created` only for new alerts. New alert kinds = new rule entry + new `AlertType` enum member; no new evaluation plumbing.

**RULE-03** — Rule: Threshold values come from `ConfigService` getters (env-overridable), passed into rules as a context object — never inlined in the rule's check.
Example: `MetricAlertInvocationService` builds `MetricAlertThresholds` from `ALERT_BITRATE_LOW` / `ALERT_PACKET_LOSS` / `ALERT_LATENCY_HIGH`.

---

## 15. ERR — Errors & logging

**ERR-01** — Rule: Use the NestJS `Logger` with the class name as context (`new Logger(ServiceName.name)`); never `console.*`.

**ERR-02** — Rule: Every log line names its subject (stream name, pod ID, workflow name).

**ERR-03** — Rule: Failure containment matches blast radius: per-item failures are logged and skipped (workflow loop in `SyncOrchestratorService`, per-stream metric workflow); whole-cycle failures are caught at the scheduler boundary; HTTP handlers let Nest exceptions propagate (`NotFoundException` → 404).

**ERR-04** — Rule: Errors are never silently swallowed — minimum is a contextual `logger.warn`/`error`. Expected conditions are modeled, not thrown (e.g. 409 → `{ alreadyExists: true }`).

**ERR-05** — Rule: Normalize unknown catches with `error instanceof Error ? error.message : String(error)` before interpolating into messages.

---

## 16. CFG — Configuration

**CFG-01** — Rule: All environment access goes through `ConfigService` getters with a default value (`process.env.X ?? default`). No `process.env` reads outside `config/` (bootstrap-time exceptions: `main.ts` PORT, `app.module.ts` MONGODB_URI).

**CFG-02** — Rule: A new env var requires: a getter in `config.service.ts`, a row in the Environment Variables table in `API_DOCUMENTATION.md`, and at least one consumer. Getters with no consumer must be marked `(unused)` in the docs.

---

## 17. TEST — Testing

**TEST-01** — Rule: Tests live in the top-level `test/` directory, mirroring the `src/` path of the unit under test exactly.
Example: `src/streams/services/assignment/hash-stream-assignment.policy.ts` → `test/streams/services/assignment/hash-stream-assignment.policy.test.ts`.

**TEST-02** — Rule: Naming: `<name>.test.ts` for unit tests, `<name>.spec.ts` for integration tests. Jest picks up both (`testRegex`).

**TEST-03** — Rule: Co-located `.spec.ts` in `src/` is legacy; migrate on touch. (One remains — see DEVN-03.)

**TEST-04** — Rule: Mock only at external boundaries (repositories, MediaMTX services, EventEmitter2). Pure logic (policies, mappers, parsers, rule consts) is tested directly with no mocks.

**TEST-05** — Rule: Every service's core logic gets a test, and every cross-service interaction that shapes data gets a test. Controllers are tested for delegation and parameter mapping.

**TEST-06** — Rule: Forbidden: order-dependent tests, shared mutable state between cases, committed skipped/commented-out tests.

**TEST-07** — Rule: End-to-end API checks live in the repo-root scripts (`test.ps1`, `test.sh`, `test-pods.ps1`) and run against a live stack; they are not part of `npm test`.

---

## 18. DOC — Documentation & decisions

**DOC-01** — Rule: A decision that changes the architecture, a public contract, or tooling behavior gets an ADR in `docs/adr/` (repo root), numbered, using `docs/adr/template.md`. CONVENTIONS rules born from a decision cite their ADR; the ADR records the why, this file records the current law.
Example: SVC-05 ← [ADR-0005](../docs/adr/0005-no-pass-through-services.md).

**DOC-02** — Rule: Diagrams in repo markdown are Mermaid (GitHub renders it natively). No new ASCII-art diagrams; convert existing ones on touch. Directory trees and short text flows stay as plain text.

**DOC-03** — Rule: ADRs are append-only. To change a decision, write a new ADR that supersedes the old one and update the old ADR's status line — never rewrite its content.

**DOC-04** — Rule: While the LikeC4 trial runs ([ADR-0006](../docs/adr/0006-documentation-tooling-choices.md)), `docs/architecture/media-sync.c4` MUST be updated in the same change that adds, removes, or renames a container or backend feature module. Requires Node ≥ 22 (`docs/architecture/README.md`).

---

## 99. DEVN — Known deviations & open items

Current, verified gaps between the rules above and the code. Fix on touch; remove the entry when fixed.

**DEVN-01** — `ConfigService` getters `syncPollInterval`, `metricsPollInterval`, `inspectionInterval`, `bitrateDropPercent`, `staleSeconds` have no consumers; cadence is hard-coded in `@Cron` decorators (violates CFG-02, blocks JOB-03).

**DEVN-02** — `common/services/` contains both `rule-evaluator.service.ts` and `alert-rule-evaluator.service.ts`; the barrel resolves `RuleEvaluator` from the latter, leaving the former as an unused duplicate (violates PHIL-03 / reuse).

**DEVN-03** — `src/sync/services/orchestration/sync-orchestrator.service.spec.ts` is a legacy co-located spec (violates TEST-01/TEST-03); a mirrored test also exists under `test/`.

**DEVN-04** — `StreamInspectionRecorderService` injects its repository via `forwardRef` (smell against ARCH-04); the cycle should be removed instead.

**DEVN-06** — `npm run barrels:generate` (barrelsby `--delete --location all`) overwrites the curated feature-root barrels with broken self-referential output (`export * from "./index"`), so it cannot be run over the whole tree (blocks the original intent of TOOL-03). Until the script is fixed or scoped to nested folders, barrels are maintained by hand per TOOL-03.

---

**Last regenerated from code**: June 2026 (branch `feature/scary-refactor`)
**Scope**: `backend/` only
