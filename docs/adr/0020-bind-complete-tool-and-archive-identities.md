# ADR-0020: Bind complete tool and archive identities

- **Status**: Accepted
- **Date**: 2026-07-31
- **Related rules**: TOOL-09, TEST-05, DOC-05
- **Supersedes**: None

## Context

ADR-0018 established exact accepted-planning, work-order, Git-state, review, evidence, and local
verification identities. Implementation and fresh review exposed narrower integrity gaps inside
those boundaries:

- identifying only the direct OpenSpec package does not identify the transitive packages its CLI
  executes;
- a report and checkpoint can agree with each other while substituting a command that differs from
  the work order;
- content bytes alone do not distinguish tracked, ignored, and untracked protected state or a
  filesystem mode change;
- repository-relative text paths can still leave the repository through a symlink or junction;
- final review cannot use an active-only evidence lookup after OpenSpec relocates a change into a
  dated archive; and
- an acceptance-bearing implementation base is later than the original clean baseline used to
  decide whether the target branch is still mergeable.

These are extensions of the accepted local-agent workflow, not replacements for ADR-0018 or the
root test-layout decision in ADR-0019.

## Decision

1. The pinned OpenSpec identity covers its complete executable dependency closure. Verification
   resolves that closure from the committed lockfile, compares the installed hidden lock
   inventory, hashes every installed package byte under stable logical paths, and repeats the
   check immediately before invoking the CLI.
2. Checkpoint and review evidence bind their ordered command results to the exact focused command
   identities in the work order. Internal agreement between two substituted evidence records is
   insufficient.
3. Protected baseline entries include Git classification and filesystem mode as well as path,
   size, and content hash. A same-byte transition between tracked, ignored, or ordinary untracked
   state is a protected-state change.
4. Required documents and focused-command working directories must physically resolve inside the
   repository. Symlink or junction escapes fail before commands run.
5. An implementation work order keeps an acceptance-bearing authorization base. The final
   integration report separately binds the complete first-parent history, raw diff, and operation
   inventory from `acceptance.baselineSha` through the candidate used for unchanged-target merge
   eligibility.
6. Final integration validation resolves exactly one dated archive root from the candidate Git
   revision, rejects an active or ambiguous change root, and deterministically maps pre-archive
   implementation-evidence paths to their archived locations.

## Consequences

OpenSpec verification now fails closed when any executable dependency byte or resolved package
graph differs from the known-good installation. Evidence cannot authorize command substitution,
same-byte staging/classification changes, junction escapes, or a partial final diff. A dependency
update requires an intentional lock-closure and installed-tree identity renewal.

Final reports are more explicit: the work order proves implementation authority from an accepted
base, while the integration report proves the full original-baseline delta and unchanged target
needed for merge. Archive validation is tied to the exact candidate tree rather than ambient
working-directory layout.

The stricter identities add local hashing and test cost. They do not add remote CI, automate
semantic review, change product behavior, supersede ADR-0018, or change ADR-0019's root test
location.
