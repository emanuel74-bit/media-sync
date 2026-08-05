---
last_verified: 2026-08-02
verified_against: package.json, package-lock.json, .nvmrc, .gitattributes, scripts/agent-workflow/preflight.mjs, scripts/agent-workflow/checkpoint.mjs, scripts/agent-workflow/validate-review.mjs, scripts/agent-workflow/verify-local.mjs, backend/package.json, backend/tsconfig.json, backend/jest.config.js, frontend/package.json, openspec/config.yaml
---

# Validation and tooling

The repository completion gates, their package boundaries, and the state each gate proves.

## Supported toolchain

The root private package is the repository-tooling boundary. It pins Node `22.22.0` in both
`.nvmrc` and `package.json`, and pins `@fission-ai/openspec` `1.6.0` exactly in the committed root
lockfile. The verifier launches `node_modules/@fission-ai/openspec/bin/openspec.js` with the
current Node executable; it does not depend on an ambient `openspec` command.

Install root tools from the repository root with `npm ci`. Backend and frontend dependencies keep
their existing independent package roots and lockfiles.

| Root                           | Purpose                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| Repository root                | Hermetic repository/change verification and pinned OpenSpec. |
| [`backend/`](../../backend/)   | NestJS service checks and tests.                             |
| [`frontend/`](../../frontend/) | Vite/React dashboard checks and tests.                       |

## Completion gates

Run the repository completion gate from the root:

```bash
npm run verify
```

It performs these required checks:

1. confirms the exact Node version and verifies the installed OpenSpec manifest, CLI path,
   complete resolved lock graph, hidden installed-lock inventory, and every package byte in the
   executable dependency closure against the repository pin;
2. validates the tracked work-order, review-report, and integration-report examples against their
   schemas;
3. validates tracked Markdown relative targets, subject only to the documented exceptions below;
4. runs backend `npm run verify`;
5. runs frontend `npm run verify`;
6. checks root workflow JavaScript and JSON formatting with the repository Prettier policy;
7. runs every `test/agent-workflow/*.test.mjs` test with Node's built-in test runner;
8. revalidates the complete OpenSpec dependency closure immediately before running the
   repository-local OpenSpec `validate --all` command;
9. runs `git diff --check` from the authorized candidate comparison base; and
10. proves that the branch, HEAD, raw normal/shared index files, index-lock state, every tracked
    file, every ordinary untracked file, and ignored personal state outside known generated roots
    retain their starting identity.

File identity includes classification, path, kind, mode, size, and SHA-256 content. Generated roots
such as dependency trees, build output, documentation exports, and `.agents/work/` are excluded so
they may be regenerated. A tracked rewrite, a new ordinary untracked file, or any creation, change,
or deletion under ignored personal state such as `.claude/` or `.obsidian/` fails verification,
including when a user's global Git ignore hides the path. On a change order the whitespace base is
the work-order base; on a feature/archive candidate it is the merge base with `master`; on
`master` it is the parent commit.

Workflow Git observations clear inherited `GIT_*` repository/configuration selectors, disable
system and global Git configuration, and fix the attributes, excludes, fsmonitor, whitespace,
abbreviation, color, and diff-prefix settings that affect validation output. The repository-owned
`.gitattributes` requires LF checkout normalization for workflow-formatted files, including when a
Windows checkout uses `core.autocrlf=true`; the static gate verifies that policy with
`git check-attr`. Repository verification rejects the complete ambient Node execution and late-write
selector set before running a gate, including coverage and compile-cache destinations. It resolves
the npm CLI only from the pinned Node runtime instead of trusting the `npm_execpath` that npm itself
sets for a root-script invocation, removes the broader execution-selector set from child
environments, and runs OpenSpec with telemetry opt-outs and contained XDG configuration/data roots.

For an accepted local-agent change, use:

```bash
npm run verify:change -- <change-id>
```

Change mode snapshots repository state before checkpoint, then requires a matching active
integration work order, accepted planning identity, completed assigned task markers,
protected-state baseline (including Git classification and mode), and exact base-to-current
operation inventory. It physically resolves required documents and command working directories,
runs the work order's fixed checkpoint commands, rejects any command mutation, then runs every
repository-mode check and prints the validated inventory. State comparison still runs when a
sub-gate fails so mutation paths are reported alongside the primary failure. Review reports must
exactly cover accepted scenarios and convention IDs and bind checkpoint results back to the exact
declared commands; evidence-only validation binds the stored work order, checkpoint, and report.
Final integration validation discovers the exact dated archive root from every tree entry,
rejecting residual active or duplicate dated roots even when they lack an `acceptance.json`, and
separately binds the full accepted-master-baseline-to-candidate history, raw diff, and inventory
while the work-order base remains the acceptance-bearing authorization base. These remain later
dedicated gates, not proof before review exists.

The protected baseline covers every declared protected path, including a missing path, and binds
exact worktree identity plus index path, blob, mode, and stage records. Protected directories are
recursive scopes for tracked, ordinary untracked, and ignored descendants, binding every
descendant's classification and index identity together with its path, kind, mode, size,
file-content hash, and symbolic-link target. Checkpoint snapshots also bind
the symbolic branch and raw normal/shared index bytes around
each command sequence. Ignored forbidden paths are included in exact scope checks, and
`.agents/work/` reads and writes reject symlinks, junctions, reparse redirects, and hard-linked
file leaves even when their targets remain inside the repository. Focused-command identity retains
the full executable token; direct shells, shell-script extensions, and indirect shell wrappers are
rejected before execution.

Review raw-diff identity uses a canonical full-index binary diff with text conversion disabled,
fixed rename detection, and fixed diff heuristics. Any post-review task-checkbox change is stale
review state even though checkbox normalization remains valid for accepted planning and
preflight/checkpoint progress. Final reports carry checkpoint commands separately from broader
required checks. Their ordered integrations bind each unique, increasing first-parent commit to
one resolved passing review and to the same parent-to-commit file-operation inventory.

`TOOL-09` makes root `npm run verify` the completion gate. [ADR-0020](../adr/0020-bind-complete-tool-and-archive-identities.md)
records the complete closure, command, protected-state, and archive identities enforced by that
gate. `TOOL-05` keeps backend `npm run verify` as a required sub-gate. `DOC-05` additionally
requires `openspec validate --all` before completion, including after archive and merge.

## Workspace gates

Backend `npm run verify` is `typecheck && lint && build && test -- --forceExit`:

| Stage      | Command                                      | Guarantee                                                             |
| ---------- | -------------------------------------------- | --------------------------------------------------------------------- |
| Type check | `tsc --noEmit --incremental false`           | Strict types and path aliases resolve without writing build metadata. |
| Lint       | ESLint over `src/**/*.ts` and `test/**/*.ts` | Check-only lint; it does not rewrite source.                          |
| Build      | `nest build`                                 | The service compiles into ignored `dist/`.                            |
| Test       | `jest --forceExit`                           | Backend unit and integration tests pass.                              |

Use backend `npm run lint:fix` only when an explicit source rewrite is intended. The former tracked
`backend/tsconfig.tsbuildinfo` is removed and incremental compilation is disabled, so verification
does not rewrite a tracked cache.

The Jest termination option remains intentionally bounded. A 2026-07-31 diagnostic run with
`jest --detectOpenHandles --runInBand` exceeded 120 seconds before the suite completed and did not
produce a reliable handle report. Removing it would require a separate investigation if the fix
touches runtime behavior, architecture, or contracts; the completion gate still propagates every
test failure before Jest exits.

Frontend `npm run verify` composes `typecheck`, check-only `lint`, `vitest run`, and the production
Vite build. Generated frontend output remains under ignored `frontend/dist/`.

## Markdown target exceptions

The link checker skips external URLs and same-document anchors. Two tracked templates have narrow,
explicit path exceptions:

| Source                                              | Exception                                          | Reason                                                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/adr/template.md`                              | `NNNN-title.md`                                    | Placeholder for the future superseding ADR filename.                                                                                                                 |
| `.github/prompts/directive-driven-design.prompt.md` | Its five `../directive/conventions.*.yaml` targets | Legacy optional directive-root placeholders; the current directive tree stores any corresponding files in nested concern folders and has no controlling design file. |

No wildcard exception applies to other Markdown. Adding another placeholder requires updating both
the verifier allowlist and this table.

## Test layout

Backend TypeScript tests remain under `backend/test/` and follow `TEST-01`/`TEST-02`. Root ESM
workflow tests are the sole exception defined by `TEST-08` and
[ADR-0019](../adr/0019-place-repository-tooling-tests-at-root.md): they live under
`test/agent-workflow/*.test.mjs`, mirror `scripts/agent-workflow/` by concern, use Node's built-in
runner, and create isolated temporary Git repositories without shared mutable state or committed
skips.

## What the automated gate does not prove

- **Runtime boot safety.** The backend build does not boot `AppModule`; use the manual DI-scan
  procedure described by `IMP-04` when dependency wiring changes.
- **End-to-end API behavior.** `backend/test.ps1` remains the live-stack smoke script under
  `TEST-07` and is not part of the hermetic gate.
- **Reviewer independence or human authority.** Workflow validators verify recorded identities and
  evidence, not conversational freshness or authority.
- **Barrel regeneration.** Do not run the repository-wide barrels generator; `DEVN-06` and
  `TOOL-03` require curated feature-root barrels to remain hand-maintained.

## Development commands

From `backend/`, `npm run start:dev`, `npm run dev`, and the `stack:*` commands retain their
existing development and local-deployment roles. Deployment artifacts remain under
`backend/deploy/{docker,k8s,mediamtx,scripts}` (`DIR-09`,
[ADR-0007](../adr/0007-backend-deploy-layout.md)).
