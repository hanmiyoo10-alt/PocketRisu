# Historical review — plugin storage corrupt-row quarantine

Reviewed source: `PocketRisu/PocketRisu`

Source commit: `167def7df98e8272dcb179a4e8b4451e29e32604`

Current preservation check: `develop@278251f85a19bfdfd4cf3faae780e62682878f9e`

## Finding

A malformed plugin-storage row can remain present in the authoritative server index while being unreadable to the client parser. If parse failure is represented only by deleting the key from local cache/index state, each periodic index refresh re-discovers the key as remotely present and locally missing; preload top-up then repeatedly downloads and reparses the same permanently bad bytes.

The source fix gives parse failure its own repairable reconciliation state (`unparseable`). Automatic top-up excludes quarantined keys. Successful parsing/writes clear quarantine. If a fresh server index no longer contains the key, quarantine is cleared so later recreation can be retried. This is deliberately distinct from deletion/tombstone authority.

Focused source tests cover repeated refresh suppression, survival of unrelated good rows, and repair via rewrite. Current develop retains the same state boundary.

## Dedupe boundary

This belongs to the broader plugin-storage reconciliation family but is not a duplicate of:

- non-destructive snapshot/merge semantics — governs write/delete authority;
- LRU/cache eviction invariants — governs residency;
- generic retry caps — bounds transient request attempts;
- tombstones — represent explicit removal intent.

The distinct invariant is: **known-unparseable persistent state can suppress automatic rereads until a concrete repair signal, but parse failure alone must never become deletion authority or permanent negative caching.**

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`

## Coverage marker

This is one bounded historical slice. It does not prove complete reviewed history across all tracked sources, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
