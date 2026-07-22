# Code Conventions — Testing

## Rule Priority

- ABSOLUTE: must never be violated
- STRUCTURE: defines placement
- ENFORCEMENT: defines when tests are required

---

## Test Creation Triggers (ENFORCEMENT)

Tests MUST be created:

- After creating any service
- After introducing business logic
- After defining service interactions

---

## Structure (ABSOLUTE)

- All tests MUST live in `/test`
- Test structure MUST mirror `/src`
- Tests inside source folders are forbidden

---

## Naming (ABSOLUTE)

- Unit tests → `<name>.test.ts`
- Integration tests → `<name>.spec.ts`

---

## Test Type Classification (STRUCTURE)

- Unit test → tests a single unit in isolation
- Integration test → tests interaction between multiple units

---

## Coverage Rules

### MUST (ABSOLUTE)

- All services MUST be tested
- All business logic MUST be tested

### SHOULD (HEURISTIC)

- Service interactions SHOULD be tested
- Data transformations SHOULD be tested

---

## Mocking Rules (ABSOLUTE)

- ONLY external systems may be mocked

MUST NOT mock:

- Domain logic
- Pure functions
- Mappers, policies, factories

---

## Mocking Conditions (ENFORCEMENT)

- Use mocking when dependency is external (DB, API, I/O)
- Use real implementation for internal logic

---

## Test Design (ABSOLUTE)

- Tests MUST be isolated
- Shared mutable state is forbidden
- Order-dependent tests are forbidden

---

## Validation Rules (ENFORCEMENT)

Agents MUST verify:

- Each service has corresponding tests
- Tests match source structure
- No forbidden mocking exists

---

## Forbidden (ABSOLUTE)

- Skipped tests
- Commented-out tests
- Over-mocking entire modules
