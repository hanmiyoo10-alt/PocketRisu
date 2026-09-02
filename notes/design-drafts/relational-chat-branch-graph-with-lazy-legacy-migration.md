# Design draft — RELATIONAL-CHAT-BRANCH-GRAPH-WITH-LAZY-LEGACY-MIGRATION

Status: `DESIGN_NEEDED`

## Problem / evidence

HaejeokRisuai moved branch lineage from embedded/flat branch state toward explicit branch rows plus message-parent/origin links, then added lazy migration of legacy branch state and a graph-specific load path. Source evidence: `1cd25bbd689191c0b507a824f7d6c5f2d248f61e`, `b8ff7e49f9d5531d22cbe3d7149dc46a89876b97`, `17f42ac2675808773000b1b07b2b1d2e7eb62409`, merged by `f17cf2ea235db061be3cdb6acbda5d3aad3c6531`.

The transferable question for PocketRisu is whether branch lineage should be stored independently from full message arrays so branch navigation can read only lineage/generation data and avoid repeatedly materializing unrelated prompt/attribute relations.

Evidence is `MEDIUM`: there is a concrete maintained implementation, but no PocketRisu measurement yet proving branch representation is a meaningful bottleneck.

## Minimal safe scope

Design and benchmark only. The first independently useful slice would be a read-only branch-lineage projection derived from current PocketRisu data without changing persistence. No schema migration belongs in the first slice.

## Ownership boundaries

- chat/message durable payload: remains authoritative under current PocketRisu persistence until a separately reviewed migration exists;
- branch lineage projection: read-only derived view in the first slice;
- active branch selection: user/session state whose semantics must remain unchanged;
- import/export and backup/restore: must continue to round-trip all branch history before any storage change;
- server DB/storage migration: separate high-risk ownership boundary requiring explicit recovery and rollback.

## Proposed mechanism

1. Instrument current branch/chat representation: serialized bytes, message count, branch count, switch latency, retained browser memory.
2. Define a runtime-neutral branch graph contract containing branch id, parent branch, fork message, head message, active branch, message parent, origin branch and only the minimum generation metadata needed for navigation.
3. Build that graph as a read-only projection from current storage and compare navigation behavior against current semantics.
4. Only if measurements justify persistence changes, design a versioned relational/normalized representation with an explicit migration marker and idempotent migration transaction.
5. Legacy migration must run only when authoritative version/shape evidence proves the chat is unmigrated; row-count heuristics alone are insufficient for PocketRisu unless proven collision-free.
6. Query-shape-specific reads may omit prompt/attribute relations only when the caller contract does not expose them.

## Compatibility / invariants

- no chat/message loss or reordering;
- active branch and fork-point semantics remain identical;
- edit/delete/regenerate operations preserve parent/origin relationships;
- import/export, backup/restore and crash recovery remain lossless across old/new representations;
- migration is idempotent and cannot partially publish a new representation;
- old data remains readable until migration commit succeeds;
- no change to PocketRisu DB flush guardrails, save/integrity optimizations, targeted V3 reload, runit, or server-phone notification policy.

## Validation / acceptance

Before `READY_TO_PORT`:

- baseline measurements demonstrate a material branch-related memory/latency or payload problem;
- property/regression tests cover single branch, deep forks, sibling forks, edits, deletes, regenerations and active-branch switching;
- legacy/new round-trip produces equivalent visible chat history and branch lineage;
- injected migration failure before commit leaves old representation authoritative and usable;
- repeated migration is a no-op after successful commit;
- backup/restore and import/export preserve graph identity and all messages;
- graph-only read demonstrably avoids unrelated relation loads without changing caller-visible fields.

## Risk / blast radius

`HIGH`. A persistence migration can orphan messages, select the wrong branch, lose fork history, or create restore incompatibility. SQL/provider-specific concurrency assumptions from Haejeok must not be imported blindly.

## Rollback / fallback

Keep current representation authoritative through the first read-only projection phase. Any future migration must write into staging/new-version structures, validate completeness, then atomically publish a version pointer/marker. On failure, retain and read the old representation. Do not destructively rewrite or delete legacy branch data in the same transaction that first creates the new graph.

## Dependencies

- current PocketRisu branch semantics inventory;
- performance/memory measurements;
- migration versioning and recovery contract;
- backup/restore and import/export compatibility design.

## PR decomposition

1. instrumentation + read-only graph contract/projection, no persistence change;
2. graph-aware read benchmark and compatibility tests;
3. only if justified: versioned storage schema/staging writer behind a feature boundary;
4. migration validator + rollback/recovery tests;
5. cutover in a separately reviewed high-risk PR.

This remains `DESIGN_NEEDED`; no autonomous implementation is authorized under the current gate.