# PLUGIN-STORAGE-CORRUPT-ROW-REFETCH-QUARANTINE

- System impact: NO_SYSTEM_UPDATE
- Importance: MEDIUM
- Difficulty: LOW
- Size: XS
- Evidence: HIGH
- Risk: MEDIUM
- Dependencies: NONE
- Priority: P1
- lifecycle status: ADOPTED

## Source evidence

- `PocketRisu/PocketRisu` commit `167def7df98e8272dcb179a4e8b4451e29e32604` (`fix(plugin storage): stop re-reading corrupt rows on every index refresh`).
- The fix remembers keys whose stored JSON fails to parse, excludes those keys from preload/index top-up refetches, clears the quarantine when a normal write repairs the key, and clears it when a refreshed server index no longer lists the key so a later recreation can be read again.
- Regression coverage verifies that a corrupt row is fetched once rather than on every index refresh and that rewriting the key restores normal reads.
- Verified preserved at `PocketRisu/PocketRisu:develop@278251f85a19bfdfd4cf3faae780e62682878f9e`; the `unparseable` set and recovery semantics remain present in `src/ts/plugins/pluginStorageStore.ts`.

## Benefit

A permanently malformed plugin-storage row should not become a periodic network/parse/logging loop. Quarantining a known-unparseable row bounds repeated work while allowing explicit repair or authoritative disappearance/recreation to recover the key.

## Conflict / risk

A permanent quarantine would hide repaired external state. The quarantine therefore must not be treated as an authoritative deletion: a successful write clears it, and a refreshed authoritative index that drops the key clears it so a later recreated row can be fetched. Any future change to refresh ownership must preserve that recovery edge.

## Validation need

Preserve regression coverage for: first corrupt fetch returns missing; repeated refreshes do not re-fetch the same still-listed corrupt row; unrelated valid rows remain readable; local rewrite clears quarantine immediately; authoritative index removal clears quarantine so recreation can be observed.

## Follow-up

No port is needed: this is already adopted in PocketRisu. Preserve the invariant when changing plugin-storage preload, cache/index reconciliation, cross-device visibility, or corruption recovery. Do not merge this with destructive cleanup semantics; malformed storage remains a separately recoverable condition.
