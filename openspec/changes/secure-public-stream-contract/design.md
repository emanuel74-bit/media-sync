## Context

`Stream` is the Streams feature's internal domain and persistence shape. It contains the
per-reservation `publishToken` needed by `PublishAuthService`, and
`MongoStreamRepository.toDomain` deliberately maps that field from Mongo. The general
`StreamsController` currently returns those domain objects unchanged for list, single-stream,
create, update, assign, and unassign operations. A reserved record can therefore expose its secret
through an API that is not the credential-delivery API.

ADR-0013 separately requires `IngestController` to return a `StreamReservation` whose
`publishToken` is also embedded in `publishUrl`. That response is intentional and must remain
distinct from the general stream representation. The frontend currently obscures the distinction
by including `publishToken` on both `Stream` and `StreamReservation`, and lifecycle rendering uses
token presence as a proxy for the reserved-stage timestamp.

This is a public-contract and security-boundary change spanning backend transport, frontend types
and presentation, tests, and architecture/API documentation. It is governed by `ARCH-01`,
`DATA-06`, `SVC-05`, `NAME-02`, `NAME-03`, `TYPE-02`, `TYPE-03`, `DTO-02`, `TEST-01`, `TEST-02`,
`TEST-05`, `TEST-06`, `DOC-01`, `DOC-03`, `DOC-05`, and `DOC-06`.

## Goals / Non-Goals

**Goals:**

- Give every general Streams endpoint one explicit, credential-free response shape.
- Preserve the internal `Stream` record and ADR-0013 reservation/authentication flow unchanged.
- Preserve list and not-found semantics while making redaction independent of stream status.
- Make frontend general-stream and reservation contracts reflect the credential boundary.
- Prove the safe general contract and the intentional reservation exception at focused test seams.
- Record the public-contract decision in ADR-0021 and update the affected API, feature, and
  subsystem documentation.

**Non-Goals:**

- Changing token generation, persistence, expiry, comparison, or publish authorization.
- Changing ingest placement, stream lifecycle transitions, event payloads, configuration,
  database schemas, dependencies, or deployment topology.
- Introducing a generic serialization framework or a repository-wide response abstraction.

## Decisions

### 1. Project general stream responses at the controller boundary

Add a framework-free `PublicStream` shape in
`backend/src/streams/domain/types/public-stream.types.ts`, following `TYPE-03`, `NAME-03`, and the
one-shape-per-file rule. It enumerates the safe stream fields and has no `publishToken` member. It
does not replace or narrow the internal `Stream` type.

Add the pure `mapStreamToPublicStream` shape transformer as
`backend/src/streams/controllers/map-stream-to-public-stream.mapper.ts`. Co-location with
`StreamsController` makes ownership by the HTTP boundary explicit; the `.mapper.ts` suffix follows
`NAME-02`. The mapper will enumerate every returned property instead of spreading the domain
object or relying on a type-only `Omit`. This applies the explicit-boundary principle of `DATA-06`
to the domain-to-transport edge and makes future additions fail closed until deliberately added to
the public shape.

Each affected controller method will await exactly one existing service call and project its
result. Mapping is I/O shaping, not business logic, so the controller retains the `ARCH-01`
dependency direction:

```text
StreamsController -> existing Streams service -> Stream domain/repository
        |
        +-> pure Stream-to-PublicStream mapper
```

The list maps each element and preserves `[]`. The single lookup preserves `null` rather than
manufacturing an object or changing not-found behavior. Create, update, assign, and unassign map
the service-returned `Stream`. `GET /api/streams/assignment` already returns
`StreamAssignmentInfo`, and delete returns no body, so neither enters this projection.

`IngestController` continues returning `StreamReservation` directly. The mapper is not global and
is never applied to that endpoint, so both the token and its credential-bearing URL remain
available to the publisher as required by ADR-0013.

Alternatives considered:

- **Repository or domain redaction:** rejected because `publishToken` is valid internal state used
  by publish authorization. Removing it in `MongoStreamRepository.toDomain`, `Stream`, or query
  services would break that behavior and misuse the persistence-to-domain mapping seam described
  by `DATA-06`.
- **Redaction inside existing services:** rejected because those services are also domain and
  cross-feature boundaries. Returning a transport shape would reverse the intended dependency and
  conflict with `DTO-02`/`TYPE-03`.
- **Dedicated projection service:** it could satisfy `SVC-05` by transforming data, but it would add
  injection and a second orchestration surface for a pure, local shape conversion. A pure mapper is
  the smaller established abstraction.
- **Global serializer/interceptor:** rejected because implicit, application-wide exclusion makes
  the ADR-0013 reservation exception fragile and broadens the change beyond Streams. It would also
  hide the public contract behind runtime metadata rather than an explicit return type.
- **Inline destructuring or object spread in the controller:** rejected because type erasure is not
  a security boundary and spread would automatically expose future internal fields. An intent-named
  mapper is the `NAME-02` shape-transformer pattern and keeps controller methods concise.

### 2. Keep credentials in the internal and reservation models only

The backend `Stream`, Mongo schema/repository mapping, reservation creation, and publish auth keep
`publishToken`. `StreamReservation` also remains unchanged. The public mapper is a read-only
projection and cannot mutate its input; therefore redaction does not clear or rotate persisted
credentials and does not alter error behavior.

The frontend removes `publishToken` from `Stream` and from general-stream fixtures. It retains the
required field on `StreamReservation`, and the reservation API mock/test continues to return and
assert both the token and the URL containing that credential. No runtime response sanitizer is
added to the frontend because the server owns the security boundary; the frontend type records the
contract and prevents accidental general-stream use of the secret.

### 3. Derive the reserved-stage timestamp from non-secret state

For the reserved lifecycle stage, `stageTimestamp` returns `updatedAt` when
`stream.status === "reserved"`; if `updatedAt` is absent it falls back to `createdAt`; if both are
absent it returns `undefined`. For any non-reserved stream it returns `undefined` for the reserved
stage. This preserves the current best-effort character of lifecycle timestamps while removing
credential presence as state evidence.

### 4. Verify both sides of the credential boundary

Extend `backend/test/streams/controllers/streams.controller.test.ts` (`TEST-01`, `TEST-02`) with
token-bearing domain fixtures and assertions for list, single, create, update, assign, and unassign
responses, plus empty-list and `null` preservation. These controller tests verify the exact
delegation-and-projection seam required by `TEST-05` without altering service mocks or sharing
mutable state (`TEST-06`). Add a mirrored controller test for `IngestController` to prove its
reservation result retains both credentials.

Frontend tests will assert that reservation parsing retains the credential fields and that
reserved-stage timestamp selection follows the status/`updatedAt`/`createdAt` fallback. Existing
fixtures and mocks will be brought into agreement with the two distinct types.

### 5. Record and document the boundary without revising ADR-0013

Create append-only ADR-0021 for the public projection and explicit reservation exception, as
required by `DOC-01` and `DOC-03`. It complements ADR-0013: ADR-0013 continues to own reservation
secret generation, persistence, credential-bearing URL delivery, and publish authorization;
ADR-0021 owns where that secret may cross the general REST boundary.

Update `backend/API_DOCUMENTATION.md`, `docs/features/streams.md`, and
`docs/subsystems/stream-reservation-and-publication.md`, including evidence links and refreshed
`last_verified` dates under `DOC-06`. No convention amendment or superseding ADR is required.

## Risks / Trade-offs

- **[A safe field is omitted from the public response during future domain growth]** -> Explicit
  enumeration fails closed; controller contract tests and documentation make intentional additions
  straightforward.
- **[A new general endpoint returns `Stream` without applying the mapper]** -> Keep the mapper at
  the controller boundary and test every stream-returning controller method; ADR-0021 establishes
  the review rule for future endpoints.
- **[A caller relied on the accidental general-endpoint token]** -> Treat removal as a deliberate
  breaking change and direct publishers to retain credentials from `POST /api/ingest/streams`.
- **[Backend and frontend deploy at different times]** -> Removing a response field is safe for the
  updated frontend, but backend and frontend contract changes should still ship together and pass
  their focused tests before rollout.
- **[Controller mapping is mistaken for business logic]** -> Keep it pure, framework-free, and
  limited to output enumeration; all lifecycle and credential decisions remain in existing
  services.

## Migration Plan

1. Add ADR-0021, the public response type/mapper, and focused tests while leaving persistence and
   reservation behavior intact.
2. Route all six general stream-returning controller methods through the mapper and update the
   frontend types, lifecycle helper, mocks, and tests in the same release.
3. Update the API, Streams feature, and reservation/publication subsystem documentation and run
   focused checks, `npm run verify:change -- secure-public-stream-contract`, root `npm run verify`,
   and `openspec validate --all` through the accepted workflow.
4. Roll back by reverting the controller projection and frontend type/lifecycle changes together;
   no data rollback is needed because stored tokens and schemas never change. Such a rollback
   deliberately restores the prior exposure and should be used only while a safer forward fix is
   prepared.

## Open Questions

None. The public field matrix, reservation exception, timestamp fallback, documentation scope, and
ADR relationship are fixed by this design.
