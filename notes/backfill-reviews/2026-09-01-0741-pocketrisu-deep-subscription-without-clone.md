# Historical backfill — deep subscription without discarded clones

Source: `PocketRisu/PocketRisu:develop`
Commit: `9ea2a2c3d3bcade5aecc34af1074e16c0d258dfc`
Reviewed: 2026-09-01

## Finding

PocketRisu save-tracking effects previously used `$state.snapshot(x)` only to establish deep reactive dependencies, then discarded the produced clone. On large character/module/plugin values this turned dependency subscription into a per-edit O(data size) clone/allocation cost. The adopted `deepTouch` mechanism walks the same reactive shape without materializing a clone for plain arrays/objects, while falling back to `$state.snapshot` for non-plain values whose `toJSON`/class behavior may participate in subscription semantics.

The source commit includes regression tests comparing `deepTouch` against `$state.snapshot` across scalar/deep changes, array growth, key add/remove, non-plain/toJSON cases, and inherited-getter behavior. The commit message reports real proxy benchmarks reducing per-keystroke subscription cost by roughly 40–50% for 200KB–2.5MB values while leaving save format, protocol hash, and change-detection semantics unchanged.

## Normalized invariant

Feature-ID: `DEEP-REACTIVE-SUBSCRIPTION-WITHOUT-DISCARDED-CLONE`

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `S`
- `Evidence`: `HIGH`
- `Risk`: `MEDIUM`
- `Dependencies`: `NONE`
- `Priority`: `P0`
- lifecycle status: `ADOPTED`
- source evidence: official PocketRisu commit `9ea2a2c3d3bcade5aecc34af1074e16c0d258dfc`; direct code diff and dedicated regression tests
- expected PocketRisu benefit: preserve deep save/change subscriptions while removing discarded-clone CPU/allocation overhead from large reactive values, especially long-character/module editing
- main risk/conflict: a custom traversal that subscribes to fewer reactive reads than `$state.snapshot` can silently miss saves; an over-broad traversal can invoke inherited getters or otherwise change behavior
- validation need: maintain parity tests against `$state.snapshot` for all mutation kinds and non-plain objects; benchmark large reactive values; verify no change to save format/protocol/change-detection semantics
- follow-up: preserve as an invariant when refactoring save tracking; new subscription optimizations must prove they never observe fewer relevant mutations than the authoritative prior mechanism

## Deduplication

This is distinct from snapshot-patch cloning and selective clone optimization. Those concern copying mutable state for rollback/patch application; this item concerns a discarded clone used solely as a reactive subscription primitive. Evidence should be merged here if another source adopts the same clone-free dependency-registration pattern.

## Cursor / coverage

This was bounded historical backfill only. No active-source cursor was moved backward or forward. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged because this review covers one historical slice, not complete cross-source coverage through a date.
