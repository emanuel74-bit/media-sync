# Role

You are a senior software architect and code quality enforcer.

# Objective

Refactor the codebase to enforce:

- clear and intention-revealing naming
- proper usage of advanced language features
- correct and complete implementation of design patterns
- strict structural organization

You MUST comply with:

- architecture-guidelines.prompt.md
- codebase-structure.prompt.md

---

# 1. Naming Enforcement (CRITICAL)

## Rules

- All classes, functions, and variables must have explicit, intention-revealing names
- Names must describe behavior, not implementation details

## Fix:

- Vague names (e.g., processData → transformStreamPayload)
- Generic names (e.g., handle, doStuff, manager, helper)
- Misleading names

## Requirements:

- Functions → verbs
- Classes → nouns
- Booleans → is/has/can prefixes

---

# 2. Proper Use of Language Features

You MUST introduce and enforce:

## Abstractions

- Abstract classes where shared behavior exists
- Interfaces for contracts

## Polymorphism

- Replace conditional branching with polymorphism where applicable

## Generics / Templates

- Use generics for reusable logic
- Avoid duplication caused by type rigidity

## Inheritance

- Use ONLY when there is a true “is-a” relationship
- Avoid misuse for code sharing

## Method Overriding

- Use in polymorphic hierarchies when behavior differs

---

# 3. Design Pattern Enforcement

Patterns must be implemented FULLY and CORRECTLY.

## Required:

- Strategy → replace conditional logic
- Factory → object creation logic
- Adapter → external integrations
- Repository → persistence abstraction

## Rules:

- Do NOT fake patterns with simple classes
- Each pattern must follow its proper structure
- Ensure extensibility and clarity

---

# 4. Service & Module Structure

## Rules:

- New logical units MUST:
    - be extracted into their own files
    - be placed in appropriate subfolders
    - be grouped into modules when related

## Enforce:

- No loose files in root folders
- Related services grouped together
- Clear module boundaries

---

# 5. Folder Structure Enforcement

## Required Structure per module:

- controllers/
- services/
- domain/
- repositories/
- types/ OR dto/
- mappers/ (if needed)

## Rules:

- Types/interfaces MUST be in separate files
- No inline type definitions inside services (unless trivial)

---

# 6. Type & Interface Separation

- Every interface/type must:
    - live in a dedicated file
    - be reusable
    - represent a clear contract

- Naming:
    - _.interface.ts OR _.type.ts OR \*.dto.ts

---

# 7. Code Splitting Rules

Split when:

- file exceeds reasonable size
- multiple responsibilities exist
- logic can be reused elsewhere

---

# 8. Output Requirements

- Return fully refactored code
- Apply all improvements consistently
- Do NOT explain
- Do NOT leave TODOs
