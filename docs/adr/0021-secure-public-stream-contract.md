# ADR-0021: Project general stream responses without publish credentials

- **Status**: Accepted
- **Date**: 2026-08-14
- **Related rules**: ARCH-01, DATA-06, DOC-01, DOC-03, DTO-02, NAME-02, TYPE-03,
  TEST-05

## Context

The persisted `Stream` domain record contains an opaque `publishToken`. Reservation creation and
publish authorization need that secret internally, but the general Streams controller returned
domain records directly for list, single-stream, create, update, assignment, and unassignment
requests. A reserved record could therefore expose its publish credential through endpoints that
were not intended to deliver credentials.

[ADR-0013](0013-reserve-publish-ingest-cluster.md) deliberately established one different public
boundary: `POST /api/ingest/streams` returns a `StreamReservation` containing both the token and a
publish URL embedding the same token. Publishers need that response to connect directly to the
selected ingest node, so globally suppressing the field would break the reserve-to-publish flow.

## Decision

We will return an explicitly enumerated, credential-free `PublicStream` from every general Streams
endpoint that returns a stream. `StreamsController` will apply a pure, controller-bound
`mapStreamToPublicStream` mapper after one existing service call. The mapper lists every allowed
field and never spreads the internal object, so newly added internal fields remain private until
the public contract deliberately adopts them.

The internal `Stream`, Mongo mapping, reservation creation, and publish authorization keep
`publishToken` unchanged. `IngestController` will continue returning `StreamReservation` directly;
`POST /api/ingest/streams` remains the sole stream API response that intentionally delivers the
token and its credential-bearing URL. This decision complements ADR-0013 and does not supersede
any part of it.

The frontend will mirror the boundary: its general `Stream` type has no `publishToken`, its
`StreamReservation` type retains the field, and lifecycle presentation derives reserved-stage
timestamps from status and non-secret timestamps rather than credential presence. The observable
contract is defined by the
[`public-stream-contract` specification](../../openspec/specs/public-stream-contract/spec.md).

## Consequences

- General list, lookup, create, update, assign, and unassign responses cannot expose the persisted
  publish secret, including for reserved streams.
- The change is intentionally breaking for clients that read the accidental token from a general
  endpoint. Publishers must retain credentials returned by `POST /api/ingest/streams`.
- Explicit projection fails closed when the internal domain grows, at the cost of updating the
  public type, mapper, tests, and documentation when a new field is intentionally exposed.
- Empty-list, missing-stream, service error, persistence, token expiry, and publish-auth behavior
  remain unchanged.
- A repository/domain redaction was rejected because internal authorization needs the token. A
  global serializer was rejected because it would make ADR-0013's intentional exception implicit
  and fragile. Type-only `Omit` and object spread were rejected because neither is a runtime
  security boundary.
