# ADR-0016: End the LikeC4 trial — Mermaid is the sole diagram source

- **Status**: Accepted
- **Date**: 2026-07-22
- **Supersedes**: the LikeC4 trial decision in [ADR-0006](0006-documentation-tooling-choices.md).
  ADR-0006's other three decisions — ADRs adopted, Mermaid adopted, Backstage rejected — remain
  in force.
- **Related rules**: DOC-02, DOC-04 (retired by this decision)

## Context

[ADR-0006](0006-documentation-tooling-choices.md) adopted LikeC4 **on trial** in
`docs/architecture/`, to evaluate the interactive single-model/multi-view approach. It set an
explicit graduation trigger — "the system growing past roughly 4–5 services with real
inter-service topology, or the trial proving the model cheap enough to keep regardless" — and
required the outcome to be recorded in a superseding ADR either way. It also created `DOC-04`,
a maintenance duty binding for the trial's duration: `docs/architecture/media-sync.c4` must be
updated in the same change that adds, removes, or renames a container or backend feature module.

The trial's artifacts — `media-sync.c4`, `README.md`, `package.json`, `package-lock.json` — have
been removed from the working tree. That left the registry unsatisfiable: `DOC-04` mandated
maintaining a file that no longer exists.

Two facts bear on the trigger. The system still has **two** deployables (a NestJS backend and a
React frontend) plus MediaMTX nodes and MongoDB, so the service-count criterion is plainly unmet
— the same scale ADR-0006 recorded, where it observed that "at two deployables the C4 container
level is a single diagram". The second criterion, whether the model proved cheap enough to keep
regardless, was **never formally evaluated**; no written assessment of the trial exists in the
repository to cite. The trial also carried a concrete friction cost ADR-0006 did not anticipate:
LikeC4 needs Node ≥ 22 while the backend toolchain runs Node 18, and the trial's
`package.json` had to pin `@rolldown/binding-win32-x64-msvc` explicitly to build on Node 22.4.1.

Meanwhile the structural ground LikeC4 covered is now held in Mermaid and prose:
`docs/architecture/system-overview.md` carries the containers and layering,
`docs/architecture/module-map.md` carries every Nest module with its imports, exports, and
dependency graph, and `docs/architecture/runtime-flows.md` carries the verified sequences. Each
carries `last_verified` frontmatter naming what it was checked against.

## Decision

We will end the LikeC4 trial and drop the model.

- Mermaid in repository Markdown is the **sole** diagram source, as `DOC-02` already requires
  for every diagram outside `docs/architecture/`.
- `docs/architecture/` keeps only its Markdown documents. The model, its README, and its
  toolchain are removed; they remain in Git history at `6a4b7bc likeC4 added`.
- `DOC-04` is **retired** in `backend/CONVENTIONS.md` — its block stays with a `~~RETIRED~~`
  status so existing citations still resolve. No replacement rule is added: `DOC-04`'s only
  subject was the LikeC4 model, and reversing its meaning into a duty over the Mermaid documents
  would require a new rule ID, not a rewrite.
- No replacement diagrams-as-code tool is adopted. Revisit only if ADR-0006's service-count
  trigger is actually reached.

## Consequences

### Positive

- The engineering registry is satisfiable again; no rule mandates maintaining a deleted file.
- One diagram source instead of two. ADR-0006 accepted the duplication only "temporarily", for
  the trial's duration, and this ends it.
- The Node ≥ 22 requirement and the rolldown binding pin leave the repository. The documentation
  toolchain no longer diverges from the backend's Node version.
- Architecture diagrams render natively on GitHub, in VS Code, and in Obsidian with no install
  step.

### Costs and risks

- **Structural fidelity drops.** LikeC4 rendered one model at three altitudes with click-through
  navigation, consistent by construction. Hand-maintained Mermaid can drift between documents,
  and nothing enforces consistency across them.
- **No rule now forces an architecture document update when a module changes.** Retiring
  `DOC-04` removes the only such duty. The `last_verified` frontmatter records staleness but
  does not prevent it. If a maintenance duty is wanted over the Mermaid documents, it needs a new
  rule ID and its own change.
- **The second graduation criterion was never evaluated in writing.** This decision rests on the
  service-count criterion, which is verifiable, and on the observed toolchain friction. It does
  not claim a measured verdict on maintenance cost.
- **The deletion's origin is unrecorded.** The files were removed outside any tracked change.
  This ADR records the outcome and its criteria, not a reconstructed motive. If the removal was
  accidental, the correct response is to restore the model and write a further ADR superseding
  this one — ADRs are append-only.

### Rejected alternatives

- **Restore the model and continue the trial.** Rejected: the graduation trigger is unmet at two
  deployables, and continuing would re-impose the Node-version split and the two-source
  duplication with no criterion in sight that would end it.
- **Replace LikeC4 with D2 or another diagrams-as-code tool.** Rejected for the same reason
  ADR-0006 rejected D2 — no native GitHub rendering and an extra toolchain — and because
  replacing one trial with another does not answer the question the first trial failed to.
- **Rewrite `DOC-04` to cover the Mermaid architecture documents.** Rejected: that reverses the
  rule's meaning, which `backend/CONVENTIONS.md`'s own procedure forbids ("If the meaning
  reverses, retire it and add a new ID instead"), and it would invent a maintenance duty this
  decision has no mandate to create.
- **Mark ADR-0006 fully superseded.** Rejected: three of its four decisions are still correct and
  are cited by `DOC-01`, `DOC-02`, and `DOC-03`. The supersession is scoped to the LikeC4 trial.
