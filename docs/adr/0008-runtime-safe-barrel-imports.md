# ADR-0008: Runtime-safe barrel imports (module-last barrels, no self-barrel value imports)

- **Status**: Accepted
- **Date**: 2026-06-13
- **Related rules**: IMP-01, IMP-04, ARCH-04, TOOL-03

## Context

The first real deployment attempt revealed that the application **could not
boot at all** — `nest start`/`node dist/main` died during module scan, while
`npm run verify` (typecheck, lint, build, 169 unit tests) was fully green.
Unit tests assemble `TestingModule`s and never evaluate `AppModule`, so
runtime import-cycle bugs were invisible.

Three compounding causes, all rooted in barrels compiling to CommonJS getter
re-exports that only exist once their barrel line has executed:

1. `MediaMtxModule` imported `PodsModule` while `pods.module.ts` imported
   schema/repository classes from `@/infrastructure` — a value cycle that left
   `PodsModule` `undefined` in the imports array at scan time.
2. Files inside `infrastructure/` imported runtime values (e.g.
   `MediaMtxClientRegistry`) from their **own** `@/infrastructure` barrel.
   When evaluation entered infrastructure through another feature, the barrel
   was mid-evaluation and the DI parameter metadata captured `undefined`.
3. Curated feature-root barrels exported the **module first**, so cyclic
   re-entry during module evaluation could not resolve the feature's services
   (`PodQueryService` was `undefined` exactly when the cycle needed it).

## Decision

- Curated feature-root barrels list leaf exports (services, repositories,
  types) first and the **module export last**.
- Inside a package (a feature or an infrastructure sub-module), imports of
  **runtime values** use relative paths; the package's own `@/...` barrel may
  only be used for type-only imports (erased at compile).
- Where a genuine module-level cycle is inherent to the layout
  (`MediaMtxModule` needs `PodsModule` for `PodQueryService`, while pods needs
  infrastructure for its Mongo repository), the importing side uses
  `forwardRef(() => Module)`.
- The lint deep-import group becomes `["./*/*", "../*/*", "@/*/*", "!../../**"]`:
  ESLint's matcher silently ignored more precise `!../../../x` negations, so
  ancestor paths two-plus levels up are tooling-unrestricted and the
  "barrel, not file" expectation at that depth is enforced by review.

## Consequences

- The application boots; this was verified by an actual compose deployment
  plus an end-to-end API smoke test, not by the unit-test gate.
- `forwardRef` now appears twice in the codebase (ARCH-04 updated); both are
  consequences of hosting all Mongo repositories in `infrastructure/` — a
  future ADR could revisit that placement to remove the cycles outright.
- Known residual risk: nothing in CI boots `AppModule`, so a new cycle would
  again surface only at deploy time. A boot smoke test (e.g. a jest e2e that
  compiles `AppModule` with mocked Mongo connection, or a compose healthcheck
  gate) is the obvious follow-up.
- Rejected: converting the build to ESM (larger blast radius than the layout
  discipline); abandoning barrels (gives up the curated public surfaces from
  ADR-0004).
