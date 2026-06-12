# ADR-0005: No pure pass-through services

- **Status**: Accepted
- **Date**: 2026-06-13
- **Related rules**: SVC-05 (motivated by this decision), SVC-04, PHIL-03

## Context

The metrics feature had a `reactions/` layer (`MetricAlertReactionService`,
`MetricFailoverReactionService`) whose methods forwarded calls to one other
service each. One carried a single guard; the other carried nothing. Each cost
a file, a provider registration, a mock in every workflow test, and a
navigation hop, and their tests only asserted "calls the delegate" —
tautologies. The layer anticipated a symmetric list of reactions that was never
iterated as data, so the symmetry bought nothing. The same disease had just
been removed twice (parser pseudo-strategies, the empty record factory).

## Decision

We will require every delegating service to change at least one of:
vocabulary/abstraction level, module boundary, exposed surface area — or to
carry at least one decision (guard, transformation, defaulting). If inlining a
wrapper loses no concept, we inline it. Facades and boundary gateways
(`StreamsFacadeService`, `MetricFailoverStreamGatewayService`) are exempt:
their value is the seam itself.

Applied immediately: both reaction services were deleted; the workflow calls
`MetricAlertInvocationService` directly, and the cluster-only guard moved into
`StreamFailoverService` beside its sibling preconditions.

## Consequences

- Shorter call chains, smaller DI graph, fewer tautological tests.
- The diagnostic ("does a concept disappear if I inline this?") is codified as
  SVC-05 and applies to future layers proposed for symmetry or anticipation.
- Risk accepted: if a genuine reaction *list* emerges later, it should be
  introduced as injected data (the `SYNC_WORKFLOWS` pattern), not as wrapper
  classes.
