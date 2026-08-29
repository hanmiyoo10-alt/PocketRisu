# Backfill review — PocketRisu derived/bound-state write boundary

Date: 2026-08-30
Source: `PocketRisu/PocketRisu:develop`
Evidence commit: `a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9`

## Finding

Official PocketRisu fixed a Svelte 5 `state_unsafe_mutation` failure by forcing an async boundary (`await Promise.resolve()`) before mutating the bound `translating` state from work that can be entered by a `$derived` synchronization section. The transferable lesson is not the exact microtask primitive; it is the ownership invariant: async helpers invoked from `$derived.by(...)` must not synchronously mutate bound/reactive state during the derived evaluation phase.

The personal fork currently still computes `markParsingResult` with `$derived.by(() => markParsing(...))`, but its existing translation branches already cross an async boundary (`sleep`, `ParseMarkdown`, or equivalent awaited work) before their first `translating = true` mutation. Therefore this review does not establish a present production gap and does not justify adding a redundant microtask boundary.

## Classification

- Feature-ID: `DERIVED-BOUND-STATE-WRITE-BOUNDARY`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: matching `$derived.by`-entered async helper with a pre-await bound/reactive write, or a reproducible `state_unsafe_mutation` failure
- Priority: `P1`
- Lifecycle: `HOLD`

## Source evidence

- `PocketRisu/PocketRisu@a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9`: inserts an explicit async boundary immediately before `translating = true`, documenting that the write must happen after leaving the `$derived` sync section.
- Current official `develop` retains the boundary inside the translation-flight owner.
- Current `hanmiyoo10-alt/PocketRisu:main` still enters `markParsing(...)` through `$derived.by`, but its current first translation-state writes are already reached after awaited work in each translation branch.

## Benefit

Prevents a Svelte runtime crash when future refactors move bound-state mutation earlier inside an async function that is invoked during derived evaluation. Preserving the invariant is especially useful around translation/render orchestration, where reactive refactors frequently shift the first await/write boundary.

## Conflict / risk

Blindly inserting `Promise.resolve()` or other scheduling boundaries everywhere can change ordering, create flicker, hide a deeper ownership mistake, or make race reasoning harder. Prefer restructuring derived computation to remain pure; use an explicit async boundary only where the caller contract is intentionally asynchronous and tested.

## Validation need

If a matching gap appears, reproduce `state_unsafe_mutation` with a focused component test, assert that no bound/reactive write occurs during derived evaluation, then verify translation loading/result ordering and rapid retranslation behavior.

## Follow-up

Keep as a regression invariant. Promote to `READY_TO_PORT` only if PocketRisu gains a concrete pre-await bound-state write on a `$derived.by` execution path or a reproducible Svelte 5 crash. Do not change current code merely to mirror the upstream microtask boundary.

## Historical cursor handling

This is historical backfill older than the official PocketRisu forward cursor `615b79df3375bf9db2924a8003f61a747721c725`; the authoritative cursor is not moved backward. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged because this bounded slice does not prove complete multi-source coverage.
