# PocketRisu-Alter historical backfill — streaming markdown reparse

Date: 2026-08-27
Source: `PocketRisu-Alter/PocketRisu-Alter`
Forward cursor: `128482ce9984a30ecb68834d561169846d068295` (unchanged)

## Evidence

Primary historical commit:

- `36a7c3b5b36f328d370ade8a9969c5bfdfe1e937` — `fix(chat): stop all messages re-parsing markdown on every streaming tick`

Alter's old `Chats.svelte` rebuilt `createSimpleCharacter(currentCharacter)` and copied the fresh object reference into every mounted message's reactive props on each `updateChatBody()` run. Because message markdown derivation depended on `character`, streaming ticks could force all visible messages to re-parse markdown. The fix memoized the simple-character snapshot by structural equality so the reference changed only when character content changed.

## PocketRisu current-state audit

Current `hanmiyoo10-alt/PocketRisu:main` still computes a `simpleChar` during `updateChatBody()`, but its mounted-message ownership is materially different from the historical Alter code:

- existing hashed message instances are not bulk-updated with a fresh `character` prop on every streaming tick;
- the existing-instance path calls only `updateStreamingDisplay(...)` for streaming display state/text;
- unchanged historical messages therefore do not receive a fresh character-object reference through this path;
- current streaming optimization also excludes active streaming message text from the hash when optimized streaming is enabled, avoiding whole-message remounts for token ticks.

Therefore the original causal chain fixed by `36a7c3b5...` is not present in current PocketRisu in the same form.

## Classification

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `XS`
- `Evidence`: `HIGH`
- `Risk`: `LOW`
- `Dependencies`: `NONE`
- `Priority`: `P0`
- lifecycle status: `SUPERSEDED`
- source evidence: `PocketRisu-Alter/PocketRisu-Alter` `36a7c3b5b36f328d370ade8a9969c5bfdfe1e937`
- benefit: preserves a concrete performance invariant — unrelated streaming ticks must not invalidate every visible message's markdown parse dependencies.
- conflict/risk: blindly importing the old memoization patch would add complexity to a code path whose prop-update ownership has already changed; it could optimize a mechanism that no longer causes the original bug.
- validation need: if streaming heat/flicker regresses, instrument markdown parse counts and confirm which reactive identity actually changes before modifying code.
- follow-up: preserve as a regression lesson; no feature branch, dossier, or source PR is warranted unless a fresh PocketRisu reproduction proves a current equivalent.

## Historical coverage

This pass continued bounded `PocketRisu-Alter` history inspection beyond the previously reviewed June security interval and inspected additional pages reaching at least 2026-05-24. This is **not** a claim that the repository has been exhaustively reviewed to its initial commit. Do not advance the global `HISTORICAL_BACKFILL_COMPLETE_THROUGH` marker from this evidence alone.
