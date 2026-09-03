# Historical backfill review — partial backup + externalized plugin storage

Reviewed source: `PocketRisu/PocketRisu:develop`

Historical commit: `343c2e278414e5d050b8192a49f55755aeb3639b` (2026-08-25)

## Finding

After plugin custom storage moved out of the ordinary browser DB object, `db.pluginCustomStorage` intentionally remained empty on the client. Partial local backup still encoded a client DB copy, while `.bin` import/restore could replace plugin storage wholesale. That combination made omission destructive: a valid partial backup could restore as an empty plugin store.

The fix introduced `pluginStorageStore.snapshotAll()` and explicitly embeds that complete externalized domain into the backup copy before encoding. The helper reads through the normal store path in bounded chunks, does not flip the normal preload state, yields a detached object, and preserves `__proto__` as an own property. Source tests cover those helper invariants.

Current `develop@278251f85a19bfdfd4cf3faae780e62682878f9e` still calls `dbCopy.pluginCustomStorage = await pluginStorageStore.snapshotAll()` in `SavePartialLocalBackup()`.

## Durable lesson

A backup/export writer must be closed over every authoritative domain that its corresponding restore path can replace. An intentionally sparse/lazy client projection is not sufficient evidence that the domain is empty. Externalization therefore creates an audit obligation across every backup/export/import path.

Classification and deduplication are recorded in `notes/idea-ledger-addenda/2026-09-03-1336-partial-backup-externalized-plugin-storage.md`.

This bounded review does not by itself prove complete historical coverage through 2026-08-25 for all tracked sources, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is not advanced.
