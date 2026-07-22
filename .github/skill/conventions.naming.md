# Code Conventions — Naming & File Roles

## Rule Priority

- ABSOLUTE: must never be violated
- CLASSIFICATION: used to determine file role
- ENFORCEMENT: validates correctness after classification

---

## Evaluation Order (MANDATORY)

Agents MUST evaluate in this exact order:

1. Determine responsibility
2. Apply classification rules (top to bottom)
3. Assign suffix (first valid match wins)
4. Apply enforcement rules
5. Apply dependency injection rules

No step may be skipped or reordered.

---

## File Naming (ABSOLUTE)

- Use kebab-case
- Name files after responsibility
- Every file MUST have exactly one role suffix

---

## Required File Suffixes

| Suffix           | Purpose                                     |
| ---------------- | ------------------------------------------- |
| `.module.ts`     | NestJS module definition                    |
| `.service.ts`    | Business logic, orchestration, side-effects |
| `.controller.ts` | HTTP entry point                            |
| `.repository.ts` | Data access contract or implementation      |
| `.domain.ts`     | Entity with identity and/or behavior        |
| `.types.ts`      | Shape-only types and interfaces             |
| `.enum.ts`       | Finite domain states                        |
| `.const.ts`      | Static values and configuration             |
| `.dto.ts`        | Transport-layer DTOs                        |
| `.schema.ts`     | Database schema                             |
| `.mapper.ts`     | Shape transformation (pure)                 |
| `.policy.ts`     | Decision logic (select/filter/evaluate)     |
| `.factory.ts`    | Object construction with rules/defaults     |
| `.util.ts`       | Pure helpers (no architectural role)        |
| `.strategy.ts`   | Strategy pattern implementation             |
| `.client.ts`     | External system communication               |
| `.gateway.ts`    | WebSocket or event gateway                  |

---

## Classification Rules (CLASSIFICATION — FIRST MATCH WINS)

Evaluate top to bottom. Stop at first match.

1. Transforms data shape between layers or models
   → `.mapper.ts`

2. Selects, filters, ranks, or evaluates rules
   → `.policy.ts`

3. Constructs objects with defaults, invariants, or assembly rules
   → `.factory.ts`

4. Contains business logic or side effects
   → `.service.ts`

5. Pure, stateless, no architectural role
   → `.util.ts` (FINAL FALLBACK — MUST be last)

---

## Classification Exclusivity (ABSOLUTE)

- Only one suffix may be assigned
- Once a rule matches, no further rules may be evaluated
- `.util.ts` MUST only be used if no other rule matches

---

## Enforcement Rules (ABSOLUTE)

- `.mapper.ts` MUST be pure and have no side effects
- `.policy.ts` MUST NOT mutate external state
- `.factory.ts` MUST make all defaults and construction rules explicit
- `.util.ts` MUST NOT contain business logic
- `.service.ts` owns side effects and orchestration

---

## Dependency Injection Rules (ENFORCEMENT)

- `.util.ts` → MUST NOT be injectable
- `.mapper.ts` → MAY be injectable only if dependencies exist
- `.policy.ts` → MUST be injectable if multiple implementations exist
- `.factory.ts` → MUST be injectable only if dependencies exist

---

## Interfaces (ABSOLUTE)

- All interfaces MUST be defined in `.types.ts`
- `.interface.ts` files are forbidden

---

## Naming Conventions (ENFORCEMENT)

### Classes

- PascalCase
- MUST reflect responsibility

### Methods / Variables

- camelCase
- Booleans MUST use `is/has/should`
- Collections MUST be plural or descriptive

---

## Constraints (ABSOLUTE)

- Functions MUST be small and focused
- Classes MUST have a single responsibility
- High branching complexity is forbidden
