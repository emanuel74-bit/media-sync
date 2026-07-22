# ADR-0013: Reserve→publish ingestion on a per-node ingest cluster

- **Status**: Accepted
- **Date**: 2026-07-16
- **Related rules**: ARCH-11, INT-06, SVC-02, DATA-05

## Context

Ingest was a single logical MediaMTX endpoint. Streams appeared on it (published
out-of-band), the sync loop discovered them, assigned each to a **cluster** pod,
and the cluster relayed by pulling from one stable ingest front
(`INGEST_RTSP_URL`) — the deliberate ARCH-11 "stable shared endpoint" exception.
Two things were missing:

1. **Ingest could not scale horizontally.** One front meant one node's capacity.
   We want a *cluster* of ingest MediaMTX nodes running on VMs — and because a VM
   can host several nodes, a node is identified by host **and port**, not host
   alone.
2. **There was no API to publish a stream.** A publisher had to already know a
   reachable ingest URL and a path name, with nothing load-balancing across nodes
   and nothing authorizing the publish.

Making ingest a cluster makes it **symmetric to the cluster tier**: a published
stream now lives on one *specific* ingest node, so it must be addressed per-node
(the pod registry), exactly as an assigned cluster stream is (INT-06). That
reverses the ARCH-11 ingest exception — for a good reason: ingest is no longer a
single stable front, it is a set of dynamically-changing node instances.

The forces on a publish API: a client cannot pick a node (only the system knows
load), the media never flows through the sync service (a publisher pushes RTSP
straight to a node), and we did not want a third "confirm" round-trip after the
publish — the sync reconcile loop already relays anything it sees live on ingest.

## Decision

We will add a **reserve→publish** flow and run ingest as a **per-node cluster**,
reusing the machinery already in place (pod registry, assignment-policy pattern,
metrics pipeline, sync reconcile loop).

- **Per-node addressing.** Ingest (and cluster) pods self-report `apiPort`,
  `rtspPort`, `metricsPort` alongside `host` in their registration heartbeat;
  the backend resolves each node's URL from the registry (`NodeResolver`), and
  the transport registry takes the port as an argument. Role-global port config
  becomes registration-time defaults only. This retires `INGEST_RTSP_URL` as the
  relay's pull front: the relay pulls from the specific ingest node the stream
  lives on (`ingestPod`), captured at discovery.
- **Reserve API.** `POST /api/ingest/streams` (`StreamReservationService`) picks the
  **least-loaded** ingest node — `IngestPlacementService` counts live publishers
  (metrics tier) plus pending reservations per node, then calls the context-free
  `selectLeastLoaded` (`@/common`); cluster placement calls `selectByHash` the same
  way. Neither is a swappable policy — each is one algorithm, a pure function. Ingest
  placement is not in `StreamAssignmentService`: it is a birth-time input persisted
  by the reservation insert, not an assignment mutation. `StreamReservationService`
  records a `RESERVED` `Stream` holding the slot
  (`ingestPod` + `reservedUntil` + an opaque `publishToken`) and returns the
  publish URL + secret + expiry. No separate reservation collection — the `Stream`
  record *is* the reservation (DATA-05). The manual and ingest births are separate
  services (`StreamSetupService.onboard` vs `StreamReservationService.reserve`) —
  independent flows with near-disjoint dependencies.
- **Publish auth at the node, decided by us.** Media lands on the node, not on
  the sync service, so the node must authorize the publish. Ingest nodes run
  MediaMTX `authMethod: http` pointed at `POST /api/ingest/auth`; the reserve
  response embeds the per-reservation secret as RTSP credentials in the publish
  URL, the node forwards it, and the sync service allows the publish iff the
  secret matches the reservation. `api`/`metrics` and the internal relay `read`
  are excluded from node auth (`authHTTPExclude`).
- **Activation without a client call.** The sync reconcile loop already assigns
  and deploys a relay when it sees a stream live on ingest. A reserved stream
  sheds its `reservedUntil` marker on discovery and flows through the normal
  assign+deploy path; unclaimed reservations past `reservedUntil` are GC'd by the
  staleness workflow. A MediaMTX `pathDefaults.runOnReady` hook posts
  `POST /api/pods/:podId/stream-ready`, which relays **that one** stream immediately
  (`IngestStreamSynchronizerService.activate`, targeted from the hook's `podId`+`name`
  — no whole-cluster scan) instead of waiting a poll interval (node-sourced, so
  trustworthy).

## Consequences

- **Reverses the ARCH-11 ingest exception, on purpose.** Ingest is now addressed
  per-node from the registry like the cluster tier (INT-06 extends to ingest), not
  via a stable front. `INGEST_RTSP_URL` is gone. ARCH-11's "stable shared
  endpoint" carve-out no longer applies to ingest — it was only ever valid while
  ingest was a single front.
- **Ingest scales like the cluster.** Add nodes (several per VM, distinct ports);
  each self-registers and immediately becomes a placement candidate. See
  `deploy/docker/compose.ingest.yml`.
- **Publish auth couples to sync uptime.** With `authMethod: http`, every publish
  attempt calls the sync service; if it is down, new publishes are rejected
  (existing streams keep flowing). Accepted: reserve already requires the sync
  service, so a publisher cannot get coordinates without it anyway.
- **Rejected — JWT/JWKS publish tokens (`authMethod: jwt`).** A per-stream JWT the
  node validates offline against a JWKS the sync service exposes decouples publish
  from sync uptime and is the more "standard" design. It was implemented, then
  reversed: `authMethod` is a single global switch, so `jwt` also re-gates the
  sync service's own control-plane (v3 API discovery + `/metrics` scrape), which
  authenticates with basic credentials — and JWT auth has no exclusion mechanism
  for those. Making it work would mean minting the sync service a control token
  and teaching the transport registry to send it as a bearer, a larger change than
  the coupling it avoids. `http` auth cleanly exempts the control-plane
  (`authHTTPExclude`), so we took it.
- **Rejected — a client "confirm" step after publishing.** Redundant: the reconcile
  loop already detects the live stream; a confirm call would duplicate discovery
  and add a failure mode.
- **Read is trusted on the ingest network.** The cluster relay pulls with an
  authless URL, so `read` is excluded from node auth. If ingest RTSP must be
  closed to untrusted readers, thread control credentials into the pull URL and
  drop `read` from `authHTTPExclude` — noted as follow-up.
- **Supersedes** the ingest-relevant parts of ADR-0009 (the ingest pull front is
  no longer a stable configured URL) and complements ADR-0012 (cluster nodes stay
  a StatefulSet; ingest nodes are VM-hosted with self-reported ports).
