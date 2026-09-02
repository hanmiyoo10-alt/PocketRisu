# Historical review: translation loading state restoration

Reviewed: 2026-09-02 10:33 KST
Source: `PocketRisu/PocketRisu:develop`
Commit: `8daaa3695b7602d8947431d4447781d24b1e5604`
Feature-ID: `TRANSLATION-LOADING-STATE-RESTORES-RENDERED-TEXT`

## Finding

A prior flicker fix intentionally avoided replacing already-renderable text with the translation spinner while generation was streaming, because streaming reparses every chunk. That condition was too broad for manual/re-translate and non-streaming translations, where users legitimately expect a loading indicator. More importantly, a failed translation flight could leave the spinner as the rendered state.

The adopted fix scopes spinner visibility by request/runtime state: it may replace an empty slot, a user-requested re-translate, or a translation outside active generation. In `finally`, if the spinner still owns the rendered slot, it restores the best available renderable result or the pre-translation fallback, so failure cannot strand a loading sentinel on screen.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle status: `ADOPTED`
- Source evidence: official PocketRisu commit `8daaa3695b7602d8947431d4447781d24b1e5604`; direct diff in `src/lib/ChatScreens/ChatBody.svelte`
- Benefit: preserves correct loading feedback for manual/non-streaming translation while preventing a failed async translation from leaving the UI stuck on a spinner
- Conflict/risk: indiscriminate spinner replacement during streaming can reintroduce flicker; stale async completion must not overwrite newer rendered state
- Validation need: regression coverage for streaming first-paint, manual re-translate, non-streaming translation, failed translation with prior renderable text, and failed translation with only fallback text
- Follow-up: preserve this state-ownership rule in future translation/render refactors; no port required because it is already adopted in official PocketRisu

## Ownership invariant

A temporary loading sentinel may own the rendered slot only while the corresponding async operation is active and only where that replacement is UX-safe. On failure or completion, the sentinel must relinquish ownership to the best valid rendered result or the pre-operation fallback. Streaming-specific anti-flicker behavior must not suppress loading feedback for independent manual/non-streaming requests.

## Dedupe note

This is distinct from generic stale-request cancellation and from translation flicker mitigation. The durable idea is specifically about lifecycle ownership of a temporary loading sentinel and guaranteed restoration on failure.

## Cursor/backfill note

No Active-source cursor was moved backward. This was a bounded historical slice below the authoritative `PocketRisu/PocketRisu:develop` cursor `278251f85a19bfdfd4cf3faae780e62682878f9e`. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` was not advanced because this review does not establish complete coverage for every tracked source through a new date.

## Discovery note

A bounded discovery recheck included `rakey0/PocketRisu`, `myoun/PocketRisu`, `rhplus0831/risuai-fastify`, and `kangjoseph90/RisuAI`. `rakey0/PocketRisu` remains only one post-upstream Traditional-Chinese i18n commit ahead (`dd7edb1348e2e9bdd6150e0de8a4e940ebe6be0f`), which is not yet enough maintained behavioral divergence to justify Active-source promotion. No new source was promoted.
