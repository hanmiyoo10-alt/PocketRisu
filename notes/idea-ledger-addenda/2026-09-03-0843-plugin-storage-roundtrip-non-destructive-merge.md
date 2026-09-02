# Plugin storage round-trip must be non-destructive

Feature-ID: `PLUGIN-STORAGE-ROUNDTRIP-NON-DESTRUCTIVE-MERGE`

## Classification

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `XS`
- `Evidence`: `HIGH`
- `Risk`: `HIGH`
- `Dependencies`: `NONE`
- `Priority`: `P0`
- lifecycle status: `ADOPTED`

## Source evidence

- `PocketRisu/PocketRisu@ebe32742a22b123eb0c52e4dc387d641090dee8a` — after `pluginCustomStorage` moved out of `database.bin`, ordinary V3 `getDatabase() -> mutate -> setDatabase()/setDatabaseLite()` round-trips could return `{}` or a partial object for that field. Replace semantics therefore cleared unrelated plugin keys; dogfooding observed a destructive drop from 255 keys to 43 and then 0. The fix changed assignment/bulk-write semantics to merge only supplied keys and reserved full deletion for explicit `pluginStorage.clear()`.
- Current `PocketRisu/PocketRisu:develop@278251f85a19bfdfd4cf3faae780e62682878f9e` still contains `mergePluginCustomStorage()` with the invariant that missing keys never mean delete.
- Focused regressions added by the source commit cover empty round-trip preservation and partial-key update preservation.

## Benefit

Prevents compatibility-shaped bulk DB round-trips from silently deleting state belonging to other plugins after storage externalization. More generally, once a projected compatibility view intentionally omits externally-owned data, absence in that projection must not acquire destructive authority over the external store.

## Conflict / risk

The destructive failure mode is cross-plugin persistent data loss, so the invariant itself is `Risk: HIGH` even though the adopted guard is tiny. Merge semantics also mean callers cannot express full replacement through generic DB assignment; that is intentional and must remain separated from explicit destructive APIs.

## Validation need

Preserve focused tests for: (1) empty `pluginCustomStorage` round-trip leaves existing keys untouched; (2) partial writes update only supplied keys; (3) explicit `pluginStorage.clear()` remains the only generic full-wipe authority; (4) generic DB setters do not reintroduce replace semantics; (5) any future compatibility projection that hides externalized state follows the same non-destructive absence rule.

## Follow-up

`ADOPTED`: no implementation branch is appropriate. Treat this as a durable ownership/destructive-authority invariant when plugin storage APIs, DB compatibility projections, backup/restore, or storage migration code changes. Deduplicate with the broader externalized-plugin-storage family but keep this explicit destructive-write boundary because it was demonstrated by real cross-plugin data loss.
