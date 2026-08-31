# Backfill review — PocketRisu snapshot source-existence authority

Date: 2026-08-31
Source: `PocketRisu/PocketRisu:develop`
Reviewed commit: `a838a95781993d342c96fa36fa3bb87bd2a035d5`

## Meaningful idea

### SNAPSHOT-SOURCE-EXISTENCE-AUTHORITY

A snapshot operation must not publish snapshot-side metadata unless the authoritative payload being snapshotted actually exists. A missing source is not an empty successful snapshot.

`a838a957` fixed a fresh-install/import edge case where the database payload did not exist yet. `kvCopyValue` silently skipped the absent source, while the plugin-storage snapshot map was still written, producing an orphan map with no corresponding database snapshot. The fix checks source existence before entering snapshot creation and preserves the existing cooldown semantics for the attempted backup.

The regression test was also changed from timing-dependent exact snapshot counts to the actual relational invariant: the set of plugin-storage snapshot-map keys must correspond exactly to the set of listed database snapshots.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu@a838a95781993d342c96fa36fa3bb87bd2a035d5`
- Benefit: prevents half-created backup state and avoids later GC/recovery code having to repair metadata that should never have been published.
- Conflict/risk: future snapshot domains may accidentally reintroduce sidecar-first or silent-missing-source behavior; the invariant must remain atomic across payload and all companion metadata.
- Validation need: keep a fresh-install/no-database regression; assert one companion map per listed snapshot and no companion-only snapshot identities.
- Follow-up: preserve as a backup/storage invariant when snapshot layout, plugin-storage snapshotting, GC, or import-time backup behavior changes.

## Deduplication decision

Do not create a new recovery architecture item. This is a narrow adopted invariant about snapshot publication authority and relational integrity, distinct from broader durability barriers, restore previews, or explicit deletion semantics.

## Historical coverage

This is a bounded historical slice only. It does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
