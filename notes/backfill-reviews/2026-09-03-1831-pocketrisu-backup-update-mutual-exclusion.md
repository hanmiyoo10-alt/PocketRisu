# Historical backfill review — server backup/update mutual exclusion

- Source: `PocketRisu/PocketRisu:develop`
- Reviewed commit: `775fcd1e6bbeb52343c8a3a4643be73e8dabe157`
- Current preservation check: `ca09a80746e74e5334145e5e78af47ce423e0eba`
- Result: meaningful adopted invariant recorded as `SERVER-BACKUP-UPDATE-MUTUAL-EXCLUSION`.
- Dedupe decision: treat backup-in-flight/update restart exclusion plus stale backup-temp cleanup as one lifecycle-safety invariant. The same commit's custom backup-directory updater preservation is retained as related evidence, not promoted as a separate idea in this bounded pass.
- Classification: `NO_SYSTEM_UPDATE / HIGH / LOW / S / Evidence HIGH / Risk HIGH / Dependencies NONE / P0 / ADOPTED`.
- Implementation progression: none; the invariant is already present in official PocketRisu and the safety gate does not call for reimplementation.
- Coverage marker: no change to `HISTORICAL_BACKFILL_COMPLETE_THROUGH`; this review is a bounded slice and does not prove exhaustive coverage across tracked sources through a new date.
