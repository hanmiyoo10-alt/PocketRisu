# Forward review — HaejeokRisuai backup completeness

Reviewed forward-only range `62d46ff2d83d6027713e0253385c875be4c8e5b1..05896367fdd2be7f2f42d41f87f97227fd4b1b11` on `nevaeh5379/HaejeokRisuai:main` (8 commits).

## Meaningful idea: backup snapshot completeness must fail closed

Source evidence:
- `82e6923b2e50899fecf264e9375fe48102cfd455` adds an E2E reproduction showing partial-backup save/restore can lose installed modules when the backup snapshot omits the module domain.
- `6f272350bdc269698a645d67cb072fd6c3c27674` adds module records to SQL commit synchronization and preserves pre-existing modules during plugin-driven module creation.
- `60a88486bc79f80103cebb008ccf205aca7bd85b` expands backup-container probing and restore verification and includes module/preset reconstruction in SQL export paths.
- `05896367fdd2be7f2f42d41f87f97227fd4b1b11` removes the silent entity-hydration fallback for full SQL backup snapshots because it could emit incomplete backups after an underlying storage failure; backup creation now throws rather than presenting a partial snapshot as successful.

Classification:
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: inspect PocketRisu's current full/partial backup domain inventory and authoritative snapshot path; define required-domain manifest/completeness checks before any implementation
- Priority: `P1`
- lifecycle status: `DESIGN_NEEDED`

Benefit: prevents a backup artifact from looking successful while silently omitting durable domains, which otherwise turns a later restore into data loss.

Conflict/risk: backup/restore formats and storage ownership differ from HaejeokRisuai. Blindly requiring one SQL exporter could regress browser/local modes or increase peak memory. This is a data-protection boundary, so implementation must be adapted to PocketRisu rather than cherry-picked.

Validation need: enumerate every durable PocketRisu domain expected in full and partial backups; test fresh-context restore of modules/presets/plugin state/characters/chats/assets according to each backup mode; inject snapshot/export failure and assert no downloadable success artifact is finalized; verify existing save/integrity optimizations and no forced lifecycle flushes are changed.

Follow-up: assistant-owned design draft created in helper repo. Do not move to READY_TO_PORT until authoritative backup ownership and completeness criteria are explicit, failure behavior is fail-closed, rollback is concrete, and restore validation covers required domains.

## Cursor

Advanced `nevaeh5379/HaejeokRisuai:main` Last reviewed HEAD to `05896367fdd2be7f2f42d41f87f97227fd4b1b11`. No cursor moved backward.

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` unchanged; this was a forward review, not complete historical coverage.
