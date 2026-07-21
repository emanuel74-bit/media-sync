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
Example: the two legitimate `extends` in the tree are template-method bases with a real subclass hole — `Mongo<Entity>Repository extends MongoDomainRepository` (base owns mapping/query, `toDomain` is the hole) and `MediaMtx*ClientFactory extends CachingClientFactory<T>` (base owns the URL→client cache + get-or-create, `create` is the hole; one concrete subclass per client kind to keep distinct DI tokens, ARCH-07). Everywhere else composes: services inject and call collaborators (`RuleEvaluator`, repositories, facades) instead of extending them.
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
| `.util.ts`       | Pure stateless helpers                          | `common/rules/metric-threshold-predicates.util.ts`                         |
| `.client.ts`     | Low-level external communication                | `infrastructure/media-mtx/clients/media-mtx.client.ts`                     |
| `.gateway.ts`    | WebSocket/event gateway                         | `gateway/events.gateway.ts`                                                |

**NAME-02** — Rule: Suffix selection precedence: a shape transformer is a `.mapper.ts` (not util); candidate selection/ranking **behind a swappable contract** is a `.policy.ts` (a single context-free selection algorithm is a **pure function** in `@/common` instead — SVC-02, e.g. `selectByHash`/`selectLeastLoaded`); object assembly with defaults/timestamps is a `.factory.ts` (not util). `.util.ts` is the fallback only when no primary role fits. There is **no `.strategy.ts` suffix**: the repo expresses interchangeable-behaviour-behind-a-contract as a `.policy.ts` — an abstract token with sibling implementations selected at runtime (SVC-02); a decision with only one algorithm is a method or pure function, never a `.policy.ts`. Do not name a class `*Strategy` unless it is a *real* strategy — a shared contract (abstract token) with sibling implementations selected at runtime. Collaborators a service merely composes and always runs (not selects) are `.service.ts`, not strategies — the media-mtx listing once had fake `ingest`/`cluster` "strategies" (no shared contract, both always called) and was collapsed into two methods on one `MediaMtxStreamListingService`.

**NAME-03** — Rule: Interfaces live in `.types.ts` files. There are no `.interface.ts` files in this codebase; do not introduce them.

**NAME-04** — Rule: Classes are PascalCase and mirror their file name (`StreamAssignmentService` ↔ `stream-assignment.service.ts`). Methods/variables are camelCase and intent-revealing; booleans use `is/has/should` (`isEnabled`, `isManual`, `isResolved`); collections are plural. Sibling methods on one class that fill the same role share a verb prefix so the family reads as a set — don't mix `getX` with a bare `x()` for the same kind of accessor. A complementary operation pair shares the subject noun exactly (`buildClusterPullPipeline` / `teardownClusterPullPipeline`, not a different noun on one side). The cluster-pipeline lifecycle uses one verb set at every layer — **build** (construct, no side effects), **deploy** (build + mark synced + announce), **teardown** (remove + announce) — so `media-nodes` (`buildClusterPullPipeline`/`teardownClusterPullPipeline`) and `streams` (`build`/`deploy`/`teardown` + facade `*ClusterPipeline`) read as the same vocabulary rather than drifting to `create`/`delete` in one place and `build`/`teardown` in another.
Example: `NodeResolver` vends one `get*` family — `getIngestClient`, `getActiveIngestClients`, `getActiveClusterClients`, `getClusterClientForPod`, `getMetricsTargets` — so the accessors read as a set; the gateway `MediaMtxClientRegistry` mirrors it with `getClient`/`getMetricsClient`.

**NAME-05** — Rule: A module file MUST match its folder: `<folder-name>.module.ts` (`stream-inspection/stream-inspection.module.ts`).

**NAME-06** — Rule: Repository naming: abstract contract in the feature is `<entity>.repository.ts`; the concrete Mongo implementation in infrastructure is `mongo-<entity>.repository.ts`.
Example: `streams/repositories/stream.repository.ts` ↔ `infrastructure/database/repositories/mongo-stream.repository.ts`.

**NAME-07** — Rule: New event names MUST be added to `SystemEventNames` in `common/domain/consts/system-event-names.const.ts` using the `<subject>.<verb-past>` dotted form (`stream.synced`, `alert.created`, `pod.registered`). Never emit a string literal.

**NAME-08** — Rule: Parallel types that fill the same structural role across a family of variants MUST share one name shape (a common head/suffix), so the family is recognizable and greppable and a missing member is obvious.
Example: each producer's rule alias is `<Subject>AlertRule` (`MetricAlertRule`, `StreamTrackAlertRule`, `NodeResourceAlertRule`); each rule's injected context is `<Subject>AlertContext` (`StreamTrackAlertContext`, `NodeResourceAlertContext`).
Enforced: review.

---

## 4. DIR — Folder structure

**DIR-01** — Rule: Top level of `src/` contains: one folder per feature (`streams/`, `pods/`, `alerts/`, `metrics/`, `stream-inspection/`, `sync/`, `gateway/`, `media-nodes/`), plus `common/` (shared **non-provider** code — domain types/enums/consts, pure utils — and self-contained cross-cutting capability modules like `scheduling/`), `config/` (env access), and `infrastructure/` (outside-world adapters). New features get a new top-level folder. There is no catch-all provider module (see ARCH-06).

**DIR-02** — Rule: Inside a feature, standard layers use these exact folder names, and only the layers the feature needs: `controllers/`, `services/`, `repositories/`, `domain/`, `dto/`.
Example: `sync/` has no controllers or dto — and therefore no such folders.

**DIR-03** — Rule: `domain/` holds framework-free business definitions, organized as `domain/types/`, `domain/enums/`, `domain/consts/`. No logic in enum/types/const files; no Nest imports in `domain/`.

**DIR-04** — Rule: When `services/` covers more than one concern, split it into purpose subfolders named after the concern, and move every file dedicated to one concern into its folder. The converse also holds: a subfolder is earned by a concern, not by a single file. A lone helper that serves one sibling within a concern stays a **peer file** in that concern's folder — do not wrap it in its own one-file subfolder (that is nesting without a second concern to separate). A folder appears when a second file of the same concern does.
Example: `metrics/services/{collection,persistence}/`, `streams/services/{assignment,mutation,orchestration,query}/`. Counter-example: `StreamCollectionService` (per-node `listPaths` fan-out) is a helper of listing only, so it sits directly at `media-nodes/services/listing/stream-collection.service.ts` — not a `listing/collection/` subfolder, which held a single file.

**DIR-05** — Rule: A file may sit at a feature/`services/` root only if it is an **aggregating entry point** — the feature's public/cross-module contract that *fans out to* the concerns below it (a facade depends downward and is what outsiders call). A service that is merely *shared by* the concerns — a dependency they consume, like a reconciler or an evaluation engine — is itself a concern and gets its own subfolder; do NOT elevate it to root just because it has several consumers (that inverts the facade relationship). A feature with no such entry point has nothing at its `services/` root.
Example: `streams/services/streams-facade.service.ts` (cross-module entry that uses the concerns below it) sits at root. Alerts has no facade, so every alerts service is foldered — `access/` (REST read surface), `evaluation/` (`RuleEvaluator` engine), `reconciliation/` (the reconciler shared by the rulers), `rulers/` (per-source reactors) — even though the reconciler and evaluator each have multiple consumers.

**DIR-06** — Rule: Variant families **behind a real shared contract** (an abstract token with sibling implementations selected at runtime) get one child folder per variant, even single-file variants. Only the shared contract/dispatcher stays at the parent. The bar is real polymorphism: if a service merely *composes* a couple of collaborators and always runs them (rather than a contract selecting one), that is **not** a variant family — do not carve variant folders or call them "strategies"; keep them as methods/services (NAME-02, SVC-05). Use variant folders only when the variation is real behavior; if the variation is just data, prefer a single table + mapper (PHIL-02).
Example (real): `infrastructure/media-mtx/registry/factories/` — the `CachingClientFactory` base with its two subclasses (control + metrics clients) behind a shared contract (DIR-07). Counter-example (was not real): `media-mtx` listing once split into `ingest`/`cluster` "strategy" folders with no shared contract, both always invoked — collapsed into two methods on one `MediaMtxStreamListingService`, with node resolution centralized in `NodeResolver` and per-node fan-out in `StreamCollectionService` (`listing/stream-collection.service.ts`). Non-example: stream placement once had a `hash/` variant folder behind an abstract `StreamAssignmentPolicy` token — but with only one implementation ever, it was speculative; collapsed to context-free pure functions in `@/common` (`selectByHash`/`selectLeastLoaded`).

**DIR-07** — Rule: `infrastructure/` contains one sub-module per external system (`database/`, `media-mtx/`), each internally organized by purpose folders. A **gateway** holds only transport-layer purposes — `clients/`, `registry/`, `mappers/`, `types/` (and for `database/`, `schemas/` + `repositories/`); the application services that operate it are NOT here, they live in a feature (ARCH-10, e.g. `media-nodes/` over the `media-mtx/` gateway). Those purpose folders sub-split by DIR-04 once a second concern appears — e.g. `media-mtx/registry/` holds `factories/` (the `CachingClientFactory` base + its two subclasses) alongside the `MediaMtxClientRegistry` that vends from them.

**DIR-08** — Rule: A small module MAY stay flat until a second concern appears.
Example: `gateway/` is just `events.gateway.ts` + `gateway.module.ts`; `config/` is service + module.

**DIR-09** — Rule: Deployment artifacts live under `deploy/`, grouped by tool and named for what they are: `deploy/docker/` (Dockerfiles `<purpose>.Dockerfile`, compose files `compose.<variant>.yml`), `deploy/k8s/` (real Kubernetes manifests only), `deploy/mediamtx/` (MediaMTX runtime configs — these are NOT k8s manifests), `deploy/scripts/` (pod runtime shell scripts). Nothing deployment-related sits at the backend root. Compose build context is `backend/`.
Decision history: [ADR-0007](../docs/adr/0007-backend-deploy-layout.md).
Enforced: review.

**DIR-10** — Rule: A `domain/types/` folder (and an integration's `types/`) is organized like `services/` (DIR-04), one layer down for shapes. Each exported interface or type alias MUST live in its own `.types.ts` file named after it (kebab-case). When the folder holds several shapes spanning distinct subjects/themes, group them into subject subfolders, each with its own barrel; split a subject into nested per-subject subfolders when it spans multiple sub-subjects — especially ones expected to grow (DIR-06 spirit). Strongly-linked shapes — a type and the type it embeds or wraps, a rule alias and the context it is parameterised by — stay co-located in the same folder so their imports remain sibling-relative. A small or single-theme types folder MAY stay flat until a second theme appears (DIR-08).
Example: `alerts/domain/types/{alert/, rules/{metric,stream-track,node}/}` — `Alert` plus its create/update payloads under `alert/`; each producer's rule alias and context under `rules/<subject>/`. Likewise `infrastructure/media-mtx/types/{v3/, stream/, metrics/}` + flat `pipeline-create-result.types.ts` and `media-mtx-pod-endpoint.types.ts` — raw wire shapes (`V3PathItem`/`V3TrackItem`/`V3PathSource`) grouped under `v3/`, domain output shapes (`MediaMtxStreamInfo`/`StreamDetails`/`ContextualMediaMtxStream`/`StreamPathMetadata`) under `stream/`, scrape shapes (`PrometheusSample`/`MediaMtxMetricsSnapshot`) under `metrics/`, and the two lone single-theme shapes left flat — one shape per file, each subject folder with its own barrel.
Enforced: review.

---

## 5. ARCH — Architecture & layering

**ARCH-01** — Rule: Controllers handle I/O only: parse params, validate DTOs, delegate to exactly one service call, return its result. No business logic, no repository or client access.
Example: every controller in the repo is < 75 lines.

**ARCH-02** — Rule: Persistence is reachable only through repository abstractions (see DATA-01). Services never import Mongoose models or schemas.

**ARCH-03** — Rule: External systems are reachable only through `infrastructure/` services. Feature code never constructs an HTTP client.

**ARCH-04** — Rule: No circular dependencies between features. If two features need each other, the shared part moves to `common/` or communication switches to events. `forwardRef` is a last resort and the tree currently uses **none** (`grep -rn forwardRef src/` is empty). Two rounds removed them: (1) the `MediaMtxModule` ↔ `PodsModule` **module-seam** forwardRef was eliminated by ARCH-08 — persistence is composed in `DatabaseModule` and imported by feature modules via the `@/infrastructure/database` sub-barrel, so `PodsModule` no longer reaches the `@/infrastructure` barrel and the barrel cycle that left `PodsModule` undefined at scan time is gone; (2) the three media-mtx infra services that injected `PodQueryService` (`IngestStreamListingStrategy`, `MediaMtxMetricsService`, and the now-deleted `ClusterNodeResolverService`) had that dependency **inverted out entirely** per ARCH-09 — infra no longer imports `@/pods` at all, so `MediaMtxModule` dropped its `PodsModule` import and now initializes in the eager batch (before the Mongo gate), independent of pods. Confirmed by a boot DI-scan (all synchronous DI resolves; boot fails only on the Mongo connection) and the full test suite. See [ADR-0008](../docs/adr/0008-runtime-safe-barrel-imports.md), [ADR-0009](../docs/adr/0009-pod-derived-cluster-topology.md).

**ARCH-05** — Rule: No global mutable state. The only in-memory state is owned by injectable singletons with a clear reason (client cache in `MediaMtxClientFactory`). `MediaMtxClientRegistry` is itself stateless — it holds the factories and vends from them.

**ARCH-07** — Rule: DI tokens are **classes**, never strings or `Symbol`s. Inject a dependency by its class — a concrete service, or an abstract class used as the contract token (SVC-02). If you ever genuinely need to inject a *collection* assembled from several providers, wrap it in a small injectable **registry class** that constructor-injects the members and exposes them, rather than `@Inject(SOME_SYMBOL)`-ing a `useFactory` array; class tokens are type-checked, refactor-safe (a rename follows the type), and greppable, while string/symbol tokens are none of these and scatter an untyped seam through the module. For a small fixed sequence of steps, prefer injecting the step services directly and guarding each call (SVC-03) over introducing a collection at all. Reflection **metadata** keys (`SCHEDULED_TASK`, set with `Reflect.defineMetadata`) are not DI tokens and are exempt.
Example: `StreamRepository` (abstract) is the DI token for `MongoStreamRepository` (DATA-01, ADR-0002); there is no string or `Symbol` DI token anywhere in the tree.
Enforced: review.

**ARCH-06** — Rule: A Nest module is organized around a **capability**, never around "shared/common". There is no catch-all `CommonModule`. A provider used by a single feature lives in that feature and is provided by its module (`RuleEvaluator` lives with the alert rulers in `alerts/`, not in `common/`). A genuinely cross-cutting capability gets its own purpose-named module (`SchedulingModule`). The `common/` folder is allowed only for shared **non-provider** code — domain types/enums/consts and pure utils — which is imported directly and needs no module. The test for "does this belong in common?": if it's an `@Injectable` with one consumer feature, no — move it to that feature.

**ARCH-09** — Rule: An `infrastructure/` adapter MUST NOT depend on a feature — the dependency arrow runs feature → infrastructure, never back (PHIL-04). When an adapter needs domain state to do its job (which pods are live, which node a stream is assigned to), it does **not** reach up into the feature that owns that state; the feature **resolves the state and passes it in as a parameter**. The adapter stays pure transport, taking a plain data shape (a host string, a role) it defines itself, so any feature can call it and none is imported. Parameter-passing is the fix when the caller is a **genuine adapter operation**. But if the thing reaching for `@/pods` is really application logic mis-filed under `infrastructure/`, the deeper fix is ARCH-10: move it to a feature, where it may inject `PodQueryService` directly (feature → feature) and self-resolve — no threading. That is what happened here: the media-mtx orchestration services were extracted to the `media-nodes` feature, so `MediaMtxPipelineService.buildClusterPullPipeline(stream, assignedPodId)`, `MediaMtxStreamStatsService`, and `MediaMtxMetricsService.collect()` resolve pods internally (via `NodeResolver`), and the transport-only `MediaMtxClientRegistry` (the true adapter) took an even smaller contract: **a single node host + role**, `getClient(host, role)` / `getMetricsClient(host, role)` — not even an endpoint array. The feature resolves the live host from the pod registry and hands it in one at a time; the adapter is addressless (see ARCH-11).
Enforced: review + boot DI-scan (a violating adapter drags the feature's module into its graph).
Example: the gateway `MediaMtxClientRegistry.getClient(host, role)` turns a host into a cached client (pure transport); the `media-nodes` feature's `NodeResolver` injects `PodQueryService` + the registry and bridges "which pods are active" to "give me a client for this host" (for ingest and cluster).

**ARCH-10** — Rule: Separate an integration's **gateway** (the driver that talks to the external system) from the **application layer** that operates it. The gateway lives in `infrastructure/<system>/` and holds only transport: HTTP clients, their caching factories, the registry that vends them, boundary mappers, and the raw wire types — all mapping happens *inside the client* so raw shapes never leave the gateway. The orchestration that *uses* the gateway to do something meaningful for this system — discovery strategies, resource lifecycle (create/delete), stat/metric collection, role/context tagging — is **application logic and belongs in a feature**, not under `infrastructure/`. The tell that logic is mis-filed as "infra": it needs domain state (which pods are live) or makes system-specific decisions (fallback order, already-exists semantics) — pure transport never does, and mis-filing it is what forces an adapter to import a feature (ARCH-09). A feature over a gateway is a normal feature: it imports the gateway module, injects the registry, and injects whatever domain features it needs.
Enforced: review + boot DI-scan.
Example: `infrastructure/media-mtx/` is the gateway (`MediaMtxClient`, `MediaMtxMetricsClient`, factories, `MediaMtxClientRegistry`, mappers, V3/Prometheus types); the `media-nodes/` feature owns the services that operate it (`MediaMtxStreamListingService`, `MediaMtxPipelineService`, `MediaMtxStreamStatsService`, `MediaMtxMetricsService`, `NodeResolver`) and is what other features inject. `MediaMtxClient.getStreamDetails` maps V3 → `StreamDetails` inside the client, so the feature never sees a raw path item (INT-04).

**ARCH-08** — Rule: Persistence is composed in exactly one place — `infrastructure/database/DatabaseModule`, the **storage composition root**. It registers every schema (`MongooseModule.forFeature`), binds each port to its adapter (`{ provide: XRepository, useClass: MongoXRepository }`), and `exports` the port tokens. A feature module imports `DatabaseModule` and depends only on its port token — it never imports a schema, a `Mongo*Repository`, or calls `forFeature`. Swapping an entity's storage is a one-line binding change here, with no feature-module edit (this is the OCP seam — consumers already depend only on the port; centralizing the binding makes the wiring swappable too). Acyclicity is load-bearing: the root imports port contracts via the `@/<feature>/repositories` sub-barrel (which carries no Nest module) and the Mongo classes via the local `./mongo` barrel; feature modules import the root via the `@/infrastructure/database` sub-barrel so they don't drag `media-mtx` into their graph (IMP-01). A central module that imported the full `@/<feature>` barrels instead would pull every feature module into the persistence graph and reintroduce boot-breaking cycles — verified, not hypothetical.
Enforced: review + boot DI-scan.
Example: `DatabaseModule` binds all six repositories; `PodsModule` imports it and drops its own `forFeature` + adapter provider.

**ARCH-11** — Rule: Runtime topology has **one source of truth**, and a transport adapter is not it. The set of live nodes (which pods exist, their hosts, their health) belongs to the feature that owns that state — here the pod registry (`PodsModule`), fed by heartbeats. The transport adapter is **addressless**: it turns a caller-supplied host into a client using only per-deployment transport config (port, credentials) and never holds node addresses or decides which node to hit. Config's job is *transport parameters* (ports, auth, timeouts), **not** a parallel list of node addresses. A static-address fallback in the adapter ("use the configured URLs when no pods are registered") is a second, stale source of truth: it silently targets a hardcoded node when the real answer is "none are live", masking outages the same way a nullable-and-defaulted precondition does (SVC-08). Remove it — an empty live set means no client, and the **feature** decides what that means (skip, empty result, or throw), not the adapter. The rule governs addressing a **specific, dynamically-changing node instance**. It does **not** apply to a **stable shared endpoint** — a Service/DNS, a load balancer, a database — which fronts the instances and is legitimately deployment config (CFG-01), not pod discovery. Deciding test: *are you talking to one specific live node, or to "the system" through a stable front?* Specific node → pod registry; stable front → config.
Ingest reversal (ADR-0013): ingest is no longer a stable front. It is now a **cluster** of MediaMTX nodes (several per VM, addressed by host **+ self-reported port**), so a published/relayed stream is addressed per-node from the registry exactly like an assigned cluster stream (INT-06) — never via `INGEST_RTSP_URL`, which is retired. The stable-front carve-out only ever held while ingest was a single endpoint.
Enforced: review + boot DI-scan.
Example: `MediaMtxClientRegistry` was cut from owning `ingestBaseUrl`/`clusterBaseUrls` + a `pods.length ? fromPods : staticPool` fallback + round-robin, down to `getClient(host, role)`/`getMetricsClient(host, role)` — host in, cached client out, reading config only for port + `ingestNodeAuth`/`clusterNodeAuth`. `NodeResolver` (feature) now owns every addressing decision: it asks `PodQueryService` for live pods and, finding none, returns `[]` or throws (`No active cluster node for pod …`) rather than hitting a seed URL. The old `INGEST_MEDIAMTX_BASE_URL`/`CLUSTER_MEDIAMTX_BASE_URL(S)` env vars were deleted; credentials that used to be parsed out of them became explicit `*_MEDIAMTX_AUTH` transport config. Counter-example (the stable-front exception): `NodeResolver.getIngestPullUrl` builds the cluster→ingest RTSP pull URL from `config.ingestRtspBaseUrl` (`INGEST_RTSP_URL`, a Service/DNS like `rtsp://mediamtx-ingest:8554`) — the media plane pulls from "the ingest" through a stable relay, not a specific ingest pod, so this address stays config while the control-plane per-node HTTP addressing is pod-derived.

---

## 6. IMP — Imports & barrels

**IMP-01** — Rule: Deep **file** imports are forbidden: import from a folder's barrel. Allowed forms: same-folder sibling (`./stream-assignment.policy`), one-level (`../query`), feature alias (`@/streams`), and ancestor **folder-barrel** imports inside a package (`../../domain`, `../../../registry`, … — these are barrels, which is the rule's whole point). Two **named public sub-barrels** are also allowed, and only these two: `@/<feature>/repositories` (a feature's port contracts) and `@/infrastructure/database` (the `DatabaseModule` root). They exist so a composition root can take a contract, or a feature can take the persistence root, **without** pulling the feature's/infrastructure's full Nest module through the barrel — the narrower import is what keeps the module graph acyclic (ARCH-08, IMP-04). Reaching any deeper (`@/<feature>/services`, a schema file, …) stays forbidden. Test files are exempt: white-box tests legitimately import internals the curated feature barrels don't expose.
Enforced: tooling (`no-restricted-imports` group `["./*/*", "../*/*", "@/*/*", "!../../**", "!@/*/repositories", "!@/infrastructure/database"]`; the broad `!../../**` negation exists because ESLint's matcher ignores more precise forms — so at two-plus levels up, "barrel, not file" is enforced by review; the two `@/…` negations whitelist the sub-barrels above; override disables the rule for `test/**` and legacy `src/**/*.spec.ts`). Decision history: [ADR-0008](../docs/adr/0008-runtime-safe-barrel-imports.md).

**IMP-02** — Rule: Cross-feature imports MUST use the `@/<feature>` alias, never relative `../../` paths.
Enforced: tooling + review.

**IMP-03** — Rule: Every folder has a barrel re-exporting its public members (see TOOL-03 for the nested-vs-feature-root styles). Keeping something internal to a feature is done at the **feature-root** barrel (curated named exports); nested barrels export everything in their folder. This applies to the **infrastructure layer's top barrel** (`@/infrastructure`) too: it is a curated named-export surface, not `export *`. It exposes only what feature code legitimately consumes — the composition-root modules and each integration's **gateway** (its module, its client registry, and the domain shapes the clients return) — and deliberately withholds factories, mappers, and raw wire (V3 / Prometheus) shapes, which stay internal to the integration's own barrel (`@/infrastructure/media-mtx`). The application services that operate the gateway are not infra at all: they live in the `media-nodes` feature and are consumed via `@/media-nodes` (ARCH-10).
Example: `src/infrastructure/index.ts` exports `DatabaseModule`, `MediaMtxModule`, `MediaMtxClientRegistry`, and the gateway output types (`MediaMtxStreamInfo`, `StreamDetails`, `MediaMtxMetricsSnapshot`, `MediaMtxClient`, `MediaMtxMetricsClient`, `PipelineCreateResult`) — nothing else. `MediaMtxMetricsTarget` is not here: it is assembled by the feature (`NodeResolver`), so it lives in `media-nodes`. The `media-nodes` feature-root barrel exports the four services + `ContextualMediaMtxStream`. White-box tests that need internals import them from `@/infrastructure/media-mtx` or `@/media-nodes/services` (tests are exempt from IMP-01).

**IMP-04** — Rule: Barrels are runtime cycle hazards (CJS getter re-exports only exist after their line executes). The mechanisms that keep boot safe: (a) inside a package, **runtime values** are imported via relative paths — the package's own `@/...` barrel is allowed only for type-only imports (erased at compile), and abstract repositories are referenced only via `implements`/types (also erased); (b) **cross-module wiring imports the narrowest public surface** — a composition root takes port contracts through `@/<feature>/repositories`, and feature modules take the persistence root through `@/infrastructure/database` (IMP-01, ARCH-08); a barrel that also re-exports a Nest module drags that module into the graph, so importing the sub-barrel that carries only the contract is what breaks the cycle; (c) an inherent module/provider cycle that survives (a)+(b) uses `forwardRef(() => …)` on the importing side, as a last resort. Barrel export ORDER is **not** a safety mechanism — the perfectionist lint rule sorts exports by line length, so a "module last" ordering cannot be relied on; do not write comments claiming it. Unit tests never boot `AppModule`, so violations surface only at deploy time — treat any Nest "undefined dependency" boot error as this rule's signature, and confirm with a boot DI-scan (`node dist/main.js` against an unreachable Mongo): a sound graph logs "…dependencies initialized" and fails only on the Mongo connection.
Decision history: [ADR-0008](../docs/adr/0008-runtime-safe-barrel-imports.md) (note: that ADR's "module-last" point was superseded by this rule — forwardRef + erased imports are the operative fix).
Example: `MediaMtxClientRegistry` is imported as `../../registry` inside `infrastructure/media-mtx/services/`, never as `@/infrastructure`. The tree needs no `forwardRef` at all: the barrel cycle was broken (`DatabaseModule` via the `@/infrastructure/database` sub-barrel), and the media-mtx→pods dependency that remained was inverted out entirely (ARCH-09) — `MediaMtxModule` no longer imports `PodsModule`, so there is no media-mtx↔pods module cycle left to force one.
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
- **orchestration / lifecycle** — multi-step coordination with side effects (`StreamSetupService`, `StreamPipelineService`, `SyncOrchestratorService`)
- **reaction** — responds to a produced fact, typically via `@OnEvent` (`StreamTrackAlertService`)

**SVC-02** — Rule: Selection/decision logic with a **real swappable family** — a shared abstract contract with sibling implementations selected at runtime — is a policy class behind an abstract base used as the DI token, so the algorithm is swappable. A **single** algorithm with no sibling variants is **not** a strategy: keep it a method, or, when the math is context-free, a pure function (DIR-06, PHIL-06). Placement is the case in point — neither cluster (hash-by-name) nor ingest (least-loaded) has a second variant, so both are context-free pure functions in `@/common` (`selectByHash`, `selectLeastLoaded`) that `StreamAssignmentService` gathers inputs for and calls; there is no assignment policy/token. Reach for the abstract-token strategy only when a genuine second implementation actually arrives.

**SVC-03** — Rule: Multi-step background processes are decomposed as: scheduler (`@ScheduledTask`, trivial) → context builder (a query-only service that assembles the run's typed input) → orchestrator → step services. The orchestrator injects the step services **directly** (class tokens, ARCH-07) and runs them in a fixed sequence, isolating each behind one private guard helper — `runStep(name, () => step.execute(ctx))` — that catches a per-step failure, logs it by name, and collects the failed names for the tick event, so one failing step aborts neither the others nor the emit. Each step service exposes exactly one public method (`execute(context)`); its per-item work is private. Do not introduce a shared step interface, a collected list, or a registry for a small fixed sequence — the guard is the only shared concern, and it lives once in the orchestrator, not in a strategy abstraction (the failed-step name is supplied at the call site, not carried as a field on each step).
Example: `sync/services/{scheduler,context,orchestration,workflows}/`; `SyncContextBuilderService.buildContext` produces the `SyncContext`, and `SyncOrchestratorService.runStep` guards `IngestStreamSynchronizerService`, `StreamReconcileService`, and `StreamStalenessService` in order.
Enforced: review.

**SVC-04** — Rule: When several services of one feature are consumed together by other modules, expose a facade and have outsiders depend on it only.
Example: `StreamsFacadeService` is what `sync/` imports (it needs several stream operations together). A module needing only reads may depend on the exported `StreamQueryService` directly (the alerts track ruler does). The streams module exports **only** those two; outsiders never touch `StreamCrudService`, `StreamPipelineService`, `StreamAssignmentService`, etc.

**SVC-05** — Rule: A service that delegates to another service MUST change at least one of: vocabulary/abstraction level, module boundary, exposed surface area — or carry at least one decision (guard, transformation, defaulting). If inlining the wrapper loses no concept, inline it. A pure same-module, same-vocabulary forwarder is forbidden, and a wrapper whose tests only assert "calls the delegate with the same arguments" is presumptively one. Facades and boundary gateways (SVC-04) are exempt: their value is the seam itself.

**SVC-06** — Rule: An evaluate-and-react flow is decomposed as **produce → evaluate → reconcile**. A _producer_ emits a typed data event and stays ignorant of who consumes it — it never imports the consumer, evaluates conditions, or writes the consumer's records. A consumer-side _evaluator_ reacts (`@OnEvent`) and turns the data into the set of records that _should_ exist (its desired state), declaratively via a rules-as-data table where the conditions vary (PHIL-02 / RULE-02). A _reconciler_ then diffs desired against actual, scoped by a stable key, and converges them: create what is newly desired, update what changed, remove what is no longer desired (an actual with no matching desired); an unchanged entry may be touched without re-emitting. Crossing a feature boundary is an event; staying inside one is a direct call (EVT-04). Adding a producer to an existing pipeline = data event + evaluator + desired-state mapping + scope key, with no change to the reconciler. Uniqueness of a reconciled record under concurrent cycles is a database invariant, not application logic (DATA-05).
Example: the alerts pipeline — metrics/inspection/pods _produce_ data events, rulers in `alerts/services/rulers/` _evaluate_ them into `AlertSignal[]`, and `AlertReconcileService` _reconciles_ by `(source, subject, type)`. Decision history: [ADR-0010](../docs/adr/0010-event-driven-alert-pipeline.md), [ADR-0011](../docs/adr/0011-node-resource-alerts-third-producer.md).
Enforced: review.
Example: `MetricAlertReactionService` and `MetricFailoverReactionService` were deleted under this rule — the metric workflow now calls `MetricAlertInvocationService` directly, and the cluster-only guard moved into `StreamFailoverService` where its sibling preconditions live.
Decision history: [ADR-0005](../docs/adr/0005-no-pass-through-services.md).
Enforced: review.

**SVC-07** — Rule: A leaf service (query/crud/status/assignment) owns its persistence access directly through the repository. It MAY depend on a **sibling** service only when that service carries reused _logic_ — events, multi-step orchestration, defaulting — never to borrow a thin read/write it could perform on the repository it already holds. Holding **both** the repository and a sibling data-service for overlapping access is the tell of a redundant wrap: collapse it onto the repository. (Orchestrators compose services and don't touch the repository; SVC-05 covers pure service→service forwarders.)
Example: `StreamAssignmentService` reads via `streamRepository.findByName` + inline `NotFoundException` — matching its `assignToPod`/`clearAssignment` siblings — rather than injecting `StreamQueryService` for one `findByName`+throw helper. Allowed shape: `AlertAccessService` holds `AlertRepository` for its reads but delegates `resolveAlert` to `AlertReconcileService`, because resolving emits `alert.resolved` (reused logic, not a thin call).
Enforced: review.

**SVC-08** — Rule: A value an operation *cannot correctly run without* is a **required, non-nullable parameter**, validated once at the **top of the call stack** where the missing-value case is a real branch — not threaded downward as `?: T | null` and re-checked (or silently defaulted) deep in the leaf. A nullable-and-defaulted parameter conflates two distinct situations that deserve opposite handling: a **precondition violation** (the caller has no value it was required to supply) is a bug and must throw where the fact is first known; **runtime tolerance** (a value was supplied but the world moved — a resource is gone, a node left) is expected and may fall back. Do not let one `?: T | null` stand in for both — the precondition throws, the fallback tolerates, and they live in different places. A leaf that both accepts `null` *and* rounds it into a best-effort pick hides caller bugs as silent mis-targeting. If one input's presence depends on a discriminant (a role, a kind), do not pass `(discriminant, value?)` and re-branch the discriminant inside — split into per-case methods so each carries only the inputs it genuinely needs and the value it requires is non-null.
Example: `buildClusterPullPipeline(stream, assignedPodId: string)` takes a **required** pod id (was `?: string | null`); the precondition is enforced once in `StreamPipelineService.build`, which throws `Cannot build cluster pipeline for unassigned stream ${name}` for an unassigned stream — surfacing a latent bug where `StreamReconcileService` passed a stale, un-assigned stream and the nullable design silently round-robined instead of erroring. Likewise `MediaMtxStreamStatsService` split its single `getStreamDetails(name, role, assignedPodId?)` into `getIngestStreamDetails(name)` and `getClusterStreamDetails(name, assignedPodId: string)` — no nullable, no internal role re-branch; the inspection caller (tolerant by design) turns a cluster stream that lacks an assignment into recorded `lastError`, never a wrong-node scrape. Runtime "the world moved" cases are decided deliberately, not defaulted: `NodeResolver.getClusterClientForPod(podId: string)` takes a required pod id and, when that pod is no longer in the live set, **throws** `No active cluster node for pod ${podId}` — the assigned node genuinely being gone is surfaced (the caller's deploy/sync path records it), never silently rerouted to a random node. (An earlier round-robin-over-a-static-pool fallback here was removed with the static addressing itself — ARCH-11.)
Enforced: review.

---

## 10. DATA — Data access

**DATA-01** — Rule: Each persisted entity has: an abstract repository class in `<feature>/repositories/` (the contract + DI token); and, **co-located** under `infrastructure/database/mongo/<entity>/`, a `Mongo<Entity>Repository` adapter and its `<entity>.schema.ts` (the adapter and the schema it maps are a matched pair — they change together, so they live together per DIR-10). The grouping key is the persisted entity, not the owning feature — `node-metric/` and `path-metric/` are separate folders. The shared base `MongoDomainRepository` sits flat at `infrastructure/database/mongo/` (one shared file earns no folder — DIR-08). The port→adapter binding and the `MongooseModule.forFeature` registration live in `DatabaseModule` (ARCH-08), never in the feature module.

**DATA-02** — Rule: Schemas use `@Schema({ timestamps: true })`; never hand-manage `createdAt`/`updatedAt`. Enum-typed props declare `enum: Object.values(TheEnum)`.

**DATA-03** — Rule: Repository methods are named for the domain operation, not the Mongo verb: `findUnresolvedByStreamAndType`, `upsertByPodId`, `assignToPod`, `resolveById`.

**DATA-04** — Rule: Repositories return domain-shaped documents and `null` for not-found; throwing `NotFoundException` is the service's decision, not the repository's.

**DATA-05** — Rule: A "at most one X per key" invariant that must hold under concurrent writers is enforced at the database, not in application read-then-write logic (which races: two cycles both read "absent" and both insert). Use a unique index — `partialFilterExpression` when the constraint applies to a subset (e.g. only open records) — plus an idempotent upsert whose filter _is_ the dedup key, so a losing writer collapses onto the winner instead of duplicating. The write reports whether it actually inserted so callers fire create-only side effects (events) exactly once.
Example: `AlertSchema` partial unique index on `(source, subject, type)` where `isResolved: false`, backing `MongoAlertRepository.create`'s upsert that returns `{ alert, created }`.
Enforced: tooling (DB constraint) + review.
Example: `StreamAssignmentService.assignToPod` throws when the repo returns null.

**DATA-06** — Rule: Mapping is asymmetric and deliberate. The **read side** maps every persisted document to the domain shape through the base class's abstract `toDomain` hook (`MongoDomainRepository.toDomain`/`toDomainList`/`toOptionalDomain`/`fromDocument`); `toDomain` **enumerates fields explicitly** rather than spreading the lean doc, because that enumeration is what strips Mongo metadata (`_id`, `__v`, unwanted timestamps) from the boundary — a `{ ...raw }` shortcut leaks persistence internals into the domain. The **write side** passes domain-shaped partials straight into the model/`$set`; there is **no pass-through `toPersistence` seam** (a mapper that only shallow-copies is YAGNI misdirection — omit it). Introduce a write-side mapper only when a field genuinely differs between domain and storage representation.
Example: `MongoNodeMetricRepository.toDomain` lists all 10 fields even though they match 1:1 — that is the boundary, not boilerplate. `MongoStreamRepository` write methods pass `data` directly to `$set` with no `toPersistence`.
Enforced: review.

---

## 11. INT — External integration (MediaMTX pattern)

**INT-01** — Rule: Integrations are two-layered, and the two layers sit in **different architectural layers** (ARCH-10). **Client** (`.client.ts`): owns the HTTP instance and raw endpoint calls, maps raw payloads to typed domain shapes at the boundary, propagates errors, zero business logic — lives in the `infrastructure/<system>/` gateway. **Service**: orchestrates clients, owns fallbacks, error isolation, and domain decisions — lives in the consuming **feature**, not under `infrastructure/`. A service never touches a raw wire shape or a mapper: the client already returned a domain shape.
Example: `MediaMtxClient` (gateway) vs `MediaMtxPipelineService` (in `media-nodes`; 409 → already-exists is service logic).

**INT-02** — Rule: Client instances are created only through a caching factory (one factory per client kind, symmetrically) and selected/pooled only through the registry. A service never news-up or privately caches a client — it depends on the factory. No `axios.create` outside `media-mtx.client.ts`.
Example: `MediaMtxClientFactory` (caches `MediaMtxClient` per base URL) and its mirror `MediaMtxMetricsClientFactory` (caches `MediaMtxMetricsClient` per URL) — both `extends CachingClientFactory<T>` so the cache + get-or-create lives once, subclass only supplies `create` (PHIL-07). Both factories are held by the gateway `MediaMtxClientRegistry`, which vends a control or metrics client for a given node host + role (`getClient(host, role)` / `getMetricsClient(host, role)`) — addressless, no pooling or fallback of its own (ARCH-11); the `media-nodes` feature resolves which hosts are live and assembles fan-out/round-robin/scrape-target sets. Features inject the registry, never a factory. URL construction (`authPrefix`/`buildNodeUrl`) lives once in `mappers/media-mtx-url.util.ts`, used only inside the gateway.

**INT-03** — Rule: Fan-out calls across multiple nodes MUST isolate per-node failures so one dead node doesn't poison the aggregate.
Example: `StreamCollectionService.collectFromClients` catches and logs per client, returns `[]` for the failed node.

**INT-04** — Rule: Raw API shapes (`V3PathItem`, `V3TrackItem`, `V3PathSource`, `PrometheusSample`) never leave the gateway `infrastructure/media-mtx/`. The **client** maps them to domain shapes (`MediaMtxStreamInfo`, `StreamDetails`, `MediaMtxMetricsSnapshot`) at the boundary via `.mapper.ts` files — every client method returns a domain shape, so mappers stay gateway-internal and the `media-nodes` services that call the client never touch a raw shape or a mapper (ARCH-10). Enforced structurally: the curated `@/infrastructure` barrel (IMP-03) re-exports the domain shapes but not the raw ones, so feature code cannot name a `V3PathItem`.
Example: `MediaMtxClient.getStreamDetails` returns `StreamDetails` (maps the V3 path item inside the client); `MediaMtxMetricsClient.fetchSnapshot` returns a `MediaMtxMetricsSnapshot` (parses + maps the Prometheus text inside the client). `V3PathItem` is reachable only from inside `@/infrastructure/media-mtx`.

**INT-05** — Rule: V3 track interpretation happens in exactly one place: the `mappers/` folder of `infrastructure/media-mtx/`, driven by the `TRACK_FIELD_MAP` table (which V3 fields each `TrackType` carries into the domain `StreamTrack`). Supporting a new track type = add the `TrackType` enum member + one table row; never add a parser class or a type switch. Unknown track types are dropped by the mapper.
Example: `track-field-map.const.ts` + `map-v3-track-to-stream-track.mapper.ts`; covered by `test/infrastructure/media-mtx/mappers/`, including a completeness test that every `TrackType` has a field-map row.
Decision history: [ADR-0003](../docs/adr/0003-data-driven-track-parsing.md).
Enforced: tests.

**INT-06** — Rule: A cluster MediaMTX stream lives on exactly the node it was **assigned to** — so any single-node operation against it (create pipeline, fetch stream details) MUST target that node's host, never a pick over the pool, which would hit a sibling replica and 404. The `media-nodes` service is handed the role + pod id (`buildClusterPullPipeline(name, assignedPodId, pullSource)`, `getStreamDetails(role, name, podId)`) and resolves it to a client via `NodeResolver.clientForPod(role, podId)`, which finds that pod in the **live** set and throws when it is gone (ARCH-11) — no static-pool or round-robin fallback masks a missing node. Fan-out operations (delete, list) still sweep every active node. The cluster relay's pull source is resolved once by the caller (`StreamPipelineService.build`): an ingest-origin stream pulls from its `ingestPod` via `NodeResolver.getIngestRtspUrl(ingestPodId, name)` (ADR-0013; the retired `${INGEST_RTSP_URL}` front is gone), any other stream uses its stored pullable source — the leaf `buildClusterPullPipeline` takes the resolved URL, never a nullable id (SVC-08). The same per-node addressing now applies to **ingest**: a stream is reserved on and published to one specific ingest node (INT-06 extends to ingest), placed least-loaded by `IngestPlacementService` (context-free `selectLeastLoaded`) at reserve time (`StreamReservationService`). Cluster assignment persists (`StreamAssignmentService.ensureAssigned` mutates an existing stream's `assignedPod`); ingest placement does not get its own persist step — it is a birth-time input folded into the `createReservation` insert, so it lives in the reserve/placement services, not the assignment service.
Example: `media-nodes/services/{pipeline,stats,topology}`; `NodeResolver.getClusterClientForPod(podId)` resolves the assigned host from live pods (throws if absent) while `getActiveClusterClients()` returns the fan-out set (empty if none live); covered by `test/media-nodes/services/pipeline` and the pod-threading test in `test/stream-inspection`.
Decision history: [ADR-0009](../docs/adr/0009-pod-derived-cluster-topology.md), [ADR-0013](../docs/adr/0013-reserve-publish-ingest-cluster.md).
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
Example: `MetricCollectionService.collectMetrics`, `StreamInspectionCollectionService.inspectAllStreams`, `SyncSchedulerService.periodicSync`.

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

**CFG-03** — Rule: `ConfigService` getters return **plain, parsed data** — a string, a number, a list (split a CSV via `.split(",").map(trim).filter(Boolean)`, as `pullableSourceProtocols` does). They do not build derived runtime objects (a compiled `RegExp`, a `URL`, a client). Any per-value parsing a getter does must be cheap enough to run on every read, since getters are stateless and re-read `process.env`. When a config value must become an expensive derived object, the **consumer** builds it **once at construction** (the DI singleton's constructor = startup) from the getter's plain data, and holds it as a `readonly` field — never rebuilds it per call.
Example: `PULLABLE_SOURCE_PROTOCOLS` is exposed as `config.pullableSourceProtocols: string[]`; `MediaMtxPipelineService` compiles it into a single `RegExp` (`^(<proto>|…)://`, escaped) in its constructor and reuses that field — extensible via `.env`, compiled once, never per stream.

## 17. TEST — Testing

**TEST-01** — Rule: Tests live in the top-level `test/` directory, mirroring the `src/` path of the unit under test exactly.
Example: `src/streams/services/assignment/hash-stream-assignment.policy.ts` → `test/streams/services/assignment/hash-stream-assignment.policy.test.ts`.

**TEST-02** — Rule: Naming: `<name>.test.ts` for unit tests, `<name>.spec.ts` for integration tests. Jest picks up both (`testRegex`).

**TEST-03** — Rule: Co-located `.spec.ts` in `src/` is legacy; migrate on touch. (None remain in `src/`.)

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

**DEVN-06** — `npm run barrels:generate` (barrelsby `--delete --location all`) overwrites the curated feature-root barrels with broken self-referential output (`export * from "./index"`), so it cannot be run over the whole tree (blocks the original intent of TOOL-03). Until the script is fixed or scoped to nested folders, barrels are maintained by hand per TOOL-03.

**DEVN-07** — DIR-10 is satisfied by `alerts/`, `pods/`, `streams/`, and now `infrastructure/media-mtx/types/` (split into `v3/`, `stream/`, `metrics/` + flat shapes; the old 5-shape `media-mtx.types.ts` is gone). Remaining packers: `common/domain/types/event-payloads.types.ts` (3), plus several two-shape files. Apply DIR-10 on touch.

---

**Last regenerated from code**: July 2026 (branch `feature/scary-refactor`)
**Scope**: `backend/` only
