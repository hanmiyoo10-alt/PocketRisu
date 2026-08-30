# Historical review — stable last-active character restore

- Source: `PocketRisu/PocketRisu`
- Commit: `000dd8baf383200ecb180490d2c063ebdd11c004`
- Commit date: 2026-08-14
- Review date: 2026-08-31
- Feature-ID: `STABLE-LAST-ACTIVE-CHARACTER-RESTORE`

## Finding

PocketRisu introduced last-active-character restoration using the character's stable `chaId`, not an array index. Boot still begins from the canonical deselected state (`selectedCharID = -1`), resolves the stored stable id against the current database, then restores through `changeChar()` so existing hydration, toggle loading, and chat-selection initialization remain authoritative. Explicit deselection removes the restore token as well as clearing the selected character.

The current personal fork `hanmiyoo10-alt/PocketRisu:develop` still preserves these boundaries in `src/ts/bootstrap.ts` and `src/ts/characters.ts`.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle: `ADOPTED`

## Source evidence

- `PocketRisu/PocketRisu@000dd8baf383200ecb180490d2c063ebdd11c004`
  - records `risu-last-active-character` as `chaId` after canonical successful selection;
  - clears the token from the canonical deselection helper;
  - resolves the stored id against the current character array during boot;
  - invokes `changeChar(restoreIndex)` rather than directly assigning reactive selection state;
  - treats localStorage and delayed boot restoration as best-effort and non-fatal.
- Current personal fork `develop` retains the same bootstrap and character-selection ownership boundary.

## Benefit

Restores the user's last active conversation after browser/WebView tab recreation without coupling persistence to mutable array positions or bypassing normal chat hydration/initialization behavior.

## Conflict / risk

- Persisting an array index would restore the wrong character after reorder/import/delete.
- Directly assigning `selectedCharID` at boot would bypass `changeChar()` side effects and can desynchronize lazy hydration/toggles/UI state.
- Explicit user deselection must remain authoritative; otherwise the app can reopen a character the user intentionally left.
- Restoration must remain best-effort and must never block boot.

## Validation need

Preserve regression coverage for: reorder/delete between sessions; stale/missing `chaId`; explicit deselect then reload; localStorage failure; restored placeholder/lazy chat hydration; and restoration only after the normal clean boot boundary.

## Follow-up

No implementation required: this is already adopted in the personal fork. Preserve it as an invariant whenever character identity, boot sequencing, chat hydration, or navigation ownership is refactored.

## Historical coverage

This bounded finding does not establish complete source coverage through 2026-08-14, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` must not be advanced from this review alone.
