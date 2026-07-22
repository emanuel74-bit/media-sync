# LikeC4 architecture model (trial)

Single source of truth for structural architecture diagrams, on trial per
[ADR-0006](../adr/0006-documentation-tooling-choices.md). The model lives in
`media-sync.c4`; the views are generated from it, so all zoom levels stay
consistent by construction.

## Requirements

LikeC4 needs **Node ≥ 22** (ideally ≥ 22.12). This repo's default toolchain
runs Node 18, so use the nvm-installed Node 22 for these commands (e.g.
`nvm use 22.4.1`, or prefix `PATH` with the nvm v22 folder for one command).

Note: on Node 22.x below 22.12, npm skips rolldown's native binding (engine
check on an optional dependency); this package.json therefore pins
`@rolldown/binding-win32-x64-msvc` explicitly so the build works on 22.4.1.

## Look at it

```bash
cd docs/architecture
npm install

# Interactive dev server with click-through navigation
npm run dev

# Static site (output: docs/architecture/dist — gitignored, open index.html)
npm run build

# Export PNGs (output: docs/architecture/export)
npm run export
```

Or install the **LikeC4 VS Code extension** for inline preview and DSL
language support while editing `media-sync.c4`.

## What to evaluate during the trial

- Click from the landscape view into the platform, then into the Sync
  Service's feature modules — the same model rendered at three altitudes.
- Change something (e.g. add a component) and watch every affected view update.
- Decide per ADR-0006: keep it as the authoritative structure diagram source,
  or drop it and stay with Mermaid only. Either outcome gets a superseding ADR.

## Maintenance (DOC-04)

While the trial runs: when a container or backend feature module is added,
removed, or renamed, update `media-sync.c4` in the same change.
