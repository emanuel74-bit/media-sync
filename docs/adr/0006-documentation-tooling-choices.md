# ADR-0006: Documentation tooling — ADRs + Mermaid now, LikeC4 on trial, no Backstage

- **Status**: Accepted
- **Date**: 2026-06-13
- **Related rules**: DOC-01, DOC-02, DOC-03, DOC-04

## Context

The project's architecture knowledge lived in hand-maintained ASCII diagrams
(SYSTEM_DOCUMENTATION.md), a rule registry (CONVENTIONS.md), and conversation
history. Four tool categories were evaluated: diagrams-as-code with a single
navigable model (LikeC4), embeddable standalone diagrams (Mermaid/D2), a
service catalog/portal (Backstage), and decision records (ADR markdown). The
system's scale: two deployables (NestJS backend, React frontend), MediaMTX
pods, MongoDB, effectively one developer working with an AI assistant.

## Decision

- **ADRs**: adopted. `docs/adr/NNNN-title.md`, MADR-lite template, append-only,
  indexed in `docs/adr/README.md`. CONVENTIONS rules cite the ADR that
  motivated them; ADRs record the why, CONVENTIONS records the current law.
- **Mermaid**: adopted for all diagrams in repo markdown (GitHub renders it
  natively; ASCII art is hand-maintained and drifts). D2 rejected: better
  layouts but no native GitHub rendering and an extra toolchain.
- **LikeC4**: adopted **on trial** in `docs/architecture/` to evaluate its
  interactive single-model/multi-view value. At two deployables the C4
  container level is a single diagram, so the trial's question is feel and
  upgrade-path, not present need. Graduation trigger: the system growing past
  roughly 4–5 services with real inter-service topology, or the trial proving
  the model cheap enough to keep regardless.
- **Backstage**: rejected at this scale. A self-hosted portal whose catalog
  would contain two entries owned by one person solves a problem this project
  does not have. Revisit only with multiple teams/services.

## Consequences

- Decisions stop living only in conversation history; diagrams become
  reviewable diffs.
- Two diagram sources exist during the LikeC4 trial (Mermaid in docs, the
  LikeC4 model) — accepted temporarily; the trial outcome decides whether the
  LikeC4 model becomes authoritative for structure diagrams or is dropped
  (recorded in a superseding ADR either way).
- Maintenance duty added: DOC-04 requires the LikeC4 model to be updated when
  containers/features change, for the duration of the trial.
