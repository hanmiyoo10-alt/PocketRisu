# PLUGIN-STORAGE-WRITE-TOKEN-ROLLBACK-AUTHORITY

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle status: `ADOPTED`

## Source evidence

- `PocketRisu/PocketRisu` `8190e27aefadd9ba2708b4c36e24ba651d09857c` — optimistic plugin-storage cache updates are rolled back when the persistent server write/remove fails, and write failures are surfaced rather than leaving phantom local state.
- `PocketRisu/PocketRisu` `dc0148d9afcc2422ea4edf92243bf0b4097acac6` — rollback ownership is guarded by a per-key monotonic write token instead of value identity, so an older failed write cannot clobber a newer successful write of the same value; `clear()` invalidates outstanding tokens so late failures cannot refill cleared cache state.
- Verified preserved at durable reviewed tip `ca09a80746e74e5334145e5e78af47ce423e0eba` in `src/ts/plugins/pluginSafeClass.ts`.

## PocketRisu benefit

Preserves read-after-write compatibility for plugins without letting optimistic browser state become a false authority when server persistence fails. Concurrent writes, same-value rewrites, removals, and clears remain ordered by mutation ownership rather than payload equality.

## Conflict / risk

A naive rollback keyed only by cached value can revert a later successful write when two writes carry equal values. A late rejected remove/write can also resurrect state after an explicit clear if rollback epochs are not invalidated. Metadata sidecar failure must not be misreported as failure of an already successful authoritative storage write.

## Validation need

Keep regression coverage for: rejected first write leaves no phantom value; rejected overwrite restores prior persisted value; rejected remove restores the prior value; an older failed write cannot clobber a newer different-value write; an older failed write cannot clobber a newer same-value write; clear invalidates in-flight rollback authority; owner metadata failure after successful persistence does not turn the write into a false failure.

## Follow-up

Treat this as an adopted storage invariant, not a new port candidate. Any future plugin-storage batching, queueing, offline cache, or transport refactor must preserve per-mutation rollback authority and clear/epoch invalidation semantics. Do not generalize the optimistic-cache pattern to other persistence domains without equivalent ordering and failure-path tests.
