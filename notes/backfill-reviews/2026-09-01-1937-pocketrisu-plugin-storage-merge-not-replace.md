# Historical backfill review — plugin storage merge-not-replace invariant

Date: 2026-09-01
Source: `PocketRisu/PocketRisu:develop`
Reviewed commit: `ebe32742a22b123eb0c52e4dc387d641090dee8a`

## Finding

PocketRisu had already externalized plugin custom storage so `db.pluginCustomStorage` on the client could legitimately be `{}` while authoritative values lived in the server-backed plugin storage store. In that architecture, treating `setDatabase()` / `setDatabaseLite()` assignment of `pluginCustomStorage` as a full replacement was unsafe: normal plugin round-trips could hand back an empty or partial object and erase unrelated plugin keys.

The reviewed fix changes generic DB-style assignment semantics to merge supplied keys into the authoritative store. Missing keys do not mean delete. Explicit destructive intent remains a separate operation (`pluginStorage.clear()`). The commit records a dogfood failure where storage dropped from 255 keys to 43 and then 0, and adds regressions for empty and partial round-trips.

## Durable invariant

**Feature-ID: `PLUGIN-STORAGE-PARTIAL-WRITE-MERGE-SEMANTICS`**

When a compatibility/API view intentionally omits or lazily externalizes authoritative state, a partial/empty round-trip through that compatibility view must not be interpreted as authoritative deletion of omitted keys. Destructive replacement/clear semantics require an explicit destructive API or complete authoritative snapshot with proven ownership.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle status: `ADOPTED`
- Source evidence: official `PocketRisu/PocketRisu` commit `ebe32742a22b123eb0c52e4dc387d641090dee8a`; commit reports reproduced dogfood loss and includes empty/partial round-trip regressions.
- Benefit: prevents cross-plugin data loss when legacy/generic DB APIs round-trip an intentionally incomplete plugin-storage compatibility view.
- Conflict/risk: merge semantics intentionally make omission non-destructive; callers that truly require replacement must use an explicit clear/replace ownership path rather than relying on absence. This invariant should not be generalized to APIs whose contract explicitly guarantees a complete authoritative snapshot.
- Validation need: preserve regression coverage for empty round-trip, partial write preserving unrelated plugin keys, and explicit clear semantics. Any future plugin-storage compatibility/migration layer should prove whether its input is complete before permitting replacement.
- Follow-up: preserve as an architectural invariant around externalized/lazy plugin storage. No autonomous implementation is needed because the source is PocketRisu itself and the fix is already adopted.

## Deduplication note

This is distinct from `OPTIMISTIC-CACHE-ROLLBACK-USES-WRITE-GENERATION` (concurrent rollback authority) and `PLUGIN-STORAGE-REFRESH-TOP-UP-ONLY` (bounded refresh/read behavior). This finding owns **write completeness/deletion semantics across an externalized compatibility view**.

## Backfill marker

This was a bounded historical slice only. Do not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH` from this review alone.
