# OpenSpec + Claude Code setup

These files are tailored for a repository with:

- `backend/CONVENTIONS.md` as the backend rule registry.
- `docs/adr/` as the existing ADR location.
- `npm run verify` as the required completion check.

If your conventions file is at the repository root, replace
`backend/CONVENTIONS.md` with `CONVENTIONS.md` in both supplied files.

## 1. Create a setup branch

```powershell
git switch -c chore/integrate-openspec
```

## 2. Check the OpenSpec runtime prerequisite

```powershell
node --version
```

OpenSpec requires Node.js 20.19.0 or newer. This does not require changing the
application's declared runtime target; the OpenSpec CLI itself must run under a
supported Node version.

## 3. Install and initialize OpenSpec

Run from the repository root:

```powershell
npm install -g @fission-ai/openspec@latest
openspec --version
openspec init --tools claude --profile core
```

This should create:

```text
openspec/
.claude/skills/openspec-*/
.claude/commands/opsx/
```

OpenSpec may also create or modify `CLAUDE.md`. Inspect the Git diff before replacing
anything.

## 4. Install the supplied project files

- Copy `CLAUDE.md` to the repository root.
- Copy `openspec/config.yaml` to `openspec/config.yaml`.

If OpenSpec added a marker block to an existing `CLAUDE.md`, preserve that generated
block and merge the supplied project instructions around it instead of deleting it.

Do not copy the entire conventions registry into `CLAUDE.md` or `config.yaml`.
Keeping one canonical copy avoids contradictory rules and excessive startup context.

## 5. Validate the setup

```powershell
openspec validate --all
git diff --check
git status --short
```

Start a new Claude Code session, then run:

```text
/context
```

Confirm that the repository-root `CLAUDE.md` appears under memory files.

Confirm the OpenSpec commands exist:

```text
/opsx:explore
```

If commands are missing:

```powershell
openspec update
```

Then restart Claude Code.

## 6. Use it for the first real change

Do not backfill specifications for the entire existing repository.

Start with one medium-sized upcoming change:

```text
/opsx:explore
```

Explain the change and ask Claude to inspect the relevant code, convention rule IDs,
and ADRs without modifying code.

Then:

```text
/opsx:propose descriptive-change-name
```

Review:

- `proposal.md`
- delta specs
- `design.md`
- `tasks.md`

After approval:

```text
/opsx:apply
```

Run repository validation:

```powershell
npm run verify
openspec validate --all
```

When implementation and specs agree:

```text
/opsx:sync
/opsx:archive
```

## Documentation responsibilities

| Artifact | Responsibility |
|---|---|
| `openspec/specs/` | Current intended observable behavior |
| `openspec/changes/` | Proposed change and implementation plan |
| `docs/adr/` | Durable architectural decisions and rationale |
| `backend/CONVENTIONS.md` | Current coding and structural law |
| `CLAUDE.md` | Workflow routing and persistent Claude instructions |
| Code and tests | Current implementation and validation evidence |

Do not create a second ADR directory under OpenSpec. Continue using `docs/adr/`.
