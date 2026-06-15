# Architecture Decision Records

Decisions that changed the architecture, a public contract, or tooling
behavior. Each record is append-only: to change a decision, write a new ADR
that supersedes the old one (DOC-01/DOC-03 in `backend/CONVENTIONS.md`).

New record: copy `template.md` to `NNNN-kebab-title.md` with the next free
number, then add a row here.

| ADR | Title | Status | Rules |
| --- | --- | --- | --- |
| [0001](0001-mediamtx-v3-api-behind-infrastructure-layer.md) | Talk to MediaMTX via its v3 API behind a dedicated infrastructure layer | Accepted | ARCH-03, INT-01..04 |
| [0002](0002-abstract-repositories-with-mongo-implementations.md) | Abstract repositories in features, Mongo implementations in infrastructure | Accepted | DATA-01, DATA-04, NAME-06 |
| [0003](0003-data-driven-track-parsing.md) | Parse media tracks via a field-map table, not parser strategies | Accepted | PHIL-02, INT-05 |
| [0004](0004-curated-feature-root-barrels.md) | Curated feature-root barrels, wildcard nested barrels | Accepted | TOOL-03, IMP-01, IMP-03 |
| [0005](0005-no-pass-through-services.md) | No pure pass-through services | Accepted | SVC-05 |
| [0006](0006-documentation-tooling-choices.md) | Documentation tooling — ADRs + Mermaid now, LikeC4 on trial, no Backstage | Accepted | DOC-01..04 |
| [0007](0007-backend-deploy-layout.md) | Backend deployment artifacts live under deploy/{docker,k8s,mediamtx,scripts} | Accepted | DIR-09 |
| [0008](0008-runtime-safe-barrel-imports.md) | Runtime-safe barrel imports (module-last barrels, no self-barrel value imports) | Accepted | IMP-01, IMP-04 |
| [0009](0009-pod-derived-cluster-topology.md) | Pod-derived cluster topology, assigned-pod pipeline targeting, RTSP pull source | Accepted | INT-06 |
