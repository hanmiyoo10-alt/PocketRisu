# Forward review — HaejeokRisuai chat duplication completeness

Reviewed source: `nevaeh5379/HaejeokRisuai:main`

Authoritative cursor before review: `56b0385ce70bb0acf1475a7f34679b13d07a8173`
Reviewed through: `3e122b0dee1f73a4d3b413e18d427baad030862a`

## Meaningful evidence

### Complete hydrated chat duplication with stable identity

Primary evidence: `3dc4e9573e7739e6c061fe4e709088c9041c59fd`.

The source changed chat duplication so it no longer blindly clones the currently materialized in-memory chat. It now:

- requests a full message preload before cloning;
- remembers stable character/chat identifiers before the async preload, then re-finds the same source after preload so reordering/realtime mutation cannot silently redirect the clone;
- refuses to duplicate when the source still reports partial/unloaded state or has fewer materialized messages than its known total;
- assigns fresh message UUIDs and remaps bookmark references to the new IDs;
- clears branch/streaming/transient runtime state that should not be inherited by the duplicate;
- persists the duplicate as a distinct chat rather than sharing persistence identity;
- adds regression tests for duplication behavior.

The same commit also makes malformed inlay restore data fail locally instead of aborting a whole restore. That is useful recovery evidence, but it is kept merged with the existing backup/restore safety family rather than promoted as a separate idea in this review.

## Classification decision

New durable idea: `CHAT-COMPLETE-DUPLICATION-SNAPSHOT`.

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: `PocketRisu chat duplication/copy owner audit + stable chat/message identity contract + any lazy-message hydration owner`
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai` `3dc4e9573e7739e6c061fe4e709088c9041c59fd`
- Benefit: prevents silent history truncation and broken internal references when duplicating partially hydrated or concurrently reordered chats.
- Conflict/risk: an over-eager preload can add latency/memory pressure; identity remapping can break plugins/bookmarks if not exhaustive; async preload can race navigation/reorder.
- Validation need: reproduce PocketRisu duplication with partially materialized long chat; assert complete message count, fresh message IDs, bookmark/reference remap, transient-state reset, source immutability, and stable target identity across reorder/navigation races.
- Follow-up: inventory PocketRisu's actual duplication path. If a bounded owner exists, first implementation slice should be tests + fail-closed completeness checks before any broader persistence refactor.

## Deduplication

This is related to `STORAGE-DEFERRED-DOMAIN-COMPLETE-SNAPSHOT`, but not the same underlying idea. That storage item governs export/backup completeness across durable domains; this item governs clone semantics and identity/reference ownership inside chat duplication. Evidence is cross-linked, not merged into one record.

## Cursor decision

Advance only the HaejeokRisuai forward cursor to `3e122b0dee1f73a4d3b413e18d427baad030862a`. No cursor was moved backward. Historical coverage marker unchanged.