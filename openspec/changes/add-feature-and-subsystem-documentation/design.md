## Context

The backend currently has eight feature folders and Nest capability modules identified by
`PHIL-01` and `DIR-01`: `streams`, `nodes`, `alerts`, `metrics`, `stream-inspection`,
`sync`, `gateway`, and `media-nodes`. Their public surfaces, persistence ports, events,
scheduled work, and cross-feature calls are distributed across source, tests, conventions,
ADRs, and existing architecture notes. Existing `docs/architecture/` pages provide broad
orientation, but they do not give each feature and significant end-to-end subsystem a
uniform evidence map.

This change extends the repository-owned Markdown navigation adopted by ADR-0015. It also
answers ADR-0016's recorded gap—a missing maintenance duty for architecture documents—without
restoring LikeC4 or adding another toolchain. Current boundaries remain: OpenSpec specifies
intended observable behavior, ADRs record durable rationale, `backend/CONVENTIONS.md`
records current engineering law, and code/tests provide implementation evidence.

Applicable rules include `PHIL-01`, `PHIL-04`, `PHIL-05`, `TOOL-03`, `TOOL-05`,
`DIR-01`, `ARCH-02`–`ARCH-04`, `ARCH-08`–`ARCH-11`, `SVC-04`, `DATA-01`,
`DATA-05`, `DATA-07`, `INT-01`–`INT-06`, `EVT-01`–`EVT-05`, `JOB-01`–`JOB-03`,
`TEST-01`, `TEST-05`, and `DOC-01`–`DOC-05`.

## Goals / Non-Goals

**Goals:**

- Create one consistent, evidence-backed document per verified top-level backend feature.
- Create one consistent document per verified significant cross-feature runtime subsystem.
- Make architecture navigation portable across GitHub, VS Code, Obsidian, Claude Code,
  Codex, and OpenSpec using relative links and Mermaid.
- Connect architecture claims to real code, tests, specifications, ADRs, and stable rule IDs.
- Establish a durable same-change maintenance duty through ADR-0017 and `DOC-06`.
- Validate links, diagrams, paths, OpenSpec artifacts, and the normal backend checks.

**Non-Goals:**

- Changing production code, tests, APIs, events, schemas, persistence behavior,
  configuration, deployment, or dependencies.
- Inventing missing behavior, guarantees, specifications, or test coverage.
- Replacing or duplicating the authority of OpenSpec, ADRs, conventions, code, or tests.
- Restoring LikeC4, committing `.obsidian/`, or adding plugins, MCP services, embeddings,
  indexes, portals, or another documentation build tool.

## Decisions

### Use feature and subsystem documents as derived architecture maps

`docs/features/<feature>.md` will describe one feature's responsibility, boundary, supported
surface, owned data, events, dependencies, entry points, and evidence. `docs/subsystems/`
will describe only stable end-to-end capabilities spanning at least two feature or integration
boundaries, including ordered flow, mutations, failures, and verified consistency behavior.
Full requirements and decision rationale stay linked rather than copied.

Alternative considered: extend only the existing module map and runtime-flow page. Rejected
because a single large page does not provide stable ownership pages or a uniform evidence
contract for every feature and significant subsystem.

### Derive the inventory from executable structure and tests

The initial feature set is the eight current feature modules named by `DIR-01`. Supporting
folders (`common`, `config`, and `infrastructure`) remain dependencies or participants unless
repository evidence shows they are an independently owned capability. Subsystems will be
included only after their trigger, participants, state mutations, events, failures, and tests
are traced through implementation. Missing guarantees will be stated explicitly.

Alternative considered: use the candidate lists from the mission as the inventory. Rejected
because candidates are hypotheses and this brownfield repository requires code/test evidence.

### Add a navigation bridge without a new documentation runtime

`docs/features/index.md`, `docs/subsystems/index.md`, and
`docs/specification-map.md` will provide tables of verified links; `docs/index.md` remains the
navigation-only dashboard. Standard relative Markdown links and GitHub-compatible Mermaid
satisfy `DOC-02` and ADR-0015. A temporary link-validation command may be used, but no new
dependency or committed generated index will be introduced.

Alternative considered: Obsidian wikilinks or a searchable generated knowledge index.
Rejected because they reduce portability or create a duplicate source of truth.

### Establish maintenance through ADR-0017 and DOC-06

ADR-0017 will record the durable responsibility split and documentation shape. `DOC-06` will
require same-change updates when feature boundaries, public surfaces, state ownership,
events, persistence, dependencies, integration boundaries, or subsystem semantics materially
change. `CLAUDE.md` and `AGENTS.md` will point agents to the derived documents during
orientation while preserving their lower authority.

Alternative considered: guidance only in agent instruction files. Rejected because that would
not establish repository-wide engineering law or durable rationale (`DOC-01`).

### Validate in small, reviewable phases

Each meaningful artifact group will be inspected, checked with `git diff --check`, and have its
relative paths validated before the next group. Final completion requires
`openspec validate --all` and `npm run verify` from `backend/` (`TOOL-05`, `DOC-05`).
Because no runtime behavior changes, no production test files or barrels are expected to change.
The LikeC4 model is intentionally absent under ADR-0016, so no model update is applicable.

## Risks / Trade-offs

- **Derived documents can become stale** → `DOC-06`, agent guidance, `last_verified`, and
  same-change validation make maintenance explicit.
- **Architecture prose can accidentally overstate behavior** → every important claim cites
  implementation/test evidence; absent specs, tests, or guarantees are stated as gaps.
- **Large documentation volume can obscure ownership** → one fixed template per feature or
  subsystem, concise concern-level inventories, and index tables provide predictable entry points.
- **Relative links can drift after moves** → validate every changed Markdown link before final
  verification without adding a permanent dependency.
- **Overlap with existing architecture pages can duplicate information** → existing pages keep
  broad system/module orientation; new pages own feature and subsystem detail and link outward.

## Migration Plan

No runtime migration or deployment is required. Add governance artifacts first, then inventory
and documentation, then navigation and agent guidance. Rollback is a repository revert of these
documentation/governance artifacts; application state and deployed systems are unaffected.

## Open Questions

None. Exact subsystem inclusion is an evidence question resolved during implementation rather
than a product or architecture decision.
