## ADDED Requirements

### Requirement: Verified feature architecture documentation

The repository MUST contain one maintained architecture document for every verified top-level
backend feature. Each document MUST identify the feature's responsibility and boundaries,
supported public surface and entry points, internal concerns, owned data, produced and consumed
events, dependencies, primary flows, applicable specifications, ADRs, convention rule IDs,
validation commands, known verified limitations, implementation evidence, test evidence, and a
`last_verified` date.

#### Scenario: A reader navigates a backend feature

- **WHEN** a reader opens the feature documentation index
- **THEN** every verified top-level backend feature is linked to a document whose referenced
  source and test paths exist

### Requirement: Verified cross-feature subsystem documentation

The repository MUST contain a maintained subsystem document for each verified significant
cross-feature runtime capability. Each document MUST identify the outcome, trigger,
participants, responsibility boundaries, ordered flow, explicit state transitions,
persistence effects, events, success and failure behavior, verified idempotency and consistency
semantics, operational considerations, related features, specifications, ADRs, conventions,
and implementation/test evidence.

#### Scenario: A reader traces an end-to-end capability

- **WHEN** a reader follows a subsystem link from the subsystem index or a participating feature
- **THEN** the documented sequence and material claims are traceable to current code and tests,
  and any unverified guarantee is stated as unverified rather than implied

### Requirement: Documentation authority boundaries

Feature and subsystem documents MUST describe architecture, ownership, and implementation
structure without replacing the established authorities: OpenSpec specifications for intended
observable behavior, ADRs for durable decision rationale, `backend/CONVENTIONS.md` for current
engineering law, and code/tests for implementation and completion evidence.

#### Scenario: Sources disagree

- **WHEN** repository evidence conflicts with a feature or subsystem claim
- **THEN** the conflict and the artifact requiring reconciliation are reported instead of being
  silently resolved or represented as verified behavior

### Requirement: Portable repository navigation

The documentation layer MUST be reachable from `docs/index.md`, use standard relative Markdown
links, use Mermaid for diagrams, and keep Obsidian-specific state out of version control.

#### Scenario: Documentation is opened in a supported interface

- **WHEN** the repository documentation is viewed in GitHub, VS Code, Obsidian, Claude Code,
  Codex, or OpenSpec-oriented tooling
- **THEN** the feature, subsystem, specification, decision, convention, source, and test links
  resolve without requiring Obsidian-only wikilinks or a separate knowledge store

### Requirement: Same-change maintenance

A change that materially changes a feature responsibility or boundary, public surface,
dependency direction, state or persistence ownership, event contract, subsystem flow,
integration boundary, failure behavior, or idempotency or consistency guarantee MUST update the
affected feature or subsystem documents in the same change and refresh their verification date.

#### Scenario: Architecture changes materially

- **WHEN** a repository change materially alters a documented feature or subsystem concern
- **THEN** the affected documents and their evidence links are updated and validated before the
  change is considered complete
