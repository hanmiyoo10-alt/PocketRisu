# Forward review — HaejeokRisuai character duplication completeness

Reviewed authoritative forward range:

- Source: `nevaeh5379/HaejeokRisuai:main`
- Previous cursor: `3e122b0dee1f73a4d3b413e18d427baad030862a`
- Reviewed HEAD: `9729880ef9b4da7887e790c7ba7f2e294db1bacc`
- Meaningful commits: `ad4d8ab40c4d2af60c04db4384b9caef304275ce`, `9729880ef9b4da7887e790c7ba7f2e294db1bacc`

## Finding

These commits extend the previously recorded `CHAT-COMPLETE-DUPLICATION-SNAPSHOT` lesson from single-chat duplication to whole-character duplication and HTML chat import persistence.

`ad4d8ab4` replaces a shallow JSON clone in the mobile character duplication path with a helper that hydrates cold-storage character data, details, chats, and chat messages before cloning. It assigns fresh character/chat/message identities, remaps bookmarks, persists duplicated messages through the message store, and adds tests. The same commit also validates the imported HTML chat container, creates a fresh chat ID, and persists imported messages rather than leaving them only in runtime state.

`9729880e` then hardens the new helper against async ownership drift: it no longer trusts the original list index after hydration, re-finds the source character by stable `chaId`, resolves chats by reference/unique ID, verifies hydration actually completed, and aborts instead of constructing a partial or ambiguous duplicate. It also tightens imported-chat shape checks.

The underlying transferable idea is therefore not a separate character-only feature. It is a generalized duplication invariant: **a durable duplicate must be constructed from a proven-complete authoritative source snapshot, stable source identity must be revalidated after every async hydration boundary, new durable identities must be disjoint from the source, internal duplicate-local references must be remapped, and persistence must complete through the authoritative owner.**

## Classification merge

- Feature / ledger identity: `CHAT-COMPLETE-DUPLICATION-SNAPSHOT` (generalized to character + nested chat duplication; no duplicate ledger item created)
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: PocketRisu character/chat duplication and import owner audit; stable character/chat/message identity contract; authoritative lazy hydration owner; duplicate-local reference inventory
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai` `3dc4e9573e7739e6c061fe4e709088c9041c59fd`, `ad4d8ab40c4d2af60c04db4384b9caef304275ce`, `9729880ef9b4da7887e790c7ba7f2e294db1bacc`
- Benefit: prevents silent data truncation, wrong-source cloning after async reorder, durable-ID collisions, broken bookmark/reference ownership, and runtime-only imports
- Conflict / risk: full hydration may spike memory/latency on large characters; incorrect remap/persistence can corrupt duplicate-local references or create half-durable copies
- Validation need: direct PocketRisu owner inventory and reproduction/code proof; partial-hydration fixtures; async reorder/removal tests; source/duplicate ID disjointness; nested bookmark/reference remap; import durability after reload; fail-closed hydration/persistence failure tests
- Follow-up: keep `DESIGN_NEEDED`; first implementation-eligible slice remains tests/owner inventory only after PocketRisu applicability is proven

## Autonomous progression

- merged evidence into the existing idea instead of creating a duplicate;
- generalized the assistant-owned design dossier to cover whole-character/nested-chat duplication and import durability;
- advanced only this source's forward cursor to `9729880ef9b4da7887e790c7ba7f2e294db1bacc`;
- no feature branch, implementation, test run, or personal-fork PR: PocketRisu applicability/dependencies remain unresolved, so execution gates are not satisfied.

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged; this was a forward-only review.
