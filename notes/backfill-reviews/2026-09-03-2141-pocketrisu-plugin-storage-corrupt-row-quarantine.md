# Historical backfill review — plugin storage corrupt-row quarantine

Reviewed source: `PocketRisu/PocketRisu`

Historical commit: `167def7df98e8272dcb179a4e8b4451e29e32604`

Current verification ref: `278251f85a19bfdfd4cf3faae780e62682878f9e`

Outcome: meaningful adopted invariant recorded as `PLUGIN-STORAGE-CORRUPT-ROW-REFETCH-QUARANTINE` in `notes/idea-ledger-addenda/2026-09-03-2141-plugin-storage-corrupt-row-quarantine.md`.

The reviewed change prevents a malformed plugin-storage value from being fetched and parsed again on every index refresh while preserving recovery when the key is rewritten or disappears from the authoritative index and is later recreated.

This bounded review does not establish complete historical coverage for all tracked sources through any new date, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` must not advance from this review alone.
