# Historical backfill — Haejeok scalar character interaction touch

Reviewed source: `nevaeh5379/HaejeokRisuai@14b5b91e775ab256df69dd20f0a9228b3aa9e7f2` (2026-08-24).

## Finding

The commit separates routine `lastInteraction` timestamp persistence from full character persistence. Instead of letting a selection/generation timestamp mark the whole character object dirty and rewrite relational character extension data, it emits a narrow `characterTouches` payload that updates only the character row's scalar interaction timestamp while preserving revision/audit semantics. Full character writes remain reserved for structural/legacy-migration changes.

The same commit reports this as part of eliminating cumulative character-switch slowdown and adds regression coverage proving a lightweight touch does not rewrite SQLite extension nodes; server payload validation also constrains the touch to an id plus non-negative safe-integer timestamp.

## Deduplication

This is not the same underlying idea as `Domain-specific stores with explicit dirty marking and serialized commits`. That older item concerns broad storage architecture. This slice is a bounded hot-path ownership invariant: high-frequency scalar metadata must not accidentally promote itself into a structural entity rewrite. Keep the architecture item as context rather than merging them.

## PocketRisu applicability

Direct PocketRisu evidence is not yet established. Repository code search did not expose an obvious `lastInteraction` field under the same name, so a field/ownership audit is required before implementation. Do not cargo-cult Haejeok's `characterTouches` payload shape.

Potential benefit is lower character/chat switch and generation bookkeeping cost if PocketRisu currently persists comparable interaction metadata through a broad character save path.

## Safety boundary

- preserve current save/integrity optimizations and revision identity;
- do not bypass canonical dirty tracking for structural character changes;
- scalar touch must be idempotent and narrow;
- a touch failure must not silently claim structural state was persisted;
- no visibility/pagehide flush changes;
- no server-phone/system update implications.

Historical backfill marker is unchanged: this is one bounded slice, not proof of complete coverage through 2026-08-24 for every tracked source.
