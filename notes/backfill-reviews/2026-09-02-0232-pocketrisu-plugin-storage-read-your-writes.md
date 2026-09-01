# Historical review — plugin storage read-your-writes

Date: 2026-09-02
Source: `PocketRisu/PocketRisu:develop`
Reviewed commit: `83ffa0474abd013581c4df23e50b20c559d4b47a`

## Finding

PocketRisu's lazy/server-backed plugin storage made `setItem()` persistence asynchronous while preserving a compatibility surface whose upstream behavior was synchronous. Before this fix, a caller could issue `setItem(key, value)` and immediately `getItem(key)` or `snapshotAll()` and observe the older server/cache value until the network write completed.

The adopted fix gives a pending operation temporary read authority for that key: a pending set is returned to reads/snapshots, a pending remove reads as `null`, and a sync-path cached object can be reused when its hash matches the pending write. The commit adds focused regressions for both direct `getItem()` and `snapshotAll()` while the server write is intentionally held in flight.

## Transferable invariant

**Compatibility-preserving async persistence must provide read-your-writes semantics whenever the public/legacy API previously behaved synchronously.** The authoritative remote copy may lag, but local observations within the same client/session must not move backward behind an accepted local mutation.

This is distinct from optimistic rollback generation ownership: rollback generation decides whether an older failed write may undo newer state; read-your-writes decides what readers observe before the current write has reached persistence.

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
- Source evidence: `PocketRisu/PocketRisu@83ffa0474abd013581c4df23e50b20c559d4b47a`
- Benefit: prevents stale immediate reads/snapshots from violating plugin compatibility and causing follow-on decisions based on pre-write state.
- Conflict/risk: pending-op state must never leak across keys/sessions or survive after resolution; remove/set ordering must remain serialized and failures must still use the existing rollback-generation rules.
- Validation need: retain tests where server writes are held in flight; verify set→get, set→snapshot, remove→get, multiple queued operations, success/failure resolution, clear behavior, and rollback-generation interaction.
- Follow-up: preserve as a plugin-storage compatibility invariant; no new implementation branch because the source is current PocketRisu and the regression tests already exist.

## Backfill coverage

This review adds one bounded historical slice only. It does not establish complete reviewed coverage for all tracked sources, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` must not advance.