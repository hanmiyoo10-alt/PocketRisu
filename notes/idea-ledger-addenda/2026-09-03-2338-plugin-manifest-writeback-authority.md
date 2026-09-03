# PLUGIN-MANIFEST-WRITEBACK-AUTHORITY

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `HIGH`
- Risk: `HIGH`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`

## Source evidence

- `PocketRisu/PocketRisu@f79c8989fe2e5630e2c85f4449a868ec069300c8` — fixes plugin `getDatabase()` snapshots so manifest-backed character assets are hydrated consistently with module assets, and resolves array+descriptor write-back ambiguity so edited arrays cannot be silently masked by stale descriptors.
- Current preserved implementation inspected at `PocketRisu/PocketRisu@278251f85a19bfdfd4cf3faae780e62682878f9e`, `src/ts/plugins/pluginCharacterSnapshot.ts`.

## Benefit

Prevents a plugin read-modify-write round trip from showing an asset edit locally while the server persists the old manifest descriptor and silently drops the edit. Keeps compatibility snapshots eager only at the plugin boundary while DBState remains manifest-lazy.

## Conflict / risk

The write-back resolver is data-integrity sensitive. A false `inline` decision can replace authoritative manifest state with an incomplete list; a false `restore`/`discard` can erase a legitimate plugin edit. Identity matching must use durable owner IDs (`chaId` for characters, module/persona IDs where available), not positional coincidence. Snapshot hydration must not mutate the manifest cache instance handed out for comparison.

## Validation need

Preserve regression coverage for: untouched hydrated round-trip restores the descriptor; edited hydrated list wins and drops the descriptor; lazy/unhydrated incomplete writes are discarded rather than replacing the stored manifest; stale-manifest writes do not overwrite newer state; reordered characters match by `chaId`; plugin `getDatabase()` sees character/module/persona asset lists consistently; failure to hydrate leaves the detached snapshot safe rather than mutating DBState.

## Follow-up

Treat this as an invariant for future lazy-manifest, plugin API, or storage refactors. Do not generalize it into eager DB hydration outside compatibility snapshots. Any change to manifest authority or plugin write-back semantics requires explicit failure-path tests and rollback because the blast radius includes silent persistent data loss.
