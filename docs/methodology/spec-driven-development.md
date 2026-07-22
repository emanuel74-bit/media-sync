# Spec-Driven Development

## Purpose

Use specifications to agree on non-trivial behavior before implementation while
keeping small, low-risk edits lightweight.

## Change levels

### Trivial

A change may skip OpenSpec only when it is isolated, low risk, and does not alter
observable behavior, a public contract, schema, event, architecture, tooling, or a
durable convention.

Flow:

```text
inspect -> implement -> focused validation -> npm run verify
```

### Non-trivial

Use OpenSpec for features, behavior changes, contracts, schemas, events, cross-feature
work, significant refactors, architecture, compatibility, migration, rollout, or
rollback concerns.

Flow:

```text
explore -> propose -> review -> apply incrementally -> verify -> sync -> archive
```

## Artifact boundaries

| Artifact | Answers |
|---|---|
| Proposal | Why this change, what is in scope, and what is not |
| Delta specification | What observable behavior changes |
| Design | How this change will work |
| Tasks | In what order the implementation and validation happen |
| ADR | Why a durable architecture, public-contract, or tooling decision was made |
| CONVENTIONS | What the current engineering law is |
| Tests and validation | Whether implementation evidence supports completion |

## Review gates

Before implementation:

- Current behavior is verified against code and tests.
- Requirements and scenarios are specific.
- Relevant convention rule IDs are identified.
- Relevant ADRs are read.
- Required new or superseding ADRs are identified.
- Scope and non-goals are explicit.

Before completion:

- Focused tests pass.
- `npm run verify` passes.
- `openspec validate --all` passes.
- Tasks accurately reflect completed work.
- Implementation and specifications agree.
- Required ADR, convention, diagram, barrel, and migration updates exist.

## Agent usage

Claude Code and Codex are executors of the same repository-owned workflow. They do
not own a separate memory or architecture authority.

- Claude Code follows `CLAUDE.md`.
- Codex follows `AGENTS.md`.
- Both use the same OpenSpec changes, specifications, ADRs, conventions, code, and
  tests.
- Specialized subagents may assist with bounded research or review, but they are not
  required for this methodology.

## Obsidian usage

Obsidian is an optional local interface over the repository's Markdown files.

It is useful for:

- Reviewing proposals, designs, and tasks.
- Navigating ADR history.
- Following links from convention rules to decisions.
- Browsing canonical specifications and active changes.
- Maintaining a human-readable project map.

It is not used for:

- TypeScript go-to-definition or reference analysis.
- A second AI memory store.
- Automatically generated code documentation.
- Replacing code, tests, OpenSpec, ADRs, or conventions.
