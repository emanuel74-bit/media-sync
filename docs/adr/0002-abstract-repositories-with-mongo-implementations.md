# ADR-0002: Abstract repositories in features, Mongo implementations in infrastructure

- **Status**: Accepted
- **Date**: 2026-06-12 (backfilled — decision predates the ADR process)
- **Related rules**: DATA-01, DATA-04, NAME-06, ARCH-02

## Context

Services originally injected Mongoose models directly, coupling business logic
to persistence details and making unit tests depend on Mongoose document
behavior. The codebase needed a seam where persistence could be mocked
trivially and swapped without touching features.

## Decision

We will give each persisted entity an abstract repository class in its
feature's `repositories/` folder, used as both contract and NestJS DI token. A
concrete `Mongo<Entity>Repository` plus the Mongoose schema live in
`backend/src/infrastructure/database/`. Modules bind
`{ provide: <Entity>Repository, useClass: Mongo<Entity>Repository }`. Repository
methods are named for domain operations (`findUnresolvedByStreamAndType`,
`upsertByPodId`) and return `null` for not-found; HTTP error semantics belong
to services.

## Consequences

- Service unit tests mock a small typed contract; no Mongoose in test setup.
- Persistence technology is replaceable per entity without feature changes.
- Cost: one extra class per entity and DI wiring per module.
- One known wart: `StreamInspectionRecorderService` injects its repository via
  `forwardRef` (tracked as DEVN-04 in CONVENTIONS.md).
