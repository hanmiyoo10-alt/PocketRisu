# Historical review — PocketRisu derived-state write boundary

Reviewed: 2026-09-02 13:42 KST
Source: `PocketRisu/PocketRisu:develop`
Commit: `a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9`

## Finding

`ChatBody.svelte` performs async translation work from a reactive/derived synchronization path. Writing the bound `translating` state while execution is still inside the synchronous `$derived` section can trigger Svelte's `state_unsafe_mutation` boundary. The adopted fix inserts an async boundary (`await Promise.resolve()`) before mutating `translating`, explicitly leaving the derived synchronous evaluation before the write.

The transferable lesson is broader than translation: derived/reactive synchronization may compute or schedule work, but a bound mutable state write must not occur while the framework still considers execution part of the derived synchronous evaluation. Async work launched from a derived path should establish a clear post-derivation mutation phase before it claims mutable UI state.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle status: `ADOPTED`
- Source evidence: official PocketRisu commit `a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9`; the patch is two lines in `src/lib/ChatScreens/ChatBody.svelte`, with an explicit `state_unsafe_mutation` comment
- Benefit: prevents framework-invalid reactive writes and preserves translation flight state without redesigning the translation pipeline
- Conflict/risk: an arbitrary delay or unowned deferred callback could introduce stale-flight races; the boundary should only move the mutation out of synchronous derivation, not weaken existing async ownership checks
- Validation need: reproduce the reactive path with translation enabled; assert no `state_unsafe_mutation`; verify `translating` still becomes true before observable request progress depends on it; verify failure/finalization and stale-flight protections remain intact
- Follow-up: preserve as a framework/state-ownership invariant for future reactive refactors; no autonomous port is needed because official PocketRisu already contains the fix

## Dedupe

Keep separate from `TRANSLATION-LOADING-STATE-RESTORES-RENDERED-TEXT`. That invariant owns what content a temporary loading sentinel may occupy and how it is restored after a flight. This invariant owns *when mutable bound state may be written relative to derived synchronous evaluation*. The two happen in the same translation surface but protect different failure modes.

## Guardrail check

UI/reactivity-local only. No DB flush behavior, `flushServerDbKeepalive()`, save/integrity path, plugin reload, service manager, Android notification, device package/runtime, parser/storage migration, or destructive recovery boundary is changed.

## Backfill coverage

This is one bounded historical slice only. It does not prove complete coverage for all tracked sources through 2026-08-28, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` must not advance.
