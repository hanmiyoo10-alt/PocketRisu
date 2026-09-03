# 2026-09-03 09:48 KST — Haejeok forward review

## DERIVED-CHAT-METADATA-STORAGE-AUTHORITY

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `MEDIUM`
- `Difficulty`: `MEDIUM`
- `Size`: `S`
- `Evidence`: `MEDIUM`
- `Risk`: `MEDIUM`
- `Dependencies`: PocketRisu must first expose an analogous persisted derived-chat metadata field whose canonical inputs live in the storage layer; none was found for `last_message_time` / `lastMessageTime` on current official `develop`.
- `Priority`: `P2`
- lifecycle status: `HOLD`
- source evidence: `nevaeh5379/HaejeokRisuai` commit `91955ae7b6dbd5e4e159c3f4d394fafe052f2c9c`, merged as `0329f44199e93103ba07a247df5e831173f02039` after prior cursor `d7a508692fd770c0377022a877d29ea3902c1f15`.
- benefit: When a persisted field is purely derived from canonical child rows, assigning recomputation to the storage boundary prevents stale caller deltas from becoming a second write authority. The source change derives `chats.last_message_time` from newest message rows for INSERT/UPDATE/DELETE, backfills existing rows, and reapplies the invariant at startup.
- conflict/risk: The concrete SQL trigger and SQLite recomputation are source-architecture-specific. Blindly adding triggers or a duplicate metadata column to PocketRisu would expand persistence authority and migration surface without a demonstrated corresponding field.
- validation need: Before any port, identify an actual PocketRisu derived field with stale-delta risk; prove its canonical inputs and ordering/tie-break semantics; test insert/update/delete/move/reorder paths, restart/backfill behavior, transaction rollback, and estimate/batching accounting. Verify there is exactly one authoritative derivation path.
- follow-up: Keep as a storage-ownership design lesson. If PocketRisu later persists sidebar/chat recency or similar metadata separately from canonical messages, prefer storage-owned recomputation or an equivalent single-authority mechanism; do not port Haejeok SQL triggers wholesale.

### Dedupe note

This is related to the broader lazy/partial-state write-authority family, but it is not the same idea. `LAZY-CHAT-HYDRATION-WRITE-AUTHORITY` prevents incomplete representations from overwriting unloaded state; this item concerns a *derived* scalar gaining competing caller/storage write authorities. Keep the evidence linked but the authority boundaries distinct.

### Forward-cursor result

Reviewed `nevaeh5379/HaejeokRisuai:main` through merge HEAD `0329f44199e93103ba07a247df5e831173f02039`. Other active sources checked in this pass were unchanged at their durable cursors. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` was not advanced because this forward review does not establish complete historical coverage.
