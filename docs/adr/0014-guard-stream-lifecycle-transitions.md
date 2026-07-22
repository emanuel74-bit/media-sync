# ADR-0014: Guard stream lifecycle transitions atomically

- **Status**: Accepted
- **Date**: 2026-07-22
- **Related rules**: SVC-07, DATA-03, DATA-07

## Context

Stream status was writable through several independent paths: discovery upserts, assignment
writes, status helpers, and the generic update endpoint. Those writes had no shared transition
rules and used unconditional updates. A periodic MediaMTX observation could therefore persist
its wire state (`ready` or `inactive`) as though it were a domain lifecycle state, or overwrite a
newer `assigned` or `synced` state after a concurrent worker advanced the stream.

Schema enum validation is not sufficient. It rejects unknown values only when update validation
is enabled, and it cannot determine whether a valid enum value is a legal move from the current
state. A read-then-write check alone also races with other sync workers.

## Decision

We will treat `StreamStatusService` as the single authority for changes to persisted stream
lifecycle state.

- Legal moves are declared in one `STREAM_STATUS_TRANSITIONS` table. Re-applying the current
  state is idempotent.
- The repository applies a transition with a compare-and-set filter on stream name and expected
  current status. The service retries once against the winning state or returns a conflict for an
  illegal move.
- Birth states remain owned by their create flows: manual streams start `created`, and ingest
  reservations start `reserved`.
- MediaMTX observation state is transport data, not lifecycle data. Discovery creates new records
  as `discovered`, moves only `reserved` or `stale` records to `discovered`, and otherwise
  refreshes observation fields without writing status. Discovery also normalizes legacy records
  that already contain a MediaMTX wire value such as `ready`.
- Assignment and the generic status update endpoint delegate lifecycle writes to the authority.

## Consequences

Concurrent sync workers cannot silently regress a newer lifecycle state, and values outside
`StreamStatus` no longer leak from MediaMTX into persisted records. Invalid API-requested jumps
now return HTTP 409 instead of being accepted.

Adding a new state requires updating the enum and transition table together. Callers must decide
the intended lifecycle move rather than performing an arbitrary status write. This is more
explicit than unconditional repository updates, but it gives tests and operators one auditable
state machine.

Rejected alternatives were relying only on Mongoose enum validation, which cannot enforce
transition legality, and validating with a separate read followed by an unconditional write,
which remains vulnerable to concurrent workers.
