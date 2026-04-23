# Code Conventions — Backend System (Generalized)

---

## Naming

### Files (kebab-case)

- Name files after their responsibility, not generic terms
- Every file must have a role suffix — no unsuffixed files

#### Required File Suffixes

| Suffix           | Purpose                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `.module.ts`     | NestJS module definition                                                                                   |
| `.service.ts`    | Business logic, orchestration, side-effect ownership                                                       |
| `.controller.ts` | HTTP entry point                                                                                           |
| `.repository.ts` | Data access contract (abstract) or implementation                                                          |
| `.domain.ts`     | Entity with identity and/or behavior                                                                       |
| `.types.ts`      | Plain type/interface definitions (shape only, no logic)                                                    |
| `.enum.ts`       | Finite domain state sets                                                                                   |
| `.const.ts`      | Fixed values, configuration data, static lookup tables                                                     |
| `.dto.ts`        | Data transfer objects (transport layer only)                                                               |
| `.schema.ts`     | Database schema definition                                                                                 |
| `.mapper.ts`     | One-way or two-way shape transformation between layers or models; always pure, no side effects             |
| `.policy.ts`     | Decision logic that selects, ranks, filters, or evaluates candidates against business or operational rules |
| `.factory.ts`    | Controlled object construction from inputs; makes all defaults and assembly rules explicit at the boundary |
| `.util.ts`       | Pure stateless helpers that do not represent a primary architectural role (predicates, formatting, math)   |
| `.strategy.ts`   | Strategy pattern implementation                                                                            |
| `.client.ts`     | Low-level external system communication                                                                    |
| `.gateway.ts`    | WebSocket or event gateway                                                                                 |

#### Suffix Selection Rules

- A file that transforms a shape between two layers or models must use `.mapper.ts`, not `.util.ts`
- A file that selects among candidates or evaluates whether a business rule holds must use `.policy.ts`, not `.util.ts`
- A file that constructs a higher-level object from inputs (especially when defaults, timestamps, or identifiers are involved) must use `.factory.ts`, not `.util.ts`
- A file that is pure, stateless, and does not represent one of the above primary roles may use `.util.ts`
- Adding a new suffix requires a definition row in this table, a placement rule, a DI expectation, and at least one example

#### DI Expectations by Suffix

- `.mapper.ts` — pure functions or classes; provider registration is not required unless the mapper has injected dependencies
- `.policy.ts` — may be a pure class or injectable; must be injectable when multiple implementations exist and selection is via DI
- `.factory.ts` — may be a pure class with static methods or injectable; must be injectable only when the factory has injected dependencies
- `.util.ts` — never injectable; always called directly as a pure function

#### Interfaces

- Interfaces belong in `.types.ts` files, not separate `.interface.ts` files

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
- Separate shared application logic into a common/shared directory
- Put pure, reusable, framework-agnostic code in `libs/`
- Keep transport-layer types (DTOs) separated from domain logic
- Do not place business logic in transport or configuration layers

### Feature Module Structure

No standard layer folder is mandatory. Each feature includes only the layers it needs to fulfill its purpose. When a standard layer is present, it must use the exact standard folder name for that layer:

| Folder          | Contents                                                           |
| --------------- | ------------------------------------------------------------------ |
| `domain/`       | Business entities, types, enums, constants (no framework concerns) |
| `services/`     | Business logic services                                            |
| `controllers/`  | HTTP entry points                                                  |
| `repositories/` | Abstract data access contracts                                     |
| `dto/`          | Transport-layer DTOs with validation decorators                    |

### Feature Root

- Files placed directly under a feature root must either define the public contract of the whole feature or be shared across multiple child responsibilities inside that feature
- Root files are limited to feature-wide entry points, contracts, coordination artifacts, and other files that describe the feature as a whole
- A file dedicated to one narrower responsibility must not remain at the feature root and must move into the child folder for that responsibility

### Folder Hierarchy

- Every folder must represent exactly one scope: the whole feature, one purpose within that feature, or one leaf responsibility within that purpose
- A purpose folder may contain a mix of root-level files and child folders only when every item serves that one purpose
- Root-level files inside a purpose folder must either coordinate that full purpose or be shared across multiple child responsibilities inside that purpose
- Concrete leaf implementations must not remain flat at the root of a purpose folder
- Create deeper folders to express narrower responsibilities, not to mirror file types or add incidental depth

### Folder Split Rule

- There is no numeric file-count limit for a folder
- Split a folder as soon as it contains two or more narrower concerns that can be named independently
- When two or more files are more closely related to each other than to the rest of the folder, they must move into a dedicated child folder
- If a folder requires "and" to describe its purpose, split it
- A child responsibility folder owns all files dedicated only to that responsibility

### Variant Families

- A family of implementations under a shared contract counts as multiple concrete responsibilities
- Each implementation variant must have its own child folder even when it currently has only one primary file
- Shared contracts, registries, selectors, dispatchers, and cross-variant utilities may stay at the parent purpose level only when they are used across multiple variants
- Files used by only one variant must live inside that variant's folder

### Folder Naming

- Standard layer folders must use these exact names: `domain/`, `services/`, `controllers/`, `repositories/`, `dto/`
- Sub-feature and child responsibility folders use kebab-case and are named after responsibility, behavior, or grouped concern
- Sub-feature folders may be singular or plural depending on whether they represent one concern or a group of related concerns
- Name folders by purpose, not by vague technical labels, temporary states, or generic implementation labels

### Domain Folder Contents

- Put all business behavior and invariants in `domain/`
- `domain/` must contain no framework or infrastructure concerns
- Organize non-entity domain files into dedicated sub-folders:
    - `domain/enums/` — finite business states
    - `domain/types/` — shape-only definitions, including interfaces
    - `domain/consts/` — fixed domain values
- `.domain.ts` files contain entities with identity and/or behavior
- Never place logic in enum, types, or const files

### Standard Purpose Folders

- Folders such as `utils/`, `mappers/`, `rules/`, `events/`, `registry/`, `parsers/`, `alerts/`, `query/`, and `lifecycle/` are valid when they represent a real sub-feature, a design pattern implementation, or concentrated logic
- These folders are acceptable because they describe purpose, not because they are default folder types
- A purpose folder is a boundary for one concern, not a flat container for multiple unrelated leaf implementations
- Keep only purpose-wide coordination or shared artifacts at the root of a purpose folder and move narrower responsibilities into child folders
- Mapping files must use the `.mapper.ts` suffix; placement under a `mappers/` folder is recommended but not required

### Infrastructure Module (`infrastructure/`)

- Use `infrastructure/` for anything that depends on the outside world (databases, external APIs, third-party SDKs)
- Use `libs/` for pure, reusable, framework-agnostic code
- Each external system gets its own sub-module within `infrastructure/`
- Within an infrastructure sub-module, apply the same root, purpose, and child-responsibility rules used everywhere else in the codebase
- Organize distinct responsibilities into purpose folders such as `clients/`, `services/`, `registry/`, `mappers/`, or other clear sub-features
- If an integration contains multiple concrete variants under a shared contract, each variant must have its own child folder

### Sub-Feature Structure

- Each distinct responsibility within a feature must be grouped into its own subfolder
- Group files by behavior and purpose, not just by file type
- Avoid mixing unrelated responsibilities in the same directory

Guidelines:

- A folder should represent a single clear purpose
- Shared logic may live at a feature root or purpose root only when it is used across multiple child responsibilities and still represents the full scope of that folder
- A parent folder may keep an aggregate or facade file at its root only when that file coordinates the full purpose of the folder rather than one narrower responsibility

---

## Architecture

### Layers

- Entry layer (e.g. controllers, gateways) handles input/output only
- Core layer (services) contains business logic
- Data layer (repositories) handles persistence
- Integration layer (clients) handles external systems
- Utilities are pure and stateless

### Module Naming

- Module files must match their folder name: `<folder-name>.module.ts`

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

### Repository Naming

- Abstract repository (feature layer): `<entity>.repository.ts` (e.g. `pod.repository.ts`)
- Concrete implementation (infrastructure layer): `<technology>-<entity>.repository.ts` (e.g. `mongo-pod.repository.ts`)

### Structure per entity

- Domain definition
- Repository contract (in feature module)
- Implementation (in `infrastructure/`)
- Schema/configuration (if applicable)

---

## Testing

### File Placement

- All tests live in a top-level `test/` directory, mirroring the `src/` folder structure
- The test tree must also mirror the responsibility boundaries established in `src/`; if source code splits a responsibility into a child folder, the corresponding tests must mirror that split under `test/`
- Tests do not live next to source files
- Co-located `.spec.ts` files in `src/` are legacy and should be migrated to `test/`

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
