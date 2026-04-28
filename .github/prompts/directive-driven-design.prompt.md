---
name: "Directive-Driven Design"
description: "Use when: given a feature request or system brief and you need a structured design generated from the directive YAML files in .github/directive."
argument-hint: "Describe the feature or system to design"
agent: "agent"
---

Use [conventions.design.yaml](../directive/conventions.design.yaml) as the controlling design directive for this task.

Also resolve and honor the supporting directive files it depends on:

- [conventions.architecture.yaml](../directive/conventions.architecture.yaml)
- [conventions.roles.yaml](../directive/conventions.roles.yaml)
- [conventions.design.pattern.yaml](../directive/conventions.design.pattern.yaml)
- [conventions.structure.yaml](../directive/conventions.structure.yaml)

Input request:

${input:featureRequest:Describe the feature or system to design}

Task:

1. Treat the input request as a raw feature or system prompt.
2. Execute the design pipeline from [conventions.design.yaml](../directive/conventions.design.yaml) in strict order. Do not skip, merge, or reorder stages.
3. Decompose the request into atomic intents before assigning layers, roles, patterns, folders, modules, or files.
4. Fail closed on ambiguity. If required information is missing, state the ambiguity explicitly and use the smallest safe assumption set.
5. Enforce the directive boundaries for domain, services, repositories, controllers, and infrastructure.
6. Bind the result to a concrete folder and module structure that matches the repository when relevant.
7. Validate the design against the directive's final validation rules before finishing.
8. Do not generate implementation code unless the user explicitly asks for code after the design is complete.

Special handling:

- If the controlling directive references a dependency with a slightly different filename than what exists in the folder, use the linked existing directive file with the closest matching intent.
- Use behavior-based names for modules, folders, files, classes, and services.
- Avoid generic names such as utils, helpers, manager, or common.
- If the request spans multiple bounded areas, separate them clearly and make the contracts between them explicit.
- Prefer repository-relative module placement and public API boundaries.

Required output:

## Feature Summary

- Summarize the user request, core goal, and major constraints.

## Decomposed Units

- List each atomic unit with a short responsibility statement.
- Identify split triggers or ambiguity that forced decomposition.

## Hierarchy Mapping

- Map each unit into root feature, use-case flow, or sub-use-case flow.

## Role Assignment Map

- Assign exactly one role to each unit.
- Explain any rejected role choices when necessary.

## Pattern Map

- Select patterns only after roles are stable.
- Show why each selected pattern is valid for the assigned role.
- Note any patterns that were rejected because they violate role constraints.

## Folder Structure Map

- Propose the module, subfolder, and file layout.
- Use index.ts as the public API boundary where applicable.

## Dependency Graph

- Provide a directed acyclic graph as an edge list using the format `source -> target`.
- Include only valid dependencies after structure and isolation rules are applied.

## Validation Report

- Check the final design against decomposition, layer purity, role purity, pattern compatibility, folder purity, module isolation, and public API rules.
- If any rule fails, explain the failure and regenerate the affected part from the earliest required stage instead of forcing a weak design.

Output constraints:

- Keep the answer in design form, not implementation form.
- Be concrete enough that another agent could implement from the design without re-interpreting the request.
- Do not skip required sections, even if a section only contains a short justification.
