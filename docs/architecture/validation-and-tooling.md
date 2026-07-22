---
last_verified: 2026-07-22
verified_against: backend/package.json, backend/jest.config.js, backend/.eslintrc.json, openspec/config.yaml, docs/architecture/package.json
---

# Validation and tooling

Where the package roots are, which commands actually exist, and what each gate proves.

## Package roots

There is **no root `package.json`**. Every command below is run from a specific directory.

| Root | Purpose |
|---|---|
| [`backend/`](../../backend/) | The NestJS service. The one that matters for `npm run verify`. |
| [`frontend/`](../../frontend/) | The Vite + React dashboard. |

`openspec` is a globally installed CLI, run from the repository root.

## The completion gate

```bash
cd backend
npm run verify
```

`verify` is `typecheck && lint && build && test -- --forceExit`
([`backend/package.json`](../../backend/package.json)). What each stage proves:

| Stage | Command | Proves |
|---|---|---|
| `typecheck` | `tsc --noEmit` | Types and path aliases resolve. |
| `lint` | `eslint --fix` over `src/**/*.ts` and `test/**/*.ts` | Import and barrel rules hold — `no-restricted-imports` is what enforces `IMP-01` (deep file imports forbidden, two named sub-barrels whitelisted, `test/**` exempt). |
| `build` | `nest build` | The app compiles. Does **not** prove the DI graph boots. |
| `test` | `jest` | Unit and integration tests pass. |

`lint` runs `eslint --fix`, so `verify` **writes to the working tree**. On a repository checked
out with CRLF endings it rewrites the line endings of every file under `src/` and `test/`,
producing a large zero-content `git status`. Check `git diff --numstat` before assuming a real
change: all-zero rows mean line endings only.

```bash
openspec validate --all
```

Validates every change and specification under [`openspec/`](../../openspec/) against the
`spec-driven` schema in [`openspec/config.yaml`](../../openspec/config.yaml).

`DOC-05` makes both commands mandatory before a non-trivial change may be called complete.

## What the gates do not cover

- **Boot safety.** Unit tests never boot `AppModule`, so a barrel cycle surfaces only at deploy
  time. `IMP-04` names the signature (a Nest "undefined dependency" error) and the check: a boot
  DI-scan, `node dist/main.js` against an unreachable Mongo — a sound graph logs
  "…dependencies initialized" and fails only on the Mongo connection. This is a **manual**
  procedure; no script runs it.
- **End-to-end API behavior.** `backend/test.ps1` is the smoke script and runs against a live
  stack, not as part of `npm test` (`TEST-07`). Use `.\test.ps1 -Up` to start the stack first.
- **Markdown links.** No link checker is configured in this repository. Added links are resolved
  by hand.
- **Barrel regeneration.** `npm run barrels:generate` cannot be run over the whole tree — it
  overwrites the curated feature-root barrels with broken self-referential output. Recorded as
  `DEVN-06`; barrels are maintained by hand per `TOOL-03`.

## Test layout

Tests live in [`backend/test/`](../../backend/test/), mirroring the `src/` path of the unit under
test exactly (`TEST-01`). `<name>.test.ts` is a unit test, `<name>.spec.ts` an integration test;
Jest picks up both (`TEST-02`). Mocking stops at external boundaries — repositories, MediaMTX
services, `EventEmitter2` — and pure logic is tested with no mocks at all (`TEST-04`).

## Development commands

Run from `backend/`:

| Command | What it does |
|---|---|
| `npm run start:dev` | Nest watch mode. |
| `npm run dev` | Watch mode plus barrel regeneration. See `DEVN-06` before relying on it. |
| `npm run stack:up` | Docker compose local stack. |
| `npm run stack:up:scaled` | Local stack with the cluster overlay. |
| `npm run stack:down` | Tear the stack down. |

Deployment artifacts live under `backend/deploy/{docker,k8s,mediamtx,scripts}`
(`DIR-09`, [ADR-0007](../adr/0007-backend-deploy-layout.md)).

## Documentation tooling

Decided in [ADR-0006](../adr/0006-documentation-tooling-choices.md): ADRs adopted, Mermaid
adopted for all diagrams in repository Markdown (`DOC-02`), Backstage rejected at this scale.
The LikeC4 trial that ADR-0006 also opened has since ended and the model was removed
([ADR-0016](../adr/0016-drop-likec4-architecture-model.md)); `DOC-04`, its maintenance rule, is
retired. There is no diagram toolchain to install — Mermaid renders natively on GitHub, in VS
Code, and in Obsidian.

The OpenSpec and Obsidian workflow is decided in
[ADR-0015](../adr/0015-adopt-spec-driven-development-and-obsidian-navigation.md); `.obsidian/`
is gitignored and local.
