# Architecture Rules — Backend System

## Rule Priority

- ABSOLUTE: must never be violated
- STRUCTURAL: defines system design
- ENFORCEMENT: validation checkpoints

---

## Evaluation Order (MANDATORY)

Agents MUST enforce in this order:

1. Assign layer
2. Validate dependency direction
3. Validate separation rules
4. Apply service role constraints
5. Apply data access rules
6. Validate error handling and logging

---

## Layers (STRUCTURAL)

- Entry → controllers, gateways
- Service → business logic
- Repository → data access
- Client → external systems
- Domain → pure definitions

---

## Dependency Flow (ABSOLUTE)

Entry → Service → Repository → Infrastructure

Constraints:

- MUST NOT skip layers
- MUST NOT create circular dependencies
- Dependencies MUST point inward

---

## Separation Rules (ABSOLUTE)

- Controllers MUST NOT contain business logic
- Domain MUST NOT contain infrastructure logic
- Services MUST NOT use transport-layer DTOs

---

## Integration Pattern

### Client (ABSOLUTE)

- MUST handle low-level communication
- MUST NOT contain business logic
- MUST NOT implement error handling beyond propagation

### Service (ABSOLUTE)

- MUST orchestrate logic
- MUST handle errors
- MUST transform data into domain form

---

## Service Roles (ABSOLUTE)

Each service MUST have exactly one role:

- Read
- Mutation
- Lifecycle
- Orchestration

Constraint:

- A service MUST NOT contain multiple roles

---

## Data Access Pattern (STRUCTURAL)

- Domain → types only
- Repository → abstraction
- Implementation → infrastructure
- Service → orchestration

---

## Type Safety (ABSOLUTE)

- All functions MUST define input and output types
- Constrained values MUST use enums or equivalent
- Untyped values at boundaries are forbidden

---

## Error Handling (ABSOLUTE)

- Errors MUST NOT be ignored
- Fail early on missing data
- Failures MUST be contained within boundaries
- Retry logic MUST NOT exist in business logic

---

## Logging (ABSOLUTE)

- MUST use centralized logger
- Console logging is forbidden
- Logs MUST include context and identifiers

---

## Domain Rules (ABSOLUTE)

- State MUST be explicitly modeled
- Behavior MUST be deterministic
- Hidden side effects are forbidden

---

## Validation Checkpoints (ENFORCEMENT)

Agents MUST validate:

- After creating a service → role and layer correctness
- After adding dependencies → direction and separation
- After integrating external systems → client/service boundary

---

## Forbidden (ABSOLUTE)

- Layer skipping
- Circular dependencies
- Global mutable state
- Tight coupling to infrastructure
