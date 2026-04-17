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
- Use two distinct layers: **Client** (low-level) and **Service** (high-level)

Client:

- Owns connection details and transport configuration
- Performs raw operations (HTTP calls, socket messages, SDK usage)
- No business logic
- No error handling beyond propagation

Service:

- Orchestrates business logic around the client
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

### Service Roles (Prescriptive)

Each service must fulfill exactly one role. When a service begins to cover multiple roles, split it.

- **Read** — query and return data without side effects
- **Mutation** — change domain state
- **Lifecycle** — manage creation, teardown, and state transitions of a resource
- **Orchestration** — coordinate external side effects and cross-service workflows

### Dependency Flow

```
Higher-level orchestration → focused services → data access
```

---

## Barrel Exports (`index.ts`)

- Every folder must have an `index.ts` that re-exports all public members from that folder, including sub-folder barrels
- Order exports from shortest path at the top to longest at the bottom
- All sibling files and sub-folder index files are exported — nothing is skipped unless explicitly internal

---

## DTO Conventions

### Validation

- Use `class-validator` for all DTO validation
- Validation is required only at system boundaries:
    - Incoming requests to controllers
    - Incoming responses from external API clients

### Separation

- Transport-layer DTOs (controller DTOs, external API DTOs) must be separate from business-layer DTOs
- Controllers and API clients define their own DTOs with validation decorators
- Use `class-transformer` to convert transport DTOs into business-layer DTOs before passing to services
- Services must never receive or return transport-layer DTOs

### Naming

- Controller DTOs: `<Action><Entity>Dto` (e.g. `CreateStreamDto`, `UpdatePodDto`)
- Business-layer DTOs: named after domain intent, without transport prefixes
- Response DTOs: `<Entity>ResponseDto` when a shaped response is returned from a controller

---

## NestJS Decorators & Middleware

### Guards

- Use guards exclusively for authentication and authorization
- Guards must not contain business logic

### Pipes

- Use pipes for validation and data transformation
- Apply `ValidationPipe` at the controller or route level for DTO validation

### Interceptors

- Use interceptors for cross-cutting concerns that wrap execution (e.g. logging, timing, response mapping)
- Interceptors must not contain business logic

### Custom Decorators

- Use decorators to attach metadata and declare behavior
- Decorators must not implement logic — they only mark intent for guards, pipes, or interceptors to act on

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

## Testing

### File Placement

- All tests live in a top-level `test/` directory, mirroring the `src/` folder structure
- Tests do not live next to source files

### Naming

- Unit tests: `<name>.test.ts`
- Integration tests: `<name>.spec.ts`

### Coverage Requirements

- All services must be tested for their core logic
- Any interaction between two services that affects data shape or values must be tested
- Any integration between two services that is part of a data flow must be tested

### Mocking

- Mock only at external boundaries (databases, APIs, I/O)
- Do not mock domain logic or pure functions — test them directly
- Use dependency injection to substitute dependencies in tests
- Prefer minimal, focused mocks over broad mocking of entire modules

### Forbidden

- Tests that depend on execution order
- Tests that rely on shared mutable state between cases
- Skipped or commented-out tests committed to the repository

---

**Last Updated**: April 2026
**Scope**: backend systems
