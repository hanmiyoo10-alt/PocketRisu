# Backfill review — plugin storage optimistic rollback ordering

Reviewed historical PocketRisu commits `8190e27aefadd9ba2708b4c36e24ba651d09857c` and `dc0148d9afcc2422ea4edf92243bf0b4097acac6`.

Meaningful distinct lesson: optimistic local plugin-storage state must roll back when authoritative persistence fails, but rollback authority belongs to the specific mutation instance, not to a value comparison. This matters for same-value concurrent writes and for clear/remove races. The invariant is preserved at reviewed durable tip `ca09a80746e74e5334145e5e78af47ce423e0eba`.

Classification and durable handoff are recorded in `notes/idea-ledger-addenda/2026-09-04-0031-plugin-storage-write-token-rollback-authority.md` as `PLUGIN-STORAGE-WRITE-TOKEN-ROLLBACK-AUTHORITY` with lifecycle `ADOPTED`.

This bounded slice does not establish complete historical coverage for every tracked source, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
