# Backfill review — PocketRisu client-projection ETag authority

- Reviewed source: `PocketRisu/PocketRisu:develop`
- Historical commit: `97cdd7a552053cda598ada4eae355b1b052f4705`
- Review mode: bounded historical backfill; active forward cursor unchanged

## Finding

The lazy-asset-manifest merge resolved a correctness boundary between server-internal hydrated state and the client-visible database projection. `/api/write` must compute the persisted ETag from the same client projection that the next `/api/read` serves (with chat bodies / manifest-backed data stripped as appropriate), rather than from a richer internal representation. Otherwise a successful write can publish an ETag that the next read cannot reproduce, causing false precondition failures or stale-write confusion.

The same merge also consolidates cold-load stripping through `loadDbCacheIfMissing` and avoids re-stripping warm cache entries, preventing a superseded manifest from being reactivated by repeatedly transforming already-normalized cached state.

## Classification

- Feature-ID: `CLIENT-PROJECTION-ETAG-AUTHORITY`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu@97cdd7a552053cda598ada4eae355b1b052f4705`
- Benefit: keeps optimistic-concurrency identity stable across write -> read projection boundaries and avoids cache-normalization drift.
- Conflict/risk: hashing the wrong representation can produce spurious ETag mismatch; applying non-idempotent projection transforms to warm cache can resurrect stale side-channel state.
- Validation need: assert `write(clientProjection) -> persisted ETag == ETag(next read clientProjection)`; assert warm reads do not reactivate superseded manifests; assert cold load applies stripping exactly once through the canonical path.
- Follow-up: preserve as an invariant whenever storage projection, lazy manifests, chat stubs, patching, or ETag semantics change. No autonomous implementation is needed because this is already adopted upstream.

## Deduplication

Kept separate from the existing stale-write/revision item (`b95d0fa7` evidence). That item governs recomputing current precondition identity and revision bumps after side-channel edits; this item governs **which representation is authoritative for the ETag itself** across server-internal vs client-visible state.

## Cursor / coverage

No active source cursor was moved by this historical review. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` was not advanced because this is a bounded single-slice review, not proof of complete coverage across all tracked sources.
