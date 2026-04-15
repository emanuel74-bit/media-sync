# Role

You are a senior software architect and codebase optimizer.

# Objective

Scan the entire codebase and identify code pieces, logical units, or structures that:

- perform similar responsibilities
- implement similar logic
- solve the same problem in slightly different ways
- are behaviorally equivalent or highly reminiscent

Your goal is to consolidate them into clean, reusable, and well-designed abstractions.

---

# 1. Detection Criteria

Identify duplication or similarity across:

- Functions with similar logic but different names
- Services handling similar workflows
- Repeated conditional logic patterns
- Similar data transformations
- Repeated orchestration flows
- Slight variations of the same algorithm

Also detect:

- Copy-pasted code
- Diverging implementations of the same concept
- Parallel structures that should be unified

---

# 2. Analysis Requirements

For each match found:

- Compare responsibilities and intent
- Identify common behavior vs unique behavior
- Determine if they represent:
    - the same abstraction
    - variants of a strategy
    - duplicated orchestration logic

---

# 3. Refactoring Strategy

Unify duplicated logic using the most appropriate design approach:

## When logic is identical

- Extract into a single reusable function or service

## When logic is similar but varies slightly

- Use Strategy Pattern (replace conditionals)
- Use polymorphism via interfaces or abstract classes

## When object creation varies

- Use Factory Pattern

## When external systems differ

- Use Adapter Pattern

## When orchestration is repeated

- Extract orchestration service or workflow unit

---

# 4. Architectural Constraints (STRICT)

- MUST comply with:
  .github/prompts/architecture-guidelines.prompt.md

- MUST comply with:
  .github/prompts/codebase-structure.prompt.md

- Do NOT:
    - introduce cross-layer violations
    - break module boundaries
    - leak database models into services
    - create shared “god utilities”

---

# 5. Cohesion & Responsibility Rules

- Ensure each extracted unit has:
    - a single responsibility
    - high cohesion
    - clear purpose

- Do NOT over-generalize abstractions
- Avoid creating overly generic or vague utilities

---

# 6. Coupling Reduction

- Replace duplicated dependencies with abstractions
- Introduce interfaces at boundaries
- Use dependency injection

---

# 7. Naming and Clarity

- Name abstractions based on intent, not implementation
- Ensure new structure improves readability and discoverability

---

# 8. Output Requirements

For each identified case:

1. Show duplicated or similar code units
2. Provide the unified abstraction
3. Provide the refactored version of affected code
4. Apply the most appropriate design pattern

- Output only code and structured results
- No explanations
- No pseudo-code

---

# 9. Anti-Patterns to Eliminate

- Copy-paste reuse
- Conditional-heavy branching for similar logic
- Multiple services solving the same problem
- Slightly modified duplicate functions
- Hidden duplication across modules

---

# 10. Success Criteria

- Reduced code duplication
- Clear abstraction boundaries
- Improved readability and maintainability
- Strong alignment with SOLID principles
- Consistent patterns across the codebase

# Advanced Unification Rules

- Prefer polymorphism over conditionals
- Use abstract classes or interfaces to unify behavior
- Introduce generics when duplication is type-driven
- Ensure resulting abstractions follow real design pattern structures
