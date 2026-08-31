# Historical backfill — selection-path bounded hydration

Source: `nevaeh5379/HaejeokRisuai`
Reviewed commit: `9a946c4dc64a485c2a326bdb535d1eb2076c8df0` (2026-08-24)
Forward cursor impact: none; historical review only.

## Finding

Haejeok separates interactive character/chat selection from full entity hydration. Character selection can return chat summaries without relational chat details, chat opening batches the row/relations/count/bounded message page into one worker round trip, and full `loadCharacter` semantics remain available for backup/export and other callers that require complete state.

The transferable idea is the ownership invariant, not the Haejeok wire/API shape: interactive selection should hydrate only state required for first paint and immediate interaction; complete hydration remains an explicit caller contract.

## Deduplication

This is related to but not identical with active-chat paging, deferred heavy-domain startup hydration, and idle inactive-chat eviction. Those govern retained data volume or lifecycle; this item governs caller-specific hydration authority on the character/chat switch hot path.

## PocketRisu relevance

Direct PocketRisu evidence for an equivalent over-hydration bottleneck has not yet been established. Therefore this remains design/investigation only. Do not introduce a second storage architecture or copy Haejeok's optional hook mechanically.

## Guardrails

- preserve current save/integrity optimizations;
- no forced DB flush on `visibilitychange` / `pagehide`;
- preserve `flushServerDbKeepalive()` no-op;
- preserve targeted V3 plugin reload;
- no PM2 or server-phone notification changes.

## Historical coverage

This review does not prove complete coverage for all tracked sources through 2026-08-24 and does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
