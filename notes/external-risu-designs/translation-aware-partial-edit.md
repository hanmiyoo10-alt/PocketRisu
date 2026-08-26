# Translation-aware partial edit

Status: `DESIGN_NEEDED`

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: reproduce translated-view partial edit on current PocketRisu `develop`; confirm cache-key behavior for LLM translation and define behavior for non-cache-backed translators.
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`

## Source evidence

- `kwaroran/Risuai` merge commit `e565563a288ebe4c65b6099a1645ba477d1c84b4` (PR #1521).
- PocketRisu `develop` at `b95d0fa72ce41c61e4ea8d42303499c72a6ba315` still gives `PartialEditController` the original `message` as `messageData` and dispatches every partial-edit save back into the original chat message, while translated rendering is separately backed by the LLM translation cache.

## Problem / benefit

When the visible chat body is a translated representation, block/drag partial edit can match against the visible translated DOM while its editable source is still the original message. A save can therefore fail matching, edit the wrong representation, or overwrite original source text when the user's intent was to edit only the translated cached view. A representation-aware edit target would preserve source-message integrity and make translated partial editing predictable.

## Minimal safe scope

Support partial edit of translated messages only when the current translated view has a stable cache-backed source. The controller receives an explicit edit target/context instead of inferring ownership from rendered DOM. Original-message editing remains byte-for-byte behavior-compatible when translation is not active.

## Ownership boundaries

- `Chat.svelte`: owns whether the rendered body is original or translated and resolves translation cache identity.
- `PartialEditController.svelte`: owns range matching/edit UI against an explicitly supplied source representation, not persistence.
- Translation cache API: owns translated cached data persistence.
- Chat DB message: remains authoritative original text and is mutated only for `target=original`.

## Proposed mechanism

1. Add an explicit partial-edit target: `original | translation`.
2. For translated LLM-cache views, asynchronously resolve `{ key, data }` before matching and use `data` as the source string.
3. Carry the resolved target/key through the edit transaction and dispatch it with the replacement result.
4. On save, route `original` to the existing DB message path and `translation` only to `setLLMCache(key, newData)`.
5. Use a request-generation token or equivalent cancellation guard so rapid view/edit changes cannot commit a stale async translation context.
6. Disable or serialize conflicting original-edit / translation-edit / translation-toggle controls while a translated partial-edit context is loading or active.

## Compatibility / invariants

- Partial editing the original view must preserve current message + active-swipe update behavior in PocketRisu.
- Translation-only edits must never modify original `message.data` or swipe source text.
- Missing/changed translation cache keys fail closed: no save to either representation.
- Switching translation state, chat, character, or message while async context loads must not apply a stale completion.
- No DB flush policy changes; `flushServerDbKeepalive()` remains untouched.
- No plugin reload, storage, server-phone, runtime, or service-manager changes.

## Validation / acceptance criteria

- Reproduce current behavior first with an LLM-translated message and block + drag partial editing.
- Original view: partial edit/delete updates original DB text and active swipe exactly as today.
- Translated view: edit/delete updates only the translation cache; toggling back to original shows unchanged source text.
- Toggle translation during context resolution: stale request cannot overwrite the newer view.
- Cache miss/key failure: edit refuses safely and original data remains unchanged.
- Rapid repeated edits and chat/character switching: no stale cross-message save.
- Non-LLM/non-cache-backed translation modes either remain disabled for translated partial edit or get a separately proven persistence contract.

## Risk / blast radius

Contained to chat editing and translation cache ownership, but an incorrect target can mutate user-authored source text. Keep target explicit, fail closed on ambiguous cache identity, and avoid copying the source commit's broader UI refactor unless needed by tests.

## Rollback / fallback

Remove/disable translated-view partial editing and retain existing original partial-edit behavior. No migration or persistent format change is required; translation cache entries remain ordinary derived cache data.

## PR decomposition

1. Reproduction/regression tests for representation ownership.
2. Explicit partial-edit target/context contract with stale-request guard.
3. Translation-cache save routing + rerender refresh.
4. Optional control-state polish only if required to make races impossible.
