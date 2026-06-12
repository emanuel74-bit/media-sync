# ADR-0004: Curated feature-root barrels, wildcard nested barrels

- **Status**: Accepted
- **Date**: 2026-06-12
- **Related rules**: TOOL-03, IMP-01, IMP-03, PHIL-05; deviation DEVN-06

## Context

The repo uses barrels (`index.ts`) everywhere, with an ESLint rule forbidding
deep file imports. Two needs conflict: nested folders want zero-maintenance
wildcard barrels, while feature roots want a *curated* public surface so other
modules can only reach what a feature intentionally exposes (e.g. `@/streams`
exposes the facade, not `StreamCrudService`). The bundled generator
(`npm run barrels:generate`, barrelsby `--delete --location all`) turned out to
destroy curated root barrels, emitting self-referential `export * from
"./index"`.

## Decision

We will maintain two barrel styles deliberately:

- **Nested folder barrels**: wildcard `export * from "./..."` lines, barrelsby
  style, exporting everything in the folder.
- **Feature-root barrels** (`src/<feature>/index.ts`): hand-curated named
  exports (`export { X } from "./services"`, `export type { Y } from
  "./domain"`) that define the feature's public API.

`barrels:generate` must not be run over the whole tree until fixed (DEVN-06).
The ESLint deep-import rule carries explicit `!`-negations for ancestor layer
barrels (`../../domain`, `../../types`, `../../clients`, `../../mappers`,
`../../repositories`) — those are folder barrels, which is what the rule wants
— and is disabled for `test/**`, where white-box tests legitimately import
internals the curated barrels hide.

## Consequences

- Feature encapsulation is enforced at the import surface, not by convention.
- Adding a file means updating the affected barrels by hand (small, local).
- The broken generator is quarantined rather than trusted; fixing or scoping
  it would let nested barrels regenerate automatically again.
- Rejected: wildcard barrels everywhere (gives up curated public surfaces);
  removing barrels entirely (deep imports everywhere, no encapsulation seam).
