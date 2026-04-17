# Code Conventions — Backend System (Generalized)

---

## Naming

### Files (kebab-case)

- Use consistent suffixes to indicate role (e.g. service, controller, module, schema, dto, util, types)
- Name files after their responsibility, not generic terms

### Classes (PascalCase)

- Use consistent suffixes to reflect role
- Class name must clearly express responsibility

### Methods / Variables

- camelCase
- Names must describe intent
- Booleans use `is/has/should`
- Collections use pluralized or descriptive suffix

### Limits

- Keep functions small and focused
- Keep classes bounded to a single responsibility
- Avoid high branching complexity

---

## File Structure

- Organize code by feature/domain
- Keep related files co-located
- Separate shared logic into a common/shared directory
- Keep transport-layer types (DTOs) separated from domain logic
- Do not place business logic in transport or configuration layers

### Sub-Feature Structure

- Each distinct responsibility within a feature must be grouped into its own subfolder
- Group files by behavior, not by type
- Avoid mixing unrelated responsibilities in the same directory

Guidelines:

- A folder should represent a single clear purpose
- If a folder requires "and" to describe its purpose, split it
- Shared logic within a feature should live at the feature root only if used across multiple sub-features

---

## Architecture

### Layers

- Entry layer (e.g. controllers, gateways) handles input/output only
- Core layer (services) contains business logic
- Data layer (repositories) handles persistence
- Integration layer (adapters/clients) handles external systems
- Utilities are pure and stateless

### Dependencies

- Dependencies must flow inward toward business logic
- Higher-level layers depend on lower-level abstractions
- Avoid tight coupling between unrelated modules

### Forbidden

- Skipping layers (e.g. entry layer accessing data directly)
- Circular dependencies
- Hidden or implicit dependencies
- Global mutable state

---

## Integration Pattern

- Separate low-level communication from higher-level logic

Low-level component:

- Owns connection details
- Performs raw operations
- No business logic
- No error handling beyond propagation

High-level component:

- Orchestrates logic
- Handles errors and fallbacks
- Transforms data into domain form

---

## Type Safety

- Avoid untyped or loosely typed values
- Define explicit types at boundaries
- Use constrained sets (e.g. enums or equivalents) for fixed domains
- All functions must declare input and output types
- Group related parameters into named structures when needed

Type locations:

- Shared domain concepts → shared domain layer
- External system types → integration layer

---

## Dependency Management

- Use explicit dependency injection
- Remove unused dependencies
- Avoid optional or ambiguous wiring patterns
- Import only what is required
- Expose only what other modules need

---

## Error Handling

- Do not ignore errors
- Log all failures
- Fail early when required data is missing
- Contain failures within logical boundaries
- Do not embed retry policies in business logic

---

## Logging

- Use a centralized logging mechanism
- Avoid direct console usage
- Include relevant identifiers in logs
- Use appropriate log levels
- Attach structured context where useful

---

## Domain Rules

- Model lifecycle states explicitly
- Use constrained values for state transitions
- Ensure operations are deterministic and repeatable
- Avoid hidden side effects

---

## Code Structure

- One primary entity per file
- Extract reusable logic into dedicated files
- Keep pure logic outside classes
- Define constants at module level or dedicated files
- Name constants clearly and consistently

---

## Class Design

- Each class must have one clear responsibility
- Avoid large or multi-purpose classes
- Extract logic before splitting into new abstractions

---

## Reuse

- Do not duplicate logic
- Extract shared behavior into named units
- Prefer pure, reusable functions

---

## Polymorphism / Declarative Design

- Prefer data-driven structures over repeated conditional logic
- Prefer iteration over duplication
- Represent variation as data where possible

---

## Function Design

- Functions should do one thing
- Extract complex or repeated logic
- Use descriptive parameter names
- Prefer named structures over inline object construction

---

## Error Handling (Structure)

- Each function is responsible for its own failure handling
- Callers should not duplicate error handling unless context-specific
- Top-level processes may include a safety boundary

---

## Logical Extraction

- Any block with a clear purpose should be named and extracted
- Code should read as a sequence of meaningful operations

---

## Service Design

- Services must represent a single domain responsibility
- Split services when multiple roles emerge
- Consumers should depend only on what they use

### Service Roles (Generalized)

- Read operations
- State mutation
- Lifecycle management
- External side-effect orchestration

### Dependency Flow

```
Higher-level orchestration → focused services → data access
```

---

## Anti-Patterns (Forbidden)

- Hardcoded domain values instead of constrained types
- Mixing layers
- Duplicated logic
- Large unstructured functions
- Hidden side effects
- Overloaded classes with multiple responsibilities
- Rebuilding static data repeatedly
- Poorly named variables or parameters
- Tight coupling to infrastructure details

---

## Data Access Pattern

### Layers

- Domain: pure types
- Repository: abstract data access contract
- Implementation: concrete persistence logic
- Service: orchestration
- Entry: transport layer

### Rules

- Depend on abstractions, not implementations
- Keep persistence details isolated
- Use clear method naming for operations

### Structure per entity

- Domain definition
- Repository contract
- Implementation
- Schema/configuration (if applicable)

---

**Last Updated**: April 2026
**Scope**: backend systems
