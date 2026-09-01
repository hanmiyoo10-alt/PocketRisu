# PocketRisu historical review — plugin-storage write-generation rollback

## Source

- `PocketRisu/PocketRisu@8190e27aefadd9ba2708b4c36e24ba651d09857c`
- `PocketRisu/PocketRisu@dc0148d9afcc2422ea4edf92243bf0b4097acac6`

## Finding

`SafeLocalPluginStorage` intentionally exposes optimistic local read-after-write behavior before the server persistence round trip completes. A rejected server write therefore must roll back the optimistic cache entry, but only if the failing operation still owns the latest write generation for that key.

The first fix correctly restored the prior value on a failed server write and surfaced the error, but initially used value identity to decide rollback ownership. That is insufficient when two overlapping writes carry the same value: an older failing write can otherwise undo a newer successful write. The follow-up assigns a monotonically increasing per-key write token and permits rollback only when the failed operation's token is still current. `clear()` also invalidates tokens so an in-flight failure cannot repopulate cleared local state.

## Preserved invariant

- optimistic cache state is not durable truth;
- failed persistence must not leave phantom local success;
- rollback authority belongs to the operation generation, not to value equality/identity;
- a stale failed write must never clobber a newer successful write, including same-value writes;
- clear/reset must invalidate outstanding rollback authority;
- sidecar ownership-metadata failure after the durable write succeeds must not be misreported as loss of the durable write.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- source evidence: commits above plus regression tests for rejected write/remove, stale rollback, same-value concurrent writes, and clear invalidation
- benefit: prevents cross-request cache rollback races and local/server divergence in plugin storage
- conflict/risk: incorrect generation bookkeeping can retain phantom optimistic state or roll back a newer committed value
- validation need: preserve regression coverage for failed set/remove, overlapping same-key writes with equal and unequal values, clear during in-flight failure, and owner-metadata failure
- follow-up: treat per-operation generation identity as the required rollback authority pattern for any future optimistic server-backed cache

## Backfill coverage

This is a bounded historical normalization only. It does not establish complete historical coverage through a new date and does not move any Active-source forward cursor.
