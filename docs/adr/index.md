# Architecture decisions — entry point

Navigation into the ADR set. [`README.md`](README.md) lists each record with its title and
related convention rules; the table below adds area and supersession navigation.

ADRs record **why** a decision was made. [`backend/CONVENTIONS.md`](../../backend/CONVENTIONS.md)
records the current law that came out of it. The two are cross-linked and neither restates the
other (`DOC-01`).

## Rules that govern this folder

- A decision that changes architecture, a public contract, or tooling behavior gets an ADR
  (`DOC-01`). Use [`template.md`](template.md) and the next free number.
- ADRs are **append-only** (`DOC-03`). To change a decision, add a new numbered ADR that
  supersedes the old one and update the old one's status line. Never rewrite its content.
- Add a row to the table in [`README.md`](README.md) when you add a record.
- An OpenSpec `design.md` explains one change; it does not replace a durable ADR.

## Reading paths

By concern, for someone new to the repository:

| If you are asking… | Read |
|---|---|
| How do we talk to MediaMTX? | [0001](0001-mediamtx-v3-api-behind-infrastructure-layer.md), [0003](0003-data-driven-track-parsing.md) |
| Where does persistence live? | [0002](0002-abstract-repositories-with-mongo-implementations.md) |
| Why are imports and barrels like this? | [0004](0004-curated-feature-root-barrels.md), [0008](0008-runtime-safe-barrel-imports.md) |
| Why is there no wrapper service here? | [0005](0005-no-pass-through-services.md) |
| What documents what? | [0006](0006-documentation-tooling-choices.md), [0015](0015-adopt-spec-driven-development-and-obsidian-navigation.md), [0016](0016-drop-likec4-architecture-model.md), [0017](0017-feature-and-subsystem-documentation.md) |
| How is local agent work accepted and verified? | [0018](0018-establish-accepted-local-agent-workflow.md), [0019](0019-place-repository-tooling-tests-at-root.md), [0020](0020-bind-complete-tool-and-archive-identities.md) |
| How is this deployed? | [0007](0007-backend-deploy-layout.md), [0012](0012-cluster-nodes-as-statefulset.md) |
| How does the system know which nodes exist? | [0009](0009-pod-derived-cluster-topology.md), [0012](0012-cluster-nodes-as-statefulset.md) |
| How do alerts work? | [0010](0010-event-driven-alert-pipeline.md), [0011](0011-node-resource-alerts-third-producer.md) |
| How does a stream get in and get placed? | [0013](0013-reserve-publish-ingest-cluster.md), [0014](0014-guard-stream-lifecycle-transitions.md) |

## ADR navigation

| ADR | Status | Area | Supersedes |
|---|---|---|---|
| [0001](0001-mediamtx-v3-api-behind-infrastructure-layer.md) | Accepted | MediaMTX integration | None |
| [0002](0002-abstract-repositories-with-mongo-implementations.md) | Accepted | Persistence | None |
| [0003](0003-data-driven-track-parsing.md) | Accepted | Media track mapping | None |
| [0004](0004-curated-feature-root-barrels.md) | Accepted | Public surfaces | None |
| [0005](0005-no-pass-through-services.md) | Accepted | Service design | None |
| [0006](0006-documentation-tooling-choices.md) | Accepted; LikeC4 trial superseded by [0016](0016-drop-likec4-architecture-model.md) | Documentation tooling | None |
| [0007](0007-backend-deploy-layout.md) | Accepted | Deployment layout | None |
| [0008](0008-runtime-safe-barrel-imports.md) | Accepted | Runtime imports | None |
| [0009](0009-pod-derived-cluster-topology.md) | Accepted | Runtime topology | None |
| [0010](0010-event-driven-alert-pipeline.md) | Accepted | Alert pipeline | None |
| [0011](0011-node-resource-alerts-third-producer.md) | Accepted | Node resource alerts | None |
| [0012](0012-cluster-nodes-as-statefulset.md) | Accepted | Cluster deployment | None |
| [0013](0013-reserve-publish-ingest-cluster.md) | Accepted | Ingest publication | Ingest-relevant parts of [0009](0009-pod-derived-cluster-topology.md) |
| [0014](0014-guard-stream-lifecycle-transitions.md) | Accepted | Stream lifecycle | None |
| [0015](0015-adopt-spec-driven-development-and-obsidian-navigation.md) | Accepted | Specification workflow | None |
| [0016](0016-drop-likec4-architecture-model.md) | Accepted | Documentation tooling | LikeC4 trial decision in [0006](0006-documentation-tooling-choices.md) |
| [0017](0017-feature-and-subsystem-documentation.md) | Accepted | Architecture documentation | None |
| [0018](0018-establish-accepted-local-agent-workflow.md) | Accepted | Local agent workflow and verification | None |
| [0019](0019-place-repository-tooling-tests-at-root.md) | Accepted | Repository tooling test layout | None |
| [0020](0020-bind-complete-tool-and-archive-identities.md) | Accepted | Complete workflow identities | None |

## Related

- [Documentation dashboard](../index.md)
- [Specification map](../specification-map.md) — which capabilities have a verified baseline
- [System overview](../architecture/system-overview.md)
- [Glossary](../glossary.md)
