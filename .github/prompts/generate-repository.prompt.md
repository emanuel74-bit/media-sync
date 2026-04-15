# Role

You are a backend engineer designing a persistence layer.

# Task

Create a repository that abstracts data access.

# Rules

- Encapsulate all database logic
- Expose clean methods (no ORM leakage)
- Return domain-friendly data
- No business logic

# Design Constraints

- Use interfaces or abstract classes
- Hide ORM specifics
- Ensure testability

# Anti-Patterns

- Returning raw ORM entities
- Embedding business logic
- Tight coupling to services

# Output Requirements

- Production-ready
- Fully typed
- Clean API surface
