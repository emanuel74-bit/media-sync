# Code Conventions (Safe Mode) — MediaMTX Stream Sync Backend

This document defines **non-functional, cosmetic conventions** that can be safely applied by automated agents.

These rules focus ONLY on:

- readability
- naming
- consistency
- structure (non-behavioral)

---

## ⚠️ Core Rule

> No change in this document may alter runtime behavior.

If applying a rule could affect:

- execution order
- control flow
- side effects
- data flow

→ **DO NOT APPLY IT**

---

## Naming

### Files

- Use **kebab-case** for all file names
  `streams.service.ts`, `create-stream.dto.ts`

- File names must reflect purpose
  ❌ `utils.ts`, `helpers.ts`
  ✅ `stream-hash.util.ts`

---

### Classes

- Use **PascalCase**
- Apply suffixes:

| Type       | Suffix       |
| ---------- | ------------ |
| Service    | `Service`    |
| Controller | `Controller` |
| Module     | `Module`     |
| DTO        | `Dto`        |

---

### Methods

- Use **camelCase**

- Must describe action clearly:
    - `findByName`
    - `assignToPod`
    - `collectMetrics`

- Avoid vague names:
    - ❌ `handleData`
    - ❌ `processStuff`

---

### Variables

- Use **camelCase**

- Must be descriptive:
    - ✅ `streamName`
    - ❌ `sname`

- Boolean variables must use:
    - `is`, `has`, `should`
    - e.g. `isDegraded`, `hasVideo`

- Collections of names:
    - must end with `Names`
    - e.g. `clusterNames`

---

## Code Style

- Keep consistent indentation and spacing
- Split long lines for readability
- Group related statements together
- Avoid deeply nested blocks when formatting can improve clarity

---

## File & Folder Structure (Safe Scope)

### Allowed

- Rename files and folders for clarity
- Move files **without changing import behavior**
- Group related files together

### Allowed (with caution)

- Split large files ONLY if:
    - exports remain identical
    - no logic is changed
    - no execution order is affected

---

## Imports & Exports

### No re-exports in non-`index.ts` files

- A file must only `export` what it **defines** — not what it imports from another file.
- Re-exporting an import (e.g. `export { Foo } from "./foo"` or `export * from "./foo"`) is **only allowed in barrel `index.ts` files**.
- Consumers must import each symbol directly from the file that defines it.

❌ Bad — `stream-inspection.repository.ts` re-exporting a type from the domain layer:
```ts
export { NewStreamInspectionData } from "../domain/stream-inspection-creation.domain";
```

✅ Good — each consumer imports `NewStreamInspectionData` from the domain directly:
```ts
import { NewStreamInspectionData } from "../../domain";
```

> Deprecated compatibility stubs (files that contain only re-exports) must be deleted; consumers must be updated to reference the canonical source.

---

## Function Readability

- Keep functions readable and focused
- Recommended: ≤ 30 lines
- Hard limit: 50 lines (DO NOT auto-fix beyond this)

### Extraction Rule (Safe Only)

You may extract a function ONLY if:

1. It is **pure (no side effects)**
2. It does NOT depend on `this`
3. It does NOT mutate external state
4. It preserves execution order

Otherwise:
→ DO NOT extract

---

## Formatting Constants & Utilities

- Use `UPPER_SNAKE_CASE` for constants
- Keep utility names descriptive:
    - `stream-hash.util.ts`
    - `build-active-filter.util.ts`

---

## Logging (Cosmetic Only)

- Replace `console.log` with NestJS `Logger`
- Do NOT change log content or logic
- Only improve formatting/consistency

---

## Type Safety (Safe Subset)

- Do NOT introduce `any`
- Add missing explicit return types if obvious and safe
- Do NOT refactor types or interfaces

---

## Forbidden Changes

The following are **explicitly not allowed** in Safe Mode:

- ❌ Changing business logic
- ❌ Modifying control flow
- ❌ Introducing new abstractions
- ❌ Refactoring conditionals into polymorphism
- ❌ Splitting or merging services
- ❌ Changing dependency structure
- ❌ Moving logic between layers
- ❌ Modifying database access patterns
- ❌ Changing function responsibilities

---

## Rename Safety Rules

Renaming is allowed ONLY if:

- The new name is clearly better
- All references are updated
- No domain meaning is changed

Avoid renaming:

- domain-critical identifiers
- externally referenced names (API routes, DTO fields)

---

## Output Requirement (For Agents)

Every change must include confirmation:

"This change does not affect runtime behavior."

---

## Goal

Make the codebase:

- more readable
- more consistent
- easier to navigate

WITHOUT changing what the system does.
