# ADR-0019: Place repository tooling tests at the repository root

- **Status**: Accepted
- **Date**: 2026-07-31
- **Related rules**: TEST-08, TOOL-09

## Context

`TEST-01` and `TEST-02` define the layout and naming of backend TypeScript tests executed by
Jest. The repository-local workflow introduced by ADR-0018 is implemented by root ESM scripts,
uses Node's built-in test runner, and must be testable without loading the backend package or its
TypeScript/Jest configuration.

Putting these tests under `backend/test/` would imply that they mirror backend application
source, are governed by the backend test regex, and require the backend toolchain. Co-locating
them beside root scripts would conflict with the repository's established separation of source
and tests.

## Decision

Repository workflow and verification tests live under `test/agent-workflow/*.test.mjs`, mirroring
`scripts/agent-workflow/` by concern. They use Node's built-in test runner and isolated temporary
Git repositories. This is the only exception to the backend-specific location and naming rules in
`TEST-01` and `TEST-02`.

Root `npm run verify` executes these tests as a required sub-gate. The tests remain subject to
`TEST-05` and `TEST-06`: core logic and state-changing interactions require coverage, fixtures
cannot share mutable state, and committed skips are forbidden.

## Consequences

Repository tooling tests run independently of backend Jest and TypeScript while retaining one
stable, reviewable location. Future root workflow scripts use the same directory and `.test.mjs`
suffix; product tests do not move there.

The exception is deliberately narrow. A later test runner or layout change requires a new ADR and
an update to `TEST-08`; ADR-0018 remains the decision that established the workflow itself.
