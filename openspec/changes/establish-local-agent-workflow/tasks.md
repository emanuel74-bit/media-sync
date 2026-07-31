## 1. Accepted governance and contracts

- [ ] 1.1 Add the append-only workflow and root-test-layout ADRs, ADR indexes, the new TOOL and TEST convention rules, and the DOC-05 repository-local extension without duplicating authority.
- [ ] 1.2 Add and validate the tracked work-order schema and example plus the ignored `.agents/work/` execution-state boundary.
- [ ] 1.3 Add and validate the tracked review-report and integration-report schemas and examples.
- [ ] 1.4 Reconcile `AGENTS.md` and `CLAUDE.md` so they reference the accepted workflow, preserve existing instructions, and assign only coordinator-owned controls.
- [ ] 1.5 Run focused schema, documentation-link, OpenSpec, and diff-integrity checks for the governance and contract foundation.

## 2. Local agent workflow protocol

- [ ] 2.1 Implement shared schema, canonical-JSON, planning-digest, path-policy, and Git-inventory helpers under `scripts/agent-workflow/`.
- [ ] 2.2 Implement preflight validation for accepted planning state, exact work-order identity, Git baseline ancestry, clean protected state, and declared worktree inventory.
- [ ] 2.3 Implement checkpoint validation for additions, modifications, deletions, explicit renames, allowed and forbidden paths, protected pre-existing state, and fixed focused commands.
- [ ] 2.4 Implement review-report validation that resolves exact Git objects and recomputes the work-order digest, base-to-subject raw diff digest, tree identity, verdict, findings, scenario matrix, convention matrix, commands, and accepted risks.
- [ ] 2.5 Implement evidence-commit validation that accepts only evidence-directory additions or evidence-only updates rooted at the reviewed subject and rejects source or planning changes.
- [ ] 2.6 Add focused Node tests covering the required clean, dirty, staged, committed, untracked, deletion, rename, symlink/junction, case-collision, out-of-scope, stale-review, tampered-digest, command, and accepted-risk cases.
- [ ] 2.7 Run the focused protocol test suite, validate the examples against their schemas, and checkpoint the complete protocol file-operation inventory.

## 3. Hermetic repository verification

- [ ] 3.1 Add a root Node 22.22.0 package boundary with an exact `@fission-ai/openspec` 1.6.0 development dependency and a committed lockfile.
- [ ] 3.2 Split backend lint checking from explicit lint fixing, remove tracked build-cache mutation from verification, and investigate or bound Jest open-handle termination without hiding failures.
- [ ] 3.3 Add explicit frontend type checking and a frontend verification command that composes its existing checks.
- [ ] 3.4 Implement root repository and active-change verification modes that compose workspace checks, workflow tests, schema validation, documentation-link integrity, OpenSpec validation, accepted-planning state, task state, and required evidence.
- [ ] 3.5 Update validation-and-tooling documentation to describe exact local commands, pinned versions, non-mutating guarantees, and the intentional `test/agent-workflow/*.test.mjs` root-test exception.
- [ ] 3.6 Add and run regression tests proving repository verification is hermetic and source-non-mutating and that active-change verification rejects incomplete or stale workflow state.

## 4. Integration and implementation review

- [ ] 4.1 Integrate the governance, contract, protocol, verifier, and test commits in dependency order and validate the aggregate file-operation inventory after each step.
- [ ] 4.2 Run `npm run verify:change -- establish-local-agent-workflow`, then obtain a fresh implementation review bound to the exact candidate SHA and tree.
- [ ] 4.3 Resolve all review findings, rerun affected checks, obtain a fresh passing review, and add only validated evidence commits.

## 5. Synchronization, archive, and final merge

- [ ] 5.1 Reconcile task checkboxes with committed evidence, synchronize the delta spec to canonical specs, archive the completed change, and validate the archive.
- [ ] 5.2 Run the mandatory root `npm run verify` and `openspec validate --all` checks on the archived candidate.
- [ ] 5.3 Obtain a fresh final integration review over the exact archived candidate, resolve any findings, and validate the final evidence-only commit.
- [ ] 5.4 Fast-forward the accepted baseline branch only after all gates pass, then rerun `npm run verify` and `openspec validate --all` on the merged branch.
