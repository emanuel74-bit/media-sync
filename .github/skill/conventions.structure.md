# Code Conventions — Structure & Organization

## Rule Priority

- ABSOLUTE: must never be violated
- STRUCTURE: defines placement
- HEURISTIC: guidance, not mandatory

---

## Evaluation Timing (MANDATORY)

Structure rules MUST be applied after naming classification and before implementation.

---

## Core Principle (ABSOLUTE)

A folder represents exactly ONE purpose.

---

## Feature Structure

Each feature MAY include:

- `domain/`
- `services/`
- `controllers/`
- `repositories/`
- `dto/`

---

## Feature Root Rules (ABSOLUTE)

- Root files MUST represent the full feature
- Files for narrower responsibilities MUST NOT remain at root

---

## Folder Rules

### MUST (ABSOLUTE)

- One folder = one purpose
- Multiple independent concerns MUST be split
- Folder names MUST reflect responsibility

### SHOULD (HEURISTIC)

- Split when purpose requires "and"
- Group closely related responsibilities

---

## Folder Hierarchy (STRUCTURE)

- Parent folder → broad purpose
- Child folder → narrower responsibility
- Leaf folder → concrete implementation

---

## Variant Rule (ABSOLUTE)

- Each variant MUST have its own folder
- Shared logic MAY remain in parent
- Variant-specific files MUST stay inside variant folder

---

## Domain Folder (ABSOLUTE)

Constraints:

- MUST NOT contain framework logic
- MUST NOT contain infrastructure concerns

Structure:

- `domain/enums/`
- `domain/types/`
- `domain/consts/`

Rules:

- `.domain.ts` → entities only
- No logic allowed in enums/types/consts

---

## Purpose Folders

Allowed only when representing real responsibility:

- `mappers/`
- `policies/`
- `registry/`
- `events/`
- `lifecycle/`

Constraints:

- MUST NOT be generic containers
- MUST represent a single concern

---

## Infrastructure (ABSOLUTE)

- External systems MUST live under `infrastructure/`
- Each system MUST have its own module
- All structure rules apply recursively

---

## Sub-Features (STRUCTURE)

- Each responsibility MUST have its own folder
- Unrelated concerns MUST NOT be mixed

---

## Barrel Exports (ABSOLUTE)

- Every folder MUST contain `index.ts`
- MUST export all public members
- Export order MUST go from shortest to longest path

---

## Stopping Condition (HEURISTIC)

A folder structure is valid when:

- Each folder has a single clear responsibility
- No file belongs more naturally to another folder
- No rule violation exists

Further splitting is not required beyond this point
