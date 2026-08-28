# Historical review: PocketRisu-Kei token-count async isolation

- Reviewed at: 2026-08-29 08:35 KST
- Source: `seto-sama/PocketRisu-Kei`
- Source commit: `ae05122d6f7423a285e74d1e07fe245ac1847236` (`feat(ui): unify CBS-aware token counts`)
- Forward cursor: unchanged (`3b55f692c02c04082b087547b0114506a5373681`); this is bounded historical backfill.

## Meaningful idea

`EDITOR-ASYNC-TOKEN-COUNT-ISOLATION`

The source replaces several field-specific token-count effects with a shared `TokenCount` component. The transferable part is not the UI label itself but the ownership/correctness contract around an expensive asynchronous tokenizer:

- debounce tokenization off the keystroke path;
- increment a generation/sequence immediately when the source value changes;
- apply an async result only when its generation is still current;
- cancel pending timers during effect cleanup;
- reuse one implementation across character, chat-note, persona, greeting, and lorebook editors so correctness rules do not drift;
- avoid evaluating token counts for UI that is not rendered/needed (the preceding per-lorebook implementation explicitly guarded closed entries; any shared component must preserve equivalent visibility/ownership behavior where mounting differs).

Source evidence: `ae05122d6f7423a285e74d1e07fe245ac1847236` centralizes token-count rendering and uses a 400 ms debounce plus sequence invalidation around `tokenizeAccurate`, which performs CBS expansion before encoding.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: confirm PocketRisu-owned editor token-count surfaces and whether expensive tokenization/CBS expansion is reachable on keystroke; preserve visibility/lazy-mount behavior for large lorebooks
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`

## Benefit

Reduces editor jank and duplicated reactive work while preventing stale asynchronous token-count results from overwriting newer input state. A shared owner also makes it easier to keep token-count semantics consistent across editors.

## Conflict / risk

A naive shared component can accidentally increase work if it mounts for every closed lorebook entry or otherwise broadens the reactive surface. Token counts are advisory UI; they must never block editing or mutate persisted content.

## Validation need

Before promotion to `READY_TO_PORT`:

1. identify concrete PocketRisu token-count owners on the intended base branch;
2. measure or reproduce tokenization cost during rapid typing, especially with CBS-expanding content;
3. prove stale async completion cannot replace a newer value;
4. prove hidden/closed bulk editors do not tokenize merely because their data changed;
5. verify cleanup prevents delayed work after component destruction/navigation.

## Follow-up

Assistant-owned design boundary: `products/pocketrisu-helper-mod/docs/features/ui/async-token-count-isolation/DESIGN.md` in `hanmiyoo10-alt/-`.

No implementation branch or PR was created: the PocketRisu owner/dependency is not yet resolved, so execution gates are not satisfied.
