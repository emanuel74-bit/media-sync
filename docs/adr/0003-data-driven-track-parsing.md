# ADR-0003: Parse media tracks via a field-map table, not parser strategies

- **Status**: Accepted
- **Date**: 2026-06-12
- **Related rules**: PHIL-02, INT-04, INT-05, DIR-06

## Context

Stream inspection parsed MediaMTX v3 tracks through four "strategy" classes
(video/audio/data/subtitle) selected by a hard-coded `switch` in a util file,
inside the `stream-inspection` feature. The classes shared no contract, the
switch had to be edited for every new track type (OCP failure), raw
`V3PathItem`/`V3TrackItem` shapes leaked into feature code, and track
interpretation existed twice (discovery mapper + inspection parsers).

## Decision

We will treat track parsing as data, not behavior: a single
`TRACK_FIELD_MAP` table (`TrackType` → list of copyable fields) drives one pure
mapper in `infrastructure/media-mtx/mappers/`. `getStreamDetails` returns a
domain `StreamDetails`; raw v3 shapes never leave infrastructure. Supporting a
new track type = one enum member + one table row. Unknown track types are
dropped by the mapper.

Real strategy classes behind an abstract DI token (the `SYNC_WORKFLOWS`
pattern) remain the right shape **if** per-type parsing ever needs logic beyond
field selection — that was considered and deferred as speculative.

## Consequences

- ~80 lines and four variant folders deleted; one place interprets v3 tracks.
- A completeness test asserts every `TrackType` has a field-map row.
- If per-type logic appears later, the table converts to strategies in one
  contained refactor (the seam — `mapV3TrackToStreamTrack` — already exists).
- Rejected: keeping pseudo-strategies (ceremony without a contract or DI);
  full strategy+registry now (no behavioral variation exists to justify it).
