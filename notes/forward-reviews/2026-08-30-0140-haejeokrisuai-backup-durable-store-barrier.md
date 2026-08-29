# HaejeokRisuai forward review — durable-store backup barrier

Reviewed source: `nevaeh5379/HaejeokRisuai:main`

Authoritative prior cursor: `75334b4343accd4f9d7be1870c3e2a47f4dafc1c`
Reviewed through: `1d659a5bcfd3b3c33c136ac86b2dd788985a2ff3`

## Reviewed commits

- `4342d6c38015c3a8a63c8597245476297671a163` — before a local backup snapshot, fold canonical live settings into the active preset, flush character/settings/message/persona/module stores, and cap previously unbounded preset/plugin-key memory caches.
- `184897276ca370ef6b5c5f4df658bdb8642e0532` — split database-domain data into explicit per-store ownership contracts.
- `16b94415ece3fa4306d6eee2bf1debb97d8f7844` — add a durable-store flush/pending-write lifecycle and refuse backup creation if any participating domain still reports pending writes.
- `db9c20651ab3dbe0092fae079415a09daf585d8d` — move deferred settings hydration into a dedicated loader owner so backup fallback and plugin callers explicitly ensure required deferred data.
- `1d659a5bcfd3b3c33c136ac86b2dd788985a2ff3` — replace the temporary inheritance base with typed `FlushableStore` / `InitializableStore` contracts while preserving the backup lifecycle behavior.

## Meaningful transferable idea

`BACKUP-SNAPSHOT-DURABLE-STORE-BARRIER`

The transferable invariant is not HaejeokRisuai's store architecture itself. A backup/export snapshot must be taken only after every state owner whose mutations can lag durable storage has participated in one explicit flush barrier, and the snapshot must fail closed if any participating owner still reports pending writes. Compatibility-derived state (for example a portable preset assembled from canonical settings) must also be materialized before the storage-level snapshot is taken.

This matters because a successful backup file can otherwise be internally stale even when no individual write failed: one domain can still hold buffered state while another domain has already reached durable storage. The source evidence strengthens the ownership model by pairing the barrier with explicit per-store contracts rather than relying on a hard-coded subset forever.

## PocketRisu fit

Current personal-fork `src/ts/drive/backuplocal.ts` delegates the full backup path to `forageStorage.exportBackup()` and does not expose the Haejeok domain-store lifecycle owner in this file. That means the source patch is not a direct port candidate. The correct next step is to trace PocketRisu's actual write buffering / server export ownership and prove whether an equivalent cross-owner gap exists before changing backup semantics.

Guardrails: do not add visibility/pagehide flushes; do not change `flushServerDbKeepalive()`; preserve current save/integrity optimizations; no storage migration or destructive restore change.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: `PocketRisu backup/export ownership map + inventory of buffered write owners + reproducible stale-snapshot test + explicit timeout/failure semantics`
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai` `4342d6c38015c3a8a63c8597245476297671a163`, `16b94415ece3fa4306d6eee2bf1debb97d8f7844`, `1d659a5bcfd3b3c33c136ac86b2dd788985a2ff3`; ownership context `184897276ca370ef6b5c5f4df658bdb8642e0532`, `db9c20651ab3dbe0092fae079415a09daf585d8d`
- Benefit: prevent successful-but-stale backups when one buffered domain has not reached the durable snapshot boundary.
- Conflict/risk: a wrongly scoped global flush can regress latency, deadlock save chains, or reintroduce forbidden lifecycle flush behavior; an incomplete participant list creates false confidence.
- Validation need: reproduce a pending-write/export overlap, prove exported data contains the latest mutation for every participating owner, prove failure is fail-closed when a participant cannot flush, and verify normal save/integrity behavior is unchanged.
- Follow-up: assistant-owned design dossier; remain design-only until PocketRisu ownership and a failing regression test establish a real gap.

## Cursor decision

Forward coverage is complete for these five commits, so advancing the HaejeokRisuai cursor to `1d659a5bcfd3b3c33c136ac86b2dd788985a2ff3` is supported. Historical-backfill coverage is unchanged.