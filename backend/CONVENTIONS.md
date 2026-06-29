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

**PHIL-03** — Rule: Every class MUST have exactly one responsibility, and the file/class name MUST state it. When a service grows a second role, split it (see SVC-01). The function-level analog is PHIL-06.

**PHIL-04** — Rule: Dependencies MUST point inward: controllers → services → repositories/clients. Outer layers never get imported by inner ones.

**PHIL-05** — Rule: Cross-module access goes through the target module's public surface (its barrel and, for streams, the facade — see SVC-04). Never reach into another module's internals.

**PHIL-06** — Rule: A function does one thing at one level of abstraction. When a method interleaves _deciding_ with _doing_, runs several phases in sequence (gather → transform → dispatch → emit), or makes the reader track multiple bookkeeping structures at once, extract its steps into intent-named private helpers so the orchestrating function reads as a short list of named calls — its own docstring made executable. Extract to **name a concept or separate a level**, never to hit a line target: a helper must be nameable for what it _means_, make its caller read better, and be self-contained (its inputs are its parameters). Counterweight (the SVC-05 spirit at function scope): do NOT fragment into one-line helpers that merely relocate a single statement, helpers whose name just restates the call, or call-chains the reader must hop through to follow control flow — if inlining loses no concept and the caller is no harder to read, keep it inline. Prefer this method-level split before reaching for a new class or abstraction; over-extraction is as much a readability cost as a too-long block.
Example: `AlertReconcileService.reconcileSubject` is a ~20-line orchestrator over `dedupeByType` / `openAlert` / `applyChange` / `resolveAlert`; each lifecycle transition (a repository write plus its one conditional emit) lives in a single small method.
Enforced: review.

**PHIL-07** — Rule: Prefer composition over inheritance. Use `extends` only for genuine specialization — where the base supplies behavior the subtype reuses (template-method) AND the subtype truly _is-a_ the base. Never extend, nor implement a behavior-less abstract class, merely to be discovered, collected, registered, or labeled by another component: a base with no shared implementation is a tag, and a tag is data you hand over (compose / register), not a type you inherit. The test when unsure — does the base give you _behavior_ or just a _name_? Behavior + a true is-a → inheritance; a label, a "uses / participates-in" relationship, or a shape that is really data-plus-a-callback → composition. Put shared cross-cutting behavior in one collaborator and have participants hold and feed it, rather than in a base they must subclass.
Example: the only legitimate `extends` in the tree is `Mongo<Entity>Repository extends MongoDomainRepository` — the base supplies real shared mapping/query behavior with `toDomain` as the subclass hole. Everywhere else composes: services inject and call collaborators (`RuleEvaluator`, repositories, facades) instead of extending them.
Enforced: review.

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

**TOOL-06** — Rule: Bindings are `const` by default; `var` is forbidden. A surviving `let` is a smell to resolve, in order of preference: (a) a single expression (ternary / `??` / `Array.map`/`reduce`); (b) destructuring the result of one call that does the branching (`const { a, b } = compute()`); (c) extracting a named **private/local helper** that returns the value, when the computation is a nameable concept (PHIL-06 applies — extract only if the caller reads better). Keep the `let` only when none of those is clearer (a hot-loop accumulator, genuinely incremental construction). Do NOT push one-off `let`-elimination into a shared `.util.ts` — that file is for reusable pure helpers (NAME-01/02); a one-off is a private method or local function.
Example: `StreamInspectionCollectionService.inspectAndRecord` does `const { details, lastError } = await this.inspectStream(...)`; the try/catch that turns an inspection failure into `lastError` _data_ lives in the private `inspectStream` helper, so both bindings stay `const`.
Enforced: tooling (`prefer-const`, `no-var`) for the floor; review for the graded resolution.

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

**NAME-08** — Rule: Parallel types that fill the same structural role across a family of variants MUST share one name shape (a common head/suffix), so the family is recognizable and greppable and a missing member is obvious.
Example: each producer's rule alias is `<Subject>AlertRule` (`MetricAlertRule`, `StreamTrackAlertRule`, `NodeResourceAlertRule`); each rule's injected context is `<Subject>AlertContext` (`StreamTrackAlertContext`, `NodeResourceAlertContext`).
Enforced: review.

---

## 4. DIR — Folder structure

**DIR-01** — Rule: Top level of `src/` contains: one folder per feature (`streams/`, `pods/`, `alerts/`, `metrics/`, `stream-inspection/`, `sync/`, `gateway/`), plus `common/` (shared **non-provider** code — domain types/enums/consts, pure utils — and self-contained cross-cutting capability modules like `scheduling/`), `config/` (env access), and `infrastructure/` (outside-world adapters). New features get a new top-level folder. There is no catch-all provider module (see ARCH-06).

**DIR-02** — Rule: Inside a feature, standard layers use these exact folder names, and only the layers the feature needs: `controllers/`, `services/`, `repositories/`, `domain/`, `dto/`.
Example: `sync/` has no controllers or dto — and therefore no such folders.

**DIR-03** — Rule: `domain/` holds framework-free business definitions, organized as `domain/types/`, `domain/enums/`, `domain/consts/`. No logic in enum/types/const files; no Nest imports in `domain/`.

**DIR-04** — Rule: When `services/` covers more than one concern, split it into purpose subfolders named after the concern, and move every file dedicated to one concern into its folder.
Example: `metrics/services/{alerts,collection,failover,persistence}/`, `streams/services/{assignment,mutation,orchestration,query}/`.

**DIR-05** — Rule: A file may sit at a feature/`services/` root only if it is an **aggregating entry point** — the feature's public/cross-module contract that *fans out to* the concerns below it (a facade depends downward and is what outsiders call). A service that is merely *shared by* the concerns — a dependency they consume, like a reconciler or an evaluation engine — is itself a concern and gets its own subfolder; do NOT elevate it to root just because it has several consumers (that inverts the facade relationship). A feature with no such entry point has nothing at its `services/` root.
Example: `streams/services/streams-facade.service.ts` (cross-module entry that uses the concerns below it) sits at root. Alerts has no facade, so every alerts service is foldered — `access/` (REST read surface), `evaluation/` (`RuleEvaluator` engine), `reconciliation/` (the reconciler shared by the rulers), `rulers/` (per-source reactors) — even though the reconciler and evaluator each have multiple consumers.

**DIR-06** — Rule: Variant families under a shared contract get one child folder per variant, even single-file variants. Shared contracts/dispatchers stay at the parent level. Use variant folders only when the variants are real behavior (classes behind a contract) — if the variation is just data, prefer a single table + mapper (PHIL-02).
Example: `infrastructure/media-mtx/services/listing/{ingest,cluster}/` with `stream-collection.service.ts` (shared fan-out) at the parent.

**DIR-07** — Rule: `infrastructure/` contains one sub-module per external system (`database/`, `media-mtx/`), each internally organized by the same purpose-folder rules (`clients/`, `registry/`, `mappers/`, `services/`, `types/`, `schemas/`, `repositories/`).

**DIR-08** — Rule: A small module MAY stay flat until a second concern appears.
Example: `gateway/` is just `events.gateway.ts` + `gateway.module.ts`; `config/` is service + module.

**DIR-09** — Rule: Deployment artifacts live under `deploy/`, grouped by tool and named for what they are: `deploy/docker/` (Dockerfiles `<purpose>.Dockerfile`, compose files `compose.<variant>.yml`), `deploy/k8s/` (real Kubernetes manifests only), `deploy/mediamtx/` (MediaMTX runtime configs — these are NOT k8s manifests), `deploy/scripts/` (pod runtime shell scripts). Nothing deployment-related sits at the backend root. Compose build context is `backend/`.
Decision history: [ADR-0007](../docs/adr/0007-backend-deploy-layout.md).
Enforced: review.

**DIR-10** — Rule: A `domain/types/` folder (and an integration's `types/`) is organized like `services/` (DIR-04), one layer down for shapes. Each exported interface or type alias MUST live in its own `.types.ts` file named after it (kebab-case). When the folder holds several shapes spanning distinct subjects/themes, group them into subject subfolders, each with its own barrel; split a subject into nested per-subject subfolders when it spans multiple sub-subjects — especially ones expected to grow (DIR-06 spirit). Strongly-linked shapes — a type and the type it embeds or wraps, a rule alias and the context it is parameterised by — stay co-located in the same folder so their imports remain sibling-relative. A small or single-theme types folder MAY stay flat until a second theme appears (DIR-08).
Example: `alerts/domain/types/{alert/, rules/{metric,stream-track,node}/}` — `Alert` plus its create/update payloads under `alert/`; each producer's rule alias and context under `rules/<subject>/`.
Enforced: review.

---

## 5. ARCH — Architecture & layering

**ARCH-01** — Rule: Controllers handle I/O only: parse params, validate DTOs, delegate to exactly one service call, return its result. No business logic, no repository or client access.
Example: every controller in the repo is < 75 lines.

**ARCH-02** — Rule: Persistence is reachable only through repository abstractions (see DATA-01). Services never import Mongoose models or schemas.

**ARCH-03** — Rule: External systems are reachable only through `infrastructure/` services. Feature code never constructs an HTTP client.

**ARCH-04** — Rule: No circular dependencies between features. If two features need each other, the shared part moves to `common/` or communication switches to events. (`forwardRef` is a last resort, all instances rooted in the `infrastructure/` ↔ `@/pods` barrel cycle from hosting Mongo repositories in `infrastructure/`: the `MediaMtxModule` ↔ `PodsModule` module seam, plus the `PodQueryService` injections in `ClusterNodeResolverService` and `IngestStreamListingStrategy` — see [ADR-0008](../docs/adr/0008-runtime-safe-barrel-imports.md), [ADR-0009](../docs/adr/0009-pod-derived-cluster-topology.md). Removing the repository placement would remove all of them.)

**ARCH-05** — Rule: No global mutable state. The only in-memory state is owned by injectable singletons with a clear reason (client cache in `MediaMtxClientFactory`, round-robin index in `MediaMtxClientRegistry`).

**ARCH-06** — Rule: A Nest module is organized around a **capability**, never around "shared/common". There is no catch-all `CommonModule`. A provider used by a single feature lives in that feature and is provided by its module (`RuleEvaluator` lives with the alert rulers in `alerts/`, not in `common/`). A genuinely cross-cutting capability gets its own purpose-named module (`SchedulingModule`). The `common/` folder is allowed only for shared **non-provider** code — domain types/enums/consts and pure utils — which is imported directly and needs no module. The test for "does this belong in common?": if it's an `@Injectable` with one consumer feature, no — move it to that feature.

---

## 6. IMP — Imports & barrels

**IMP-01** — Rule: Deep **file** imports are forbidden: import from a folder's barrel. Allowed forms: same-folder sibling (`./stream-assignment.policy`), one-level (`../query`), feature alias (`@/streams`), and ancestor **folder-barrel** imports inside a package (`../../domain`, `../../../registry`, … — these are barrels, which is the rule's whole point). Test files are exempt: white-box tests legitimately import internals the curated feature barrels don't expose.
Enforced: tooling (`no-restricted-imports` group `["./*/*", "../*/*", "@/*/*", "!../../**"]`; the broad `!../../**` negation exists because ESLint's matcher ignores more precise forms — so at two-plus levels up, "barrel, not file" is enforced by review; override disables the rule for `test/**` and legacy `src/**/*.spec.ts`). Decision history: [ADR-0008](../docs/adr/0008-runtime-safe-barrel-imports.md).

**IMP-02** — Rule: Cross-feature imports MUST use the `@/<feature>` alias, never relative `../../` paths.
Enforced: tooling + review.

**IMP-03** — Rule: Every folder has a barrel re-exporting its public members (see TOOL-03 for the nested-vs-feature-root styles). Keeping something internal to a feature is done at the **feature-root** barrel (curated named exports); nested barrels export everything in their folder.

**IMP-04** — Rule: Barrels are runtime cycle hazards (CJS getter re-exports only exist after their line executes). The two mechanisms that actually keep boot safe: (a) inside a package, **runtime values** are imported via relative paths — the package's own `@/...` barrel is allowed only for type-only imports (erased at compile), and abstract repositories are referenced only via `implements`/types (also erased); (b) an inherent module/provider cycle (e.g. `MediaMtxModule` ↔ `PodsModule`, or any infra service injecting `PodQueryService`) uses `forwardRef(() => …)` on the importing side. Barrel export ORDER is **not** a safety mechanism — the perfectionist lint rule sorts exports by line length, so a "module last" ordering cannot be relied on; do not write comments claiming it. Unit tests never boot `AppModule`, so violations surface only at deploy time — treat any Nest "undefined dependency" boot error as this rule's signature, and confirm with a boot DI-scan (`node dist/main.js` against an unreachable Mongo).
Decision history: [ADR-0008](../docs/adr/0008-runtime-safe-barrel-imports.md) (note: that ADR's "module-last" point was superseded by this rule — forwardRef + erased imports are the operative fix).
Example: `MediaMtxClientRegistry` is imported as `../../registry` inside `infrastructure/media-mtx/services/`, never as `@/infrastructure`; `MediaMtxModule` imports `forwardRef(() => PodsModule)`.
Decision history: [ADR-0008](../docs/adr/0008-runtime-safe-barrel-imports.md).
Enforced: review (boot smoke test pending — see ADR-0008 consequences).

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

**SVC-06** — Rule: An evaluate-and-react flow is decomposed as **produce → evaluate → reconcile**. A _producer_ emits a typed data event and stays ignorant of who consumes it — it never imports the consumer, evaluates conditions, or writes the consumer's records. A consumer-side _evaluator_ reacts (`@OnEvent`) and turns the data into the set of records that _should_ exist (its desired state), declaratively via a rules-as-data table where the conditions vary (PHIL-02 / RULE-02). A _reconciler_ then diffs desired against actual, scoped by a stable key, and converges them: create what is newly desired, update what changed, remove what is no longer desired (an actual with no matching desired); an unchanged entry may be touched without re-emitting. Crossing a feature boundary is an event; staying inside one is a direct call (EVT-04). Adding a producer to an existing pipeline = data event + evaluator + desired-state mapping + scope key, with no change to the reconciler. Uniqueness of a reconciled record under concurrent cycles is a database invariant, not application logic (DATA-05).
Example: the alerts pipeline — metrics/inspection/pods _produce_ data events, rulers in `alerts/services/rulers/` _evaluate_ them into `AlertSignal[]`, and `AlertReconcileService` _reconciles_ by `(source, subject, type)`. Decision history: [ADR-0010](../docs/adr/0010-event-driven-alert-pipeline.md), [ADR-0011](../docs/adr/0011-node-resource-alerts-third-producer.md).
Enforced: review.
Example: `MetricAlertReactionService` and `MetricFailoverReactionService` were deleted under this rule — the metric workflow now calls `MetricAlertInvocationService` directly, and the cluster-only guard moved into `StreamFailoverService` where its sibling preconditions live.
Decision history: [ADR-0005](../docs/adr/0005-no-pass-through-services.md).
Enforced: review.

---

## 10. DATA — Data access

**DATA-01** — Rule: Each persisted entity has: an abstract repository class in `<feature>/repositories/` (the contract + DI token), a `Mongo<Entity>Repository` implementation in `infrastructure/database/repositories/`, and a schema in `infrastructure/database/schemas/`.

**DATA-02** — Rule: Schemas use `@Schema({ timestamps: true })`; never hand-manage `createdAt`/`updatedAt`. Enum-typed props declare `enum: Object.values(TheEnum)`.

**DATA-03** — Rule: Repository methods are named for the domain operation, not the Mongo verb: `findUnresolvedByStreamAndType`, `upsertByPodId`, `assignToPod`, `resolveById`.

**DATA-04** — Rule: Repositories return domain-shaped documents and `null` for not-found; throwing `NotFoundException` is the service's decision, not the repository's.

**DATA-05** — Rule: A "at most one X per key" invariant that must hold under concurrent writers is enforced at the database, not in application read-then-write logic (which races: two cycles both read "absent" and both insert). Use a unique index — `partialFilterExpression` when the constraint applies to a subset (e.g. only open records) — plus an idempotent upsert whose filter _is_ the dedup key, so a losing writer collapses onto the winner instead of duplicating. The write reports whether it actually inserted so callers fire create-only side effects (events) exactly once.
Example: `AlertSchema` partial unique index on `(source, subject, type)` where `isResolved: false`, backing `MongoAlertRepository.create`'s upsert that returns `{ alert, created }`.
Enforced: tooling (DB constraint) + review.
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

**INT-06** — Rule: Cluster MediaMTX nodes are addressed by the live pod registry, not a static URL: `ClusterNodeResolverService` builds one client per registered cluster pod and a pull pipeline is created on the pod the stream is **assigned to** (`createClusterPullPipeline(stream, assignedPod)`), falling back to the static pool / a round-robin pick only when no pod is registered or the assigned pod is gone. The cluster relay's pull source is a real protocol URL — `${INGEST_RTSP_URL}/${name}` for ingest-relayed streams, or the stream's stored source when it is already a pullable URL — never the v3 reported `source` (which is a description, mapped to a string for display only).
Example: `cluster-node-resolver.service.ts`, `media-mtx-pipeline.service.ts`; covered by `test/infrastructure/media-mtx/{registry,services/pipeline}`.
Decision history: [ADR-0009](../docs/adr/0009-pod-derived-cluster-topology.md).
Enforced: review + tests.

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

**JOB-01** — Rule: A scheduled job is a single `@ScheduledTask({ name, interval })` on the method that does the work (the decorator + `JobScheduler` live in `common/scheduling/`, re-exported from `@/common`). One declaration defines it — there is no separate scheduler service, lifecycle hook, or registration call to forget. The method itself does nothing but gather → delegate; it does NOT manage a timer, and it does NOT need its own whole-cycle `try/catch` (see JOB-02). Never use `@nestjs/schedule`'s `@Cron`/`@Interval` (removed) — those can't take a config-driven cadence and scatter scheduling across services.
Example: `MetricCollectionService.collectMetrics`, `StreamInspectionCollectionService.inspectAllStreams`, `SyncService.periodicSync`.

**JOB-02** — Rule: Cross-cutting scheduling behavior lives once in `JobScheduler`, not in each job: it discovers every `@ScheduledTask` at bootstrap, runs it on its interval, **guards each run** (a throw is logged + swallowed, never killing the timer), and **prevents overlap** (a run still in flight skips its next tick). A job method therefore throws freely. The only guarding a job writes itself is _per-item isolation_ inside a fan-out loop — wrap each iteration in its own `try/catch` so one bad item doesn't abort the rest.
Example: `StreamInspectionCollectionService` wraps each per-stream `inspectAndRecord` in `try/catch`, but lets a listing failure propagate to `JobScheduler`; `SyncOrchestratorService` does the same per workflow.

**JOB-03** — Rule: A job's cadence MUST come from a `ConfigService` getter via the `@ScheduledTask` `interval` resolver (`interval: (config) => config.metricsPollInterval`), evaluated once at bootstrap — never a hard-coded literal. The resolver is a typed property access, so renaming the getter is refactor-safe. Current cadence: `SYNC_POLL_INTERVAL` (10s), `METRICS_POLL_INTERVAL` (10s), `INSPECTION_INTERVAL` (30s).

---

## 14. RULE — Declarative alert rules

**RULE-01** — Rule: Alert conditions are data: an exported `*_ALERT_RULES` const array in `alerts/domain/consts/`, each entry `{ check(input, context), type: AlertType, severity: AlertSeverity, message(input) }`. Rules live with the **alerts** feature, never in the producer feature whose data they inspect (ADR-0010).
Example: `METRIC_ALERT_RULES`, `STREAM_TRACK_ALERT_RULES` in `alerts/domain/consts/`.

**RULE-02** — Rule: Rule evaluation is one generic engine: `RuleEvaluator` (in `alerts/services/rulers/`, used by all three rulers) maps any rule list + input → `AlertSignal[]`. A new alert kind = a new rule entry + a new `AlertType` member; no new evaluation plumbing.

**RULE-03** — Rule: A rule's `check`/`message` operate only on their typed input (and optional context); no service calls, persistence, or config reads inside a rule. Context the rule needs (e.g. a stream's track expectations) is gathered by the ruler and passed in.

**RULE-04** — Rule: The input shapes rules evaluate live in `common/domain/types/` (`PathMetricSample`, `StreamTrack`, …) so the producer that emits them and the alerts ruler that consumes them share one definition (TYPE-03).

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

**TEST-07** — Rule: End-to-end API checks live in the single backend-root smoke script (`test.ps1`, with an `-Up` switch to start the stack) and run against a live stack; they are not part of `npm test`. Smoke checks must clean up what they create.

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

**DEVN-01** — `ConfigService` getters `bitrateDropPercent` and `staleSeconds` have no consumers (violating CFG-02). The three interval getters (`syncPollInterval`, `metricsPollInterval`, `inspectionInterval`) are now consumed via `@ScheduledTask` resolvers.

**DEVN-03** — `src/sync/services/orchestration/sync-orchestrator.service.spec.ts` is a legacy co-located spec (violates TEST-01/TEST-03); a mirrored test also exists under `test/`.

**DEVN-06** — `npm run barrels:generate` (barrelsby `--delete --location all`) overwrites the curated feature-root barrels with broken self-referential output (`export * from "./index"`), so it cannot be run over the whole tree (blocks the original intent of TOOL-03). Until the script is fixed or scoped to nested folders, barrels are maintained by hand per TOOL-03.

**DEVN-07** — DIR-10 is currently satisfied only by `alerts/domain/types/`. Other type folders still pack multiple shapes per file and use no subject subfolders — e.g. `infrastructure/media-mtx/types/media-mtx.types.ts` (5), `streams/domain/types/stream.types.ts` (3), `pods/domain/types/pod-registration-data.types.ts` (3), `common/domain/types/event-payloads.types.ts` (3), plus several two-shape files. Apply DIR-10 on touch.

---

**Last regenerated from code**: June 2026 (branch `feature/scary-refactor`)
**Scope**: `backend/` only
