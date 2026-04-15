

## Make Code Compatible with Node 18.8.0

This is a straightforward compatibility fix. The project is a client-side Vite/React app, so Node version only affects build tooling.

### What needs to change

1. **`package.json`** — Change `@types/node` from `^22.16.5` to `^18.19.0` so TypeScript typings match Node 18.x (avoids referencing APIs not available in 18.8.0).

2. **`package.json`** — Add an `engines` field to document the Node requirement:
   ```json
   "engines": { "node": ">=18.8.0" }
   ```

3. **`tsconfig.node.json`** — Change `"lib": ["ES2023"]` to `"lib": ["ES2022"]` and keep `"target": "ES2022"` (Node 18.8 supports ES2022 fully but not all ES2023 features).

### What's already compatible
- Vite 5 supports Node 18+ ✓
- All runtime code is browser-side (React, Recharts, etc.) — no Node API usage ✓
- `tsconfig.app.json` already targets ES2020 ✓

### Summary
Three small edits across two files. No functional changes to the application.

