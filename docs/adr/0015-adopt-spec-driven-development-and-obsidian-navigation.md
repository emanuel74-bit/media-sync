# ADR-0015: Adopt OpenSpec-driven development and Obsidian navigation

- **Status**: Accepted
- **Date**: 2026-07-22
- **Supersedes**: None

## Context

The repository already has two strong documentation authorities:

- `backend/CONVENTIONS.md` records current engineering law using stable rule IDs.
- `docs/adr/` records the rationale and history of durable architecture and tooling
  decisions.

AI-assisted changes are currently developed primarily with Claude Code, with Codex
also expected to work in the same repository. Non-trivial work needs a shared,
reviewable definition of intended behavior before implementation. The repository
also needs a convenient human interface for navigating specifications, ADRs, and
conventions without introducing another source of truth.

## Decision

1. Adopt OpenSpec incrementally for non-trivial changes.
2. Keep trivial, isolated, non-behavioral edits lightweight.
3. Store canonical intended observable behavior in `openspec/specs/`.
4. Store proposed changes in `openspec/changes/` until implementation, validation,
   synchronization, and archive are complete.
5. Keep `backend/CONVENTIONS.md` as the current engineering-rule authority.
6. Keep `docs/adr/` as the append-only durable decision authority.
7. Configure both Claude Code and Codex to use the same repository-owned workflow.
8. Open the repository root as an Obsidian vault for human navigation.
9. Keep `.obsidian/` local and ignored initially. Obsidian plugins, MCP servers,
   embeddings, and a separate AI knowledge index are not part of this decision.
10. Use standard relative Markdown links so files remain portable across GitHub,
    VS Code, Claude Code, Codex, and Obsidian.

## Consequences

### Positive

- Requirements, scenarios, design, and tasks become reviewable before implementation.
- Claude Code and Codex share one change history and one set of completion gates.
- Existing conventions and ADRs remain authoritative rather than being duplicated.
- Obsidian provides easier navigation without changing the storage format.
- Specification coverage grows through real changes instead of a risky full-system
  documentation rewrite.

### Costs and risks

- Non-trivial changes require additional planning artifacts.
- Specifications can become stale unless archive and validation gates are followed.
- OpenSpec requires a supported Node.js runtime even when the application itself
  targets an older Node.js version.
- Obsidian improves Markdown navigation but does not replace TypeScript language
  services or repository search.

## Enforcement

- `CLAUDE.md` and `AGENTS.md` route AI work through the methodology.
- `openspec/config.yaml` constrains generated artifacts.
- `backend/CONVENTIONS.md` contains a stable documentation rule for non-trivial changes.
- Completion requires `npm run verify` and `openspec validate --all`.
