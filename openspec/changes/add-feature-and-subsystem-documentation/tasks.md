## 1. Evidence inventory

- [x] 1.1 Inventory all eight top-level feature modules, curated barrels, module exports,
  controllers, services, repositories, schemas, events, jobs, dependencies, and mirrored tests.
- [x] 1.2 Trace candidate cross-feature lifecycles through implementation and tests, retain only
  significant verified subsystems, and record unsupported guarantees or missing evidence.
- [x] 1.3 Reconcile the inventory with existing architecture pages, ADRs, OpenSpec specifications,
  and the intentional absence of the retired LikeC4 model; record conflicts without changing
  runtime behavior.
- [x] 1.4 Inspect the inventory phase diff, validate touched paths, and run `git diff --check`.

## 2. Governance

- [x] 2.1 Add ADR-0017 in the repository format and update both ADR navigation files with its
  verified status, area, supersession, and related-rule metadata.
- [x] 2.2 Add stable rule `DOC-06` to `backend/CONVENTIONS.md` without renumbering or rewriting
  unrelated rules.
- [x] 2.3 Inspect the governance diff, validate its links and paths, and run
  `git diff --check` plus focused OpenSpec validation.

## 3. Feature documentation

- [x] 3.1 Create `docs/features/index.md` with all and only the verified top-level features and
  existing source/test links.
- [x] 3.2 Create evidence-backed documents for streams and nodes using the required feature
  template and verified public surfaces.
- [x] 3.3 Create evidence-backed documents for alerts and metrics using the required feature
  template and verified event/persistence ownership.
- [x] 3.4 Create evidence-backed documents for stream-inspection and sync using the required
  feature template and verified scheduled/targeted entry points.
- [x] 3.5 Create evidence-backed documents for gateway and media-nodes using the required feature
  template and verified broadcast/integration boundaries.
- [x] 3.6 Inspect the feature-documentation diff, validate every relative/source/test link and
  Mermaid block, and run `git diff --check`.

## 4. Subsystem documentation

- [x] 4.1 Create `docs/subsystems/index.md` containing all and only the significant subsystems
  retained by the evidence inventory.
- [x] 4.2 Create one required-template document per retained stream lifecycle and synchronization
  subsystem, with verified state, failure, idempotency, and consistency claims.
- [x] 4.3 Create one required-template document per retained monitoring, alerting, node, or
  integration subsystem, with verified events, persistence effects, and failure isolation.
- [x] 4.4 Inspect the subsystem-documentation diff, validate every relative/source/test link and
  Mermaid block, and run `git diff --check`.

## 5. Navigation and agent guidance

- [x] 5.1 Rebuild `docs/specification-map.md` as a verified bridge among capabilities, OpenSpec,
  feature/subsystem documents, code, and tests, marking missing canonical specs explicitly.
- [x] 5.2 Update `docs/index.md` as the navigation-only dashboard while preserving useful existing
  architecture and methodology links.
- [x] 5.3 Add concise feature/subsystem orientation and same-change maintenance guidance to
  `CLAUDE.md` and `AGENTS.md` without duplicating authoritative content.
- [x] 5.4 Verify `.obsidian/` remains ignored, no local Obsidian/plugin/index state is added, the
  LikeC4 model remains intentionally absent under ADR-0016, and no barrel, runtime test, or
  dependency update is required.
- [x] 5.5 Inspect the navigation/guidance diff, validate all changed Markdown links and paths,
  confirm every new document is reachable from `docs/index.md`, and run `git diff --check`.

## 6. Final verification

- [x] 6.1 Re-verify every feature and subsystem architectural claim against current code and
  tests and reconcile any discovered documentation conflict or uncertainty.
- [x] 6.2 Run a repository-local temporary relative-link validator over every changed Markdown
  file and resolve every broken link without committing the validator.
- [x] 6.3 Run `openspec validate --all` and record the exact result.
- [x] 6.4 Run `npm run verify` from `backend/` and record the exact typecheck, lint, build, and test
  result.
- [x] 6.5 Run final `git diff --check`, `git status --short`, `git diff --stat`, and `git diff`;
  confirm tasks are truthful and no unrelated user file was modified.
