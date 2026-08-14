## Why

The persisted `Stream` domain record intentionally contains a `publishToken`, but the general
Streams controller currently returns domain objects directly, so reserved-stream secrets can be
exposed through ordinary query and mutation responses. The public contract needs an explicit
credential boundary while preserving the one intentional secret-delivery response established by
ADR-0013.

## What Changes

- **BREAKING**: Define general stream responses from query, create, update, assignment, and
  unassignment endpoints so they never contain the persisted `publishToken`, including when the
  underlying stream is reserved.
- Preserve `POST /api/ingest/streams` as the credential-delivery boundary: its reservation response
  continues to contain both `publishToken` and the credential-bearing `publishUrl` required by
  ADR-0013.
- Remove `publishToken` from the frontend's general `Stream` contract while retaining it on the
  distinct `StreamReservation` contract.
- Stop using secret presence as the frontend lifecycle timestamp signal; reservation lifecycle
  rendering will use non-secret stream state/timestamps instead.
- Add backend and frontend contract tests that prove both general-response redaction and intentional
  one-time reservation credential delivery.
- Update `backend/API_DOCUMENTATION.md`, `docs/features/streams.md`, and
  `docs/subsystems/stream-reservation-and-publication.md` in the same change, as required by
  `DOC-06`.

Scope is limited to public stream response shaping, the corresponding frontend contracts and
lifecycle presentation, tests, and directly affected documentation. Persisted reservation state,
publish authorization, token generation/expiry, ingest placement, events, schemas, configuration,
and deployment topology are non-goals.

## Capabilities

### New Capabilities

- `public-stream-contract`: Defines the credential-safe general stream representation and the
  separate reservation response that intentionally delivers publish credentials.

### Modified Capabilities

None. The existing `architecture-documentation-governance` and `local-agent-workflow`
specifications remain unchanged; this change satisfies their process/documentation obligations but
does not alter their requirements.

## Impact

- **Verified current behavior:** `StreamsController` returns persisted `Stream` domain objects for
  `GET /api/streams`, `GET /api/streams/:name`, `POST /api/streams`, `PATCH /api/streams/:name`,
  `PATCH /api/streams/:name/assign`, and `PATCH /api/streams/:name/unassign`; that domain shape has
  optional `publishToken`. The frontend mirrors the field on `Stream`, and its reserved-stage
  timestamp currently depends on token presence. `POST /api/ingest/streams` separately returns a
  `StreamReservation` containing `publishToken` and a credential-bearing `publishUrl`.
- **Proposed behavior:** every general stream response uses a credential-free public shape, while
  only the reservation response retains secret delivery. The internal domain, repository, Mongo
  schema, and publish-auth service continue to retain and consume the token.
- **Affected surfaces:** backend Streams REST response types/mapping and controller contract tests;
  frontend `Stream`/`StreamReservation` types, lifecycle logic, mocks, and tests; API, Streams
  feature, and reservation/publication subsystem documentation. No event payload, database,
  environment variable, dependency, or deployment change is proposed.
- **Compatibility and rollout:** clients that read `publishToken` from a general Streams endpoint
  must instead retain it from the reservation response, making the general-response removal an
  intentional compatibility break. Backend and frontend contract changes should ship together.
  No data migration is required. Rollback can restore the previous public projection and frontend
  field without changing persisted records, though doing so reopens the secret-exposure risk.
- **Governance:** applicable rules include `TOOL-01`, `TOOL-02`, `TOOL-05`, `TOOL-09`, `DATA-06`,
  `TEST-01`, `TEST-02`, `TEST-05`, `TEST-06`, `DOC-01`, `DOC-03`, `DOC-05`, and `DOC-06`.
  Because this deliberately changes a public API contract, `DOC-01` requires a new append-only ADR;
  it should complement, not supersede, ADR-0013's reserve→publish credential-delivery decision.
