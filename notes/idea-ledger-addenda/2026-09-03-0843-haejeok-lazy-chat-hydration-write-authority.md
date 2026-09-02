# Lazy chat hydration must not grant incomplete summaries write authority

Feature-ID: `LAZY-CHAT-HYDRATION-WRITE-AUTHORITY`

## Classification

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `MEDIUM`
- `Size`: `S`
- `Evidence`: `MEDIUM`
- `Risk`: `MEDIUM`
- `Dependencies`: `PocketRisu must first have an owned lazy chat-summary/detail hydration boundary with explicit dirty/write authority`
- `Priority`: `P1`
- lifecycle status: `HOLD`

## Source evidence

- `nevaeh5379/HaejeokRisuai@893bada0f4475e5b4ebe5cb7b77a76441e763f5e` — `Preserve chat variables during lazy hydration`.
- Merged at `nevaeh5379/HaejeokRisuai@d7a508692fd770c0377022a877d29ea3902c1f15`.
- Source adds E2E and unit regressions showing that reading an undefined variable during async chat hydration must not initialize empty `scriptstate`, an incomplete summary must not erase already-loaded variables, and a genuine variable write during hydration must survive once authoritative chat detail arrives.

## Benefit

Protects chat-local variables and other detail-only fields from being silently overwritten by sparse/lazy summaries during asynchronous hydration. More generally: a partial representation may be useful for display/navigation but does not automatically own persistence authority for fields it has not loaded.

## Conflict / risk

HaejeokRisuai has a distinct domain-store/lazy-chat architecture. PocketRisu does not currently expose the same `ensureChatMessages` ownership boundary on its reviewed branch, so copying the source implementation would be architecture cargo-culting. Any future lazy chat implementation must also define how real writes made during hydration are rebased/merged rather than dropped.

## Validation need

If PocketRisu later introduces or expands lazy chat hydration, require tests for: (1) read-only access before hydration causes no dirty state; (2) sparse summaries cannot clear authoritative detail-only fields; (3) real writes during hydration survive; (4) hydration completion cannot overwrite newer local edits; (5) failed/cancelled hydration leaves persistence state coherent; (6) rapid chat switching cannot let stale hydration publish into the newly active chat.

## Follow-up

`HOLD` until PocketRisu has a concrete lazy summary/detail boundary to own this invariant. When that subsystem exists, promote to `DESIGN_NEEDED` and define revision/dirty-field merge authority before implementation. Deduplicate with long-chat paging/lazy-hydration ideas, but preserve this separate write-authority lesson because it is a demonstrated data-integrity failure mode.
