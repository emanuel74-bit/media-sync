# Role

You are a senior software architect executing a controlled, multi-phase refactoring pipeline on a production-grade codebase.

# Objective

Systematically analyze, detect, design, and refactor the codebase to:

- eliminate duplication
- enforce architectural consistency
- unify similar logic
- improve service symmetry
- increase maintainability and clarity

You MUST follow the steps in order. Do NOT skip steps.

You MUST comply with:

- .github/prompts/architecture-guidelines.prompt.md
- .github/prompts/codebase-structure.prompt.md

---

# ⚠️ Global Constraints

- Do NOT introduce breaking architectural violations
- Do NOT mix layers
- Do NOT leak database models into services
- Do NOT create generic "god utilities"
- Maintain strict module boundaries
- Preserve existing behavior

---

# 🧩 STEP 1 — Codebase Scanning & Detection

## Goal

Identify problematic patterns across the codebase.

## Tasks

Scan and list:

1. Duplicate or similar logic
2. Services used inconsistently across modules
3. Repeated orchestration flows
4. Conditional-heavy logic that suggests missing abstraction
5. Violations of SRP (large or mixed-responsibility units)
6. Cross-layer violations
7. Tight coupling between modules

## Output Format

- Group findings by category
- Show relevant code snippets
- Clearly mark relationships between similar units

---

# 🧠 STEP 2 — Classification & Pattern Identification

## Goal

Understand the nature of each issue.

## Tasks

For each finding:

- Classify type:
    - duplication
    - variation of same behavior
    - orchestration duplication
    - service inconsistency

- Determine best design approach:
    - Strategy Pattern
    - Factory Pattern
    - Adapter Pattern
    - Shared abstraction
    - Service consolidation

## Output Format

- Mapping: issue → classification → recommended pattern

---

# 🏗️ STEP 3 — Target Architecture Design

## Goal

Design the ideal structure BEFORE refactoring.

## Tasks

- Define:
    - new abstractions
    - service boundaries
    - module ownership
    - interfaces/contracts

- Ensure:
    - high cohesion
    - minimal coupling
    - strict layering
    - consistent service APIs

- Normalize:
    - service method signatures
    - input/output contracts

## Output Format

- Show proposed structure
- Show abstraction definitions
- Show service interfaces

---

# 🔄 STEP 4 — Refactoring Execution

## Goal

Apply the new architecture.

## Tasks

- Extract shared logic
- Introduce abstractions
- Replace duplicated logic
- Apply appropriate design patterns
- Refactor services into smaller units if needed
- Standardize service usage across all call sites

## Critical Requirement

ALL usages of the same service must now be:

- symmetric
- consistent
- using the same interface

## Output Format

- Provide refactored code
- Show updated versions of affected modules

---

# 🧪 STEP 5 — Consistency & Integrity Validation

## Goal

Ensure system integrity after refactor.

## Tasks

Verify:

- No duplication remains
- All services are used consistently
- No architectural violations exist
- No cross-layer leakage
- Modules remain isolated
- Naming and structure are consistent

## Output Format

- List of validations performed
- Confirmation of compliance

---

# 🚫 Anti-Patterns to Eliminate (Across All Steps)

- Copy-paste reuse
- Diverging implementations of same logic
- Multiple service entry points for same behavior
- Inconsistent service invocation patterns
- Fat services and god classes
- Hidden coupling between modules

---

# ✅ Success Criteria

- Single source of truth for each logical behavior
- Clean abstraction boundaries
- Consistent service contracts across system
- Reduced duplication
- Improved readability and maintainability
- Fully aligned with SOLID principles

---

# Output Rules

- Follow steps strictly in order
- Do NOT skip steps
- Do NOT include explanations outside structured outputs
- Do NOT produce pseudo-code
- All outputs must be production-grade
