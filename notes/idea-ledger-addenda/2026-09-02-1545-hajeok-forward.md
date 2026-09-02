# Idea ledger addendum — Haejeok forward review 2026-09-02

## `RELATIONAL-CHAT-BRANCH-GRAPH-WITH-LAZY-LEGACY-MIGRATION`

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `MEDIUM`
- `Difficulty`: `HIGH`
- `Size`: `L`
- `Evidence`: `MEDIUM`
- `Risk`: `HIGH`
- `Dependencies`: explicit PocketRisu branch semantics, storage ownership model, migration/recovery contract, and measurements proving current branch representation is a real bottleneck
- `Priority`: `P3`
- lifecycle status: `DESIGN_NEEDED`
- source evidence: `nevaeh5379/HaejeokRisuai@1cd25bbd689191c0b507a824f7d6c5f2d248f61e`, `b8ff7e49f9d5531d22cbe3d7149dc46a89876b97`, `17f42ac2675808773000b1b07b2b1d2e7eb62409`, merged at `f17cf2ea235db061be3cdb6acbda5d3aad3c6531`
- benefit: explicit parent/origin/head relationships can avoid repeatedly embedding whole branch message arrays, support graph-aware navigation, and permit query-shape-specific loading of only the relations required by a branch operation
- conflict/risk: this is a storage-architecture migration with chat-history correctness and recovery blast radius; Haejeok's Azure/Postgres schema is not authority for PocketRisu and cannot be copied wholesale
- validation need: first measure current PocketRisu branch/chat payload size and branch-switch latency; define exact compatibility semantics for active branch, parent links, fork points, generation metadata, delete/edit behavior, import/export, backup/restore, and crash recovery
- follow-up: keep design-only until assumptions, migration invariants, rollback and recovery are concrete; do not implement automatically under current safety gate

### Distinct transferable idea

The useful principle is not the exact SQL schema. It is to separate branch identity/lineage from message payload ownership, lazily migrate legacy embedded branch state only when a chat is unambiguously still in the old representation, and provide a graph-specific read mode that omits unrelated prompt/attribute relations.

### Deduplication

Related to existing long-chat paging/compaction ideas but not identical. Paging owns bounded active-message materialization; this item owns persisted branch lineage and migration between embedded and relational representations.

### Progression

Assistant-owned design draft: `notes/design-drafts/relational-chat-branch-graph-with-lazy-legacy-migration.md`. No branch/implementation/PR created because this is high-risk storage architecture and `Size: L`.