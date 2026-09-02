# PocketRisu historical backfill — V2 plugin preload failure must fail closed

Reviewed: 2026-09-02 11:37 KST
Source: `PocketRisu/PocketRisu:develop`
Commit: `0c6105f43fea3f9b59a8fca3b6b7d2de988a1e32`

## Finding

PocketRisu's V2 plugin API performs synchronous storage reads, so enabled V2 plugins require a complete preload of server-backed plugin storage before execution. Before this fix, `loadPlugins()` caught `preloadAll()` failure but still started V2 plugins. With the store not preloaded, synchronous reads returned `null`; plugins could then treat real persisted values as absent and write defaults back through the DB proxy, overwriting authoritative server data.

The adopted fix treats successful preload as an execution precondition for V2 plugins. If preload fails, previous V2 runtime state is torn down via `loadV2Plugin([])`, the user is notified, and V2 plugins remain stopped until a later load succeeds. V3 plugins continue loading because their storage API reads on demand and does not share the same synchronous-preload requirement.

## Durable invariant

**V2 plugin execution must fail closed when required storage preload is incomplete.** A compatibility layer that promises synchronous reads must not translate unavailable authoritative storage into ordinary `null`/missing values and then allow mutating consumers to run.

Failure of the preload capability is distinct from legitimate key absence. Runtime activation may proceed only after the compatibility prerequisite is proven ready. Runtime families whose storage contract does not require that prerequisite must remain independently available.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu@0c6105f43fea3f9b59a8fca3b6b7d2de988a1e32`
- benefit: prevents real plugin settings/state from being overwritten by defaults after an incomplete V2 storage preload
- conflict/risk: fail-closed behavior temporarily disables V2 plugins after storage failure; teardown must not affect V3 runtime or falsely classify legitimate empty storage as failed preload
- validation need: preserve regression coverage for preload rejection, previous V2 teardown, no V2 execution against unready storage, user-visible failure notice, and unaffected V3 loading
- follow-up: preserve this activation gate whenever plugin-storage preload, compatibility hydration, or V2 lifecycle code is refactored; do not broaden it to V3 unless V3's contract changes

## Dedupe / relationship notes

This is related to plugin-storage optimistic rollback and read-your-writes invariants but is not the same idea. Those govern cache visibility and rollback after individual mutations. This invariant governs **runtime activation authority when the entire synchronous compatibility view could not be established**.

## Cursor / coverage note

This was historical backfill. It does not move any Active-source forward cursor backward and does not by itself prove a new `HISTORICAL_BACKFILL_COMPLETE_THROUGH` boundary.
