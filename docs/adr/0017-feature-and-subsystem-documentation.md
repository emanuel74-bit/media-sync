# ADR-0017: Maintain feature and subsystem architecture documentation

- **Status**: Accepted
- **Date**: 2026-07-23
- **Related rules**: DOC-06
- **Supersedes**: None

## Context

The backend is organized around feature modules, but important runtime behavior also crosses
feature boundaries through scheduled work, events, persistence adapters, and the MediaMTX
integration. Code search can reconstruct those relationships at a point in time, but it does not
provide a stable architecture map, an ownership entry point, or an explicit record of which
claims were verified against tests.

OpenSpec describes intended observable behavior and change requirements. It does not replace
architecture documentation about responsibility, ownership, dependency direction, and
implementation structure. Likewise, `backend/CONVENTIONS.md` remains current engineering law,
ADRs remain the append-only decision record, and code and tests remain implementation evidence.

The repository is opened directly in Obsidian for human navigation and is also used through
GitHub, VS Code, Claude Code, and Codex. Those interfaces need one portable Markdown structure,
owned by the repository, rather than interface-specific links or another memory/index system.

## Decision

1. Every verified top-level backend feature has one document under `docs/features/`.
2. Every significant cross-feature runtime capability has one document under
   `docs/subsystems/`.
3. A feature document describes its responsibility and boundaries, supported public surface,
   entry points, stable internal concerns, owned data, events, dependencies, relevant code and
   tests, OpenSpec specifications, ADRs, conventions, validation, limitations, and evidence.
4. A subsystem document describes an end-to-end outcome and trigger, direct participants and
   responsibility boundaries, ordered flow, explicit state transitions, persistence effects,
   events, success and failure behavior, verified idempotency and consistency semantics,
   operational considerations, and implementation/test evidence.
5. OpenSpec remains authoritative for intended observable behavior.
6. ADRs remain authoritative for durable decision rationale.
7. `backend/CONVENTIONS.md` remains authoritative for current engineering rules.
8. Code and tests remain the evidence for current implementation and completion.
9. Documentation uses standard relative Markdown links and Mermaid diagrams so it works in
   GitHub, VS Code, Obsidian, Claude Code, and Codex.
10. Obsidian is a local navigation interface over repository Markdown, not a separate source of
    truth. `.obsidian/` remains ignored unless a separately reviewed decision changes that
    policy.
11. Material changes to documented ownership, boundaries, surfaces, dependencies, state,
    persistence, events, integrations, failure behavior, or consistency semantics update the
    affected feature or subsystem documents in the same change.

## Consequences

### Positive

- New contributors and agents have stable ownership and runtime-flow entry points.
- Architecture claims are reviewable alongside their source and test evidence.
- Feature, subsystem, specification, ADR, and convention navigation stays portable across the
  repository's supported interfaces.
- OpenSpec, ADR, convention, and implementation responsibilities remain distinct instead of
  being copied into a new authority.

### Costs and risks

- Feature and subsystem documents add maintenance work to material architecture changes.
- Derived documentation can become stale even when its links still resolve; every document
  therefore carries `last_verified`, and claims must be rechecked against code and tests.
- End-to-end flows can be overstated when tests cover only isolated services. Unverified failure,
  idempotency, or consistency guarantees must be stated as unverified rather than inferred.
- Some architecture information overlaps existing system/module overviews. Those documents keep
  broad orientation; feature and subsystem pages own the detailed evidence maps.

### Rejected alternatives

- **Use code search alone.** It has no stable ownership map, verification date, or cross-source
  navigation contract.
- **Put architecture detail into OpenSpec.** That would mix implementation structure with
  observable behavioral requirements and blur authority boundaries.
- **Adopt Obsidian-only wikilinks, plugins, or a generated knowledge index.** Those reduce
  portability or create a second source of truth.
- **Restore a separate diagrams-as-code model.** ADR-0016 ended that trial; Mermaid in repository
  Markdown remains sufficient for the verified relationships documented here.

## Enforcement

- `DOC-06` defines the required documents, evidence fields, authority boundaries, and same-change
  maintenance duty.
- `CLAUDE.md` and `AGENTS.md` require agents to read and verify relevant feature/subsystem pages
  during orientation and update them when affected.
- The active OpenSpec change tracks the initial inventory and implementation tasks.
- Normal completion still requires `npm run verify` and `openspec validate --all`.
- Changed Markdown relative links and repository paths are validated before completion.
