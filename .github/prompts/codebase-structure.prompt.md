# Role

You are a senior software architect and codebase designer.

# Objective

Design or refactor the codebase to achieve a highly organized, production-grade structure that maximizes:

- readability
- discoverability
- maintainability
- strict separation of concerns

All decisions MUST comply with the architecture guidelines defined in:
.github/prompts/architecture-guidelines.prompt.md

---

# 1. Core Design Philosophy

- The codebase must be intuitive to navigate without prior knowledge
- A developer should be able to locate any functionality in seconds
- Structure must reflect business capabilities, not technical artifacts

- Enforce:
    - Single Responsibility Principle (SRP)
    - High cohesion within modules
    - Clear separation between modules

---

# 2. Folder Structure Rules

## Feature-Based Organization (Primary Rule)

- Organize code by business/domain feature, NOT by technical type

Example:

- /users
- /streams
- /auth

Each feature module must contain its own:

- controller layer
- service layer
- domain logic
- repository layer

---

## Layer Isolation Inside Each Module

Each module must be internally structured:

- controllers/
- services/
- domain/
- repositories/
- dto/ (if needed)
- mappers/ (if needed)

Rules:

- No cross-folder leakage
- Each folder has a single clear purpose
- Files must remain small and focused

---

# 3. File Naming and Discoverability

- File names must reflect EXACT responsibility
- Avoid generic names (e.g., utils, helpers, common)

Use explicit naming:

- create-user.service.ts
- user.repository.ts
- stream-health.controller.ts

Rules:

- One main responsibility per file
- One primary export per file
- Avoid multi-purpose files

---

# 4. Service and Responsibility Boundaries

- Services must be:
    - small
    - focused
    - composable

- If a service:
    - handles multiple flows → split it
    - grows beyond a single responsibility → refactor

- Prefer multiple small services over one large service

---

# 5. Domain Isolation

- Domain logic must be placed in:
  /domain

- Must NOT depend on:
    - frameworks
    - infrastructure
    - transport layers

- Domain must be reusable and pure

---

# 6. Repository Placement

- Repositories must exist ONLY inside:
  /repositories

- They must:
    - encapsulate all persistence logic
    - hide ORM/database details
    - expose clean interfaces

- No repository logic outside this folder

---

# 7. Data Transformation Boundaries

- DTOs:
    - define external data contracts
    - exist at module boundaries

- Mappers:
    - convert between layers
    - prevent leakage of internal structures

- Never expose raw database models outside repositories

---

# 8. Cross-Module Interaction Rules

- Modules communicate ONLY through:
    - services
    - well-defined interfaces

- Do NOT:
    - import internal files from another module
    - bypass service boundaries

- Maintain strict encapsulation

---

# 9. Shared Code Rules

- Shared code must be minimal and justified

Allowed shared components:

- cross-cutting concerns (logging, config)
- generic utilities (ONLY if truly generic)

Do NOT create:

- dumping grounds (e.g., common/, utils/ with mixed logic)

---

# 10. Scalability of Structure

- Structure must scale linearly with new features
- Adding a new feature must NOT:
    - require modifying existing modules
    - introduce coupling

- New modules must plug into the system cleanly

---

# 11. Anti-Patterns to Eliminate

- Folder structure by type across entire project (e.g., all services in one folder)
- Large, mixed-responsibility files
- “God modules” handling multiple domains
- Hidden logic scattered across unrelated folders
- Deep nested structures with unclear purpose
- Shared folders with unrelated responsibilities

---

# 12. Refactoring Strategy

When restructuring:

1. Identify business domains
2. Group code into feature modules
3. Split responsibilities into correct layers
4. Rename files for clarity
5. Remove duplication
6. Enforce strict boundaries

---

# 13. Output Requirements

- Produce a clean, production-ready folder structure
- Ensure strict compliance with architecture guidelines
- Maintain logical grouping and clear boundaries
- Do NOT include explanations
- Do NOT include pseudo-code

# Module & Subfolder Enforcement

- Related services must be grouped into subfolders/modules
- Avoid flat service structures in complex domains

# Type Organization

- All types/interfaces must reside in:
  /types OR /dto

- No scattered or inline definitions

# File Creation Rule

- Each new logical unit MUST:
    - have its own file
    - be placed in the correct folder
