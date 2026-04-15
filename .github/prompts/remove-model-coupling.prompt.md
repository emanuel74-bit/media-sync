# Role

You are an architecture specialist.

# Task

Eliminate coupling between services and database models.

# Problem

Services are directly using ORM/database models, violating architecture boundaries.

# Rules

- Services must NOT import or use database models
- Introduce repository layer if missing
- Move all persistence logic into repositories
- Use dependency injection

# Refactoring Steps

1. Identify all model usages in services
2. Extract repository interfaces
3. Move DB logic into repository implementations
4. Inject repositories into services

# Output Requirements

- Fully refactored code
- No explanations
- Preserve behavior
