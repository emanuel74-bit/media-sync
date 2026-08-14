## 1. Planning acceptance and authorization

- [x] 1.1 Coordinator-review the proposal, design, `public-stream-contract` delta specification,
  and this checklist for consistency, then run `openspec validate secure-public-stream-contract`.
- [x] 1.2 Commit the complete planning artifacts and record coordinator acceptance with the exact
  baseline SHA, planning SHA, normalized artifact digest, identity, and timestamp.
- [x] 1.3 Issue a bounded integration work order to a fresh implementer with the complete expected
  file-operation inventory, protected paths, rules, ADRs, docs, focused commands, and non-goals.
- [x] 1.4 Run the accepted-workflow preflight and stop before implementation if authorization,
  scope, branch, baseline, worktree, or protected-state validation fails.

## 2. Public stream response boundary

- [x] 2.1 Add append-only ADR-0021 documenting explicit general-stream projection and the
  intentional ADR-0013 reservation-credential exception.
- [x] 2.2 Add ADR-0021 to `docs/adr/README.md` and `docs/adr/index.md` without rewriting ADR-0013.
- [x] 2.3 Add the explicitly enumerated `PublicStream` type and update the required nested domain
  type/domain barrels without changing the internal `Stream` type.
- [x] 2.4 Add the pure `mapStreamToPublicStream` controller-bound mapper, explicitly enumerate safe
  fields without spread, and update the required controller barrel.
- [x] 2.5 Project `GET /api/streams` and `GET /api/streams/:name` through `PublicStream`, preserving
  empty-array and `null` behavior.
- [x] 2.6 Project `POST /api/streams` and `PATCH /api/streams/:name` through `PublicStream` while
  retaining the existing input DTO-to-service mappings.
- [x] 2.7 Project `PATCH /api/streams/:name/assign` and
  `PATCH /api/streams/:name/unassign` through `PublicStream`.
- [x] 2.8 Extend `streams.controller.test.ts` with token-bearing internal results proving redaction
  for list, single, create, update, assign, and unassign plus empty-array and `null` preservation.
- [x] 2.9 Add a mirrored `ingest.controller.test.ts` proving `POST /api/ingest/streams` still returns
  the reservation token and a publish URL containing the same credential.

## 3. Frontend contract and lifecycle

- [x] 3.1 Remove `publishToken` from frontend `Stream`, retain it on `StreamReservation`, and update
  general-stream fixtures so they cannot use reservation credentials.
- [x] 3.2 Keep the ingest reservation mock explicitly returning both `publishToken` and the
  credential-bearing `publishUrl` under the distinct reservation contract.
- [x] 3.3 Change the reserved-stage lifecycle timestamp to use `updatedAt`, then `createdAt`, only
  while status is `reserved`, returning `undefined` when neither exists or status is not reserved.
- [x] 3.4 Extend the frontend API contract test to assert intentional reservation credential
  delivery and add focused lifecycle tests for every status/timestamp fallback scenario.

## 4. Public documentation

- [x] 4.1 Update `backend/API_DOCUMENTATION.md` with the credential-free general response matrix,
  the breaking compatibility note, and the unchanged reservation credential response.
- [x] 4.2 Update `docs/features/streams.md` with the public projection boundary, ADR/spec links,
  implementation and test evidence, governing rules, and a refreshed `last_verified` date.
- [x] 4.3 Update `docs/subsystems/stream-reservation-and-publication.md` with the general-response
  secrecy boundary, intentional reservation delivery, ADR/spec links, evidence, and refreshed
  `last_verified` date.

## 5. Focused implementation validation

- [x] 5.1 Run the focused backend Streams and Ingest controller tests, backend typecheck, and
  backend lint; resolve every failure without weakening the credential matrix.
- [x] 5.2 Run the focused frontend API/lifecycle tests, frontend typecheck, and frontend lint;
  resolve every failure and retain the reservation exception.
- [x] 5.3 Run `git diff --check` and `openspec validate secure-public-stream-contract`, then reconcile
  implementation, tests, ADRs, documentation, and task state before integration.

## 6. Accepted implementation review and evidence

- [x] 6.1 Integrate the bounded implementation in declared dependency order and verify the exact
  base-to-candidate additions, modifications, deletions, and renames against the work order.
- [ ] 6.2 Run the accepted checkpoint and
  `npm run verify:change -- secure-public-stream-contract` on the exact committed implementation
  candidate.
- [ ] 6.3 Obtain a fresh implementation review bound to the exact candidate SHA, tree, raw diff,
  scenario matrix, convention matrix, command results, and file-operation inventory.
- [ ] 6.4 Resolve every blocking finding, rerun affected checks, and obtain a fresh passing exact-
  state review; do not accept or document unresolved risk without coordinator authorization.
- [ ] 6.5 Record the normalized work order, checkpoint, and passing implementation report under
  immutable subject-SHA evidence paths and validate the evidence-only commit.
- [ ] 6.6 Record any workflow friction in a separately named follow-up OpenSpec proposal outside
  this change's implementation inventory; do not bundle workflow-tooling changes into this change.

## 7. Specification synchronization and archive

- [ ] 7.1 Coordinator-reconcile task checkboxes with committed implementation and validated evidence;
  do not mark planned, failed, or unevidenced work complete.
- [ ] 7.2 Synchronize the `public-stream-contract` delta to canonical `openspec/specs/` only after the
  implementation and passing review agree with every requirement and scenario.
- [ ] 7.3 Archive `secure-public-stream-contract`, preserve its implementation evidence under the
  dated archive root, update affected specification navigation, and validate the archive.
- [ ] 7.4 Run root `npm run verify` and `openspec validate --all` on the exact archived candidate.

## 8. Final integration review, merge, and post-merge gates

- [ ] 8.1 Issue the final integration work order and record an exact archived-candidate checkpoint
  with the complete acceptance-baseline-to-candidate first-parent history and inventory.
- [ ] 8.2 Obtain a fresh final integration review over the exact archived candidate, including
  ordered implementation evidence, requirement/scenario coverage, conventions, commands, and
  merge-baseline identity.
- [ ] 8.3 Resolve every final finding with a newly reviewed candidate, then record and validate only
  the final integration evidence-only commit.
- [ ] 8.4 Confirm the target branch still equals the accepted baseline and fast-forward merge the
  validated candidate without rewriting history.
- [ ] 8.5 Run `npm run verify` and `openspec validate --all` on the merged target branch and report
  changed files, applicable rule IDs, command results, and any remaining risks.
