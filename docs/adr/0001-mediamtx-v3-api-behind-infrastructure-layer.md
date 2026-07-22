# ADR-0001: Talk to MediaMTX via its v3 API behind a dedicated infrastructure layer

- **Status**: Accepted
- **Date**: 2026-06-12 (backfilled — decision predates the ADR process)
- **Related rules**: ARCH-03, INT-01, INT-02, INT-04

## Context

Early versions of the backend assumed invented MediaMTX endpoints
(`/api/streams`, `/api/stream-pipelines`) and scattered axios calls through
feature code. MediaMTX's real HTTP surface is the v3 API (`/v3/paths/list`,
`/v3/paths/get/{name}`, `/v3/config/paths/add|remove/{name}`), whose raw shapes
(`V3PathItem`, `V3TrackItem`) are verbose, partially optional, and subject to
change with MediaMTX releases.

## Decision

We will integrate against the real MediaMTX v3 API, and all MediaMTX
communication lives in `backend/src/infrastructure/media-mtx/`:

- `MediaMtxClient` (one axios instance per node URL) performs raw calls only.
- `MediaMtxClientFactory` caches clients per URL; `MediaMtxClientRegistry`
  owns the ingest client and the cluster pool with round-robin selection.
- Services (`listing/`, `pipeline/`, `stats/`) own fallbacks, fan-out error
  isolation, and domain decisions.
- Raw v3 shapes never leave the integration: mappers convert them to domain
  shapes (`MediaMtxStreamInfo`, `StreamDetails`, `StreamTrack`) at the boundary.

## Consequences

- A MediaMTX version bump touches one folder; feature code is insulated.
- Feature tests mock small domain-typed services instead of HTTP.
- The v3 path API exposes no bitrate/fps/latency stats, so metric values
  default to 0 until real stat extraction is built (documented limitation in
  SYSTEM_DOCUMENTATION.md; affects alerting and failover).
- Rejected: per-feature HTTP calls (couples features to MediaMTX's API shape);
  a generated OpenAPI client (MediaMTX's spec drift made the thin hand-rolled
  client cheaper to keep honest).
