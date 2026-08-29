# PocketRisu-Alter historical backfill — best-effort progress channel

Reviewed: 2026-08-29
Source: `PocketRisu-Alter/PocketRisu-Alter`
Source branch: `main`
Source commit: `026f7a08de8312c37b4f6f71f90d020e62231efa`

## Finding

The commit adds per-agent progress reporting for a long-running server-side MultiAgent pipeline. The useful transferable design point is not the source-specific multi-agent feature itself, but the ownership boundary around progress/observability:

- the work pipeline owns correctness and completion;
- progress is emitted as additive events to a separate sink/channel;
- the active subtask set is announced before work starts so the client can render pending state deterministically;
- start/done/error/skipped are explicit lifecycle states rather than inferred from missing events;
- progress delivery is best-effort: a throwing progress sink is caught and cannot fail the underlying work pipeline.

This is a useful failure-containment invariant for future PocketRisu long-running jobs, but the current personal fork has no matching `backendJob` / `requestStatus` owner, so there is no justified port target today.

## Classification

- Feature-ID: `OBSERVABILITY-BEST-EFFORT-PROGRESS-CHANNEL`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `LOW`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: matching PocketRisu-owned long-running job/progress channel and a demonstrated need for granular progress
- Priority: `P2`
- Lifecycle status: `HOLD`
- Source evidence: `PocketRisu-Alter/PocketRisu-Alter@026f7a08de8312c37b4f6f71f90d020e62231efa`
- Benefit: make multi-step background/request work observable without coupling UI/telemetry failures to job correctness.
- Conflict/risk: blindly porting source-specific MultiAgent/SSE concepts would add architecture PocketRisu does not currently own; progress events can also become noisy or leak internal error detail if treated as user-facing payloads without review.
- Validation need: first identify a PocketRisu long-running job with a real progress owner; then test throwing/disconnected sinks, event ordering, skipped/error states, cancellation, and that progress failure never changes job success/failure semantics.
- Follow-up: retain as an invariant/reference. Promote only if a matching PocketRisu job/progress surface appears; then implement one isolated progress channel without importing Alter's MultiAgent subsystem.

## Backfill boundary

This run reviewed a bounded PocketRisu-Alter historical slice around the divergence sequence containing `026f7a08...`. It does not establish exhaustive coverage for all tracked sources or justify advancing `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
