# Historical backfill review — plugin manifest write-back authority

Reviewed `PocketRisu/PocketRisu@f79c8989fe2e5630e2c85f4449a868ec069300c8` during bounded historical backfill.

## Finding

The lazy asset-manifest cutover created a compatibility hazard at the plugin snapshot/write-back boundary: a plugin could receive an incomplete character shape through `getDatabase()`, add assets, then return an object containing both a stale manifest descriptor and a new inline array. Client rendering preferred the array while persistence preferred the descriptor, so an edit could appear to succeed and then disappear from disk.

The adopted fix hydrates character assets in detached plugin database snapshots, resolves descriptor-vs-array authority explicitly on write-back, matches characters by `chaId`, and keeps unchanged hydrated round-trips canonical as descriptors. Later code strengthens the same boundary by discarding never-hydrated/stale writes instead of letting an incomplete list replace authoritative manifest state.

## Coverage result

- Distinct idea: yes; no prior durable addendum was found for source SHA `f79c8989fe2e5630e2c85f4449a868ec069300c8`.
- Current preservation: confirmed at `278251f85a19bfdfd4cf3faae780e62682878f9e` in `src/ts/plugins/pluginCharacterSnapshot.ts`.
- Classification: `NO_SYSTEM_UPDATE / HIGH / MEDIUM / S / Evidence HIGH / Risk HIGH / Dependencies NONE / P1 / ADOPTED`.
- Implementation action: none. This is already adopted and is a high-risk persistent-data invariant.
- `HISTORICAL_BACKFILL_COMPLETE_THROUGH`: unchanged; this bounded slice does not prove complete coverage for all tracked sources through a new date.
