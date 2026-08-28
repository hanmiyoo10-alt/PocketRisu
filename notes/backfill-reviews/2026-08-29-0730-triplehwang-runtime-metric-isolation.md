# Historical backfill review — TripleHwang/RisuVault runtime metric isolation

Reviewed source: `TripleHwang/RisuVault:main`

Historical commit reviewed: `43cbe3065615cdc30dc18e9c60229a1fc0359932` (`fix(perf): isolate concurrent runtime marks`, 2026-08-26)

## Finding

The source previously keyed `performance.mark()` start/end points only by metric name. Overlapping invocations of the same metric (for example two concurrent message-page loads) could therefore pair the wrong start/end marks and produce misleading measurements. The fix returns an invocation-specific handle from `start()`, uses content-free per-invocation mark names, pairs `end()` with that handle, and clears the marks after measurement.

This is a transferable observability invariant rather than source architecture to copy: **concurrent measurements of the same operation must own distinct start/end identities; public aggregate measure names may remain stable, but invocation marks must not collide.** Instrumentation must remain optional and failure-safe.

PocketRisu bounded code search did not find a matching `runtimeMetrics` owner, so there is no current implementation target. Record as a future instrumentation guardrail rather than creating a feature branch.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `LOW`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: a PocketRisu-owned concurrent runtime performance-mark/measure layer
- Priority: `P2`
- lifecycle status: `HOLD`
- source evidence: `TripleHwang/RisuVault` `43cbe3065615cdc30dc18e9c60229a1fc0359932`
- benefit: prevents misleading latency/performance evidence when identical operations overlap, improving later optimization decisions
- conflict/risk: adding instrumentation without a demonstrated owner would create maintenance noise; metric labels must stay content-free and must not expose user data
- validation need: if PocketRisu adds runtime marks, add an overlap test with two same-name invocations, verify correct start/end pairing and mark cleanup, and verify instrumentation failure cannot affect product behavior
- follow-up: keep as an observability invariant; promote only when PocketRisu gains a matching metrics owner or a measured debugging need

## Backfill coverage

This was a bounded historical slice of `TripleHwang/RisuVault` around 2026-08-26. It does not establish complete coverage for all tracked sources, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` must not advance.
