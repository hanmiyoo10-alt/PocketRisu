# Historical backfill review — plugin storage merge-not-replace compatibility

- Reviewed source: `PocketRisu/PocketRisu:develop`
- Source commit: `ebe32742a22b123eb0c52e4dc387d641090dee8a` (2026-08-25)
- Related migration context: `f0d4eee35ca0b4ac7e5fb4ee4668205b46723a44`
- Feature-ID: `PLUGIN-STORAGE-PARTIAL-WRITES-DO-NOT-IMPLY-DELETE`

## Finding

After `pluginCustomStorage` moved out of `database.bin` into the server-backed per-key store, the database compatibility surface still exposed `db.pluginCustomStorage` as `{}`. Ordinary V3 plugin round-trips such as `getDatabase() -> mutate -> setDatabase()/setDatabaseLite()` could therefore return an empty or partial object. Treating assignment as replacement made missing keys mean deletion and wiped unrelated plugins' durable state. The reported dogfood failure dropped the store from 255 keys to 43 and then 0.

The adopted fix changes compatibility writes to merge only the keys explicitly present. Missing keys never imply delete. Explicit destructive intent remains available through `pluginStorage.clear()`. Regression tests cover both an empty round-trip and a partial write preserving unrelated keys.

## Classification

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `XS`
- `Evidence`: `HIGH`
- `Risk`: `MEDIUM`
- `Dependencies`: `NONE`
- `Priority`: `P0`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu@ebe32742a22b123eb0c52e4dc387d641090dee8a`, with migration context `f0d4eee35ca0b4ac7e5fb4ee4668205b46723a44`
- benefit: prevents compatibility round-trips from deleting unrelated plugin state after storage externalization
- conflict/risk: merge semantics cannot express deletion by omission; destructive deletion must remain an explicit API operation
- validation need: preserve regression coverage for empty and partial compatibility writes; verify explicit clear/delete paths remain authoritative and targeted V3 reload behavior is unchanged
- follow-up: preserve this invariant whenever plugin storage/database compatibility adapters are refactored; do not reinterpret omitted keys as destructive intent

## Deduplication / ownership

This is not the V2 preload fail-closed invariant, optimistic write rollback, targeted reload, or plugin-update user-state migration. This Feature-ID owns the compatibility meaning of an omitted key at the externalized plugin-storage/database boundary: omission is absence of write intent, not deletion authority.

## Progression decision

Already adopted upstream with direct regression evidence. No autonomous implementation branch or PR is appropriate. Record as a durable invariant and preserve it in future storage compatibility work.

## Backfill marker

This is one bounded historical slice only. It does not establish complete reviewed coverage for all tracked sources, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.