# Historical backfill — PocketRisu-Alter programmatic scroll origin

Source: `PocketRisu-Alter/PocketRisu-Alter`
Reviewed evidence: `d4c8d17931a0b662be9746ce54c0d45921f02fdd`
Mode: bounded historical backfill; active forward cursor unchanged.

## Idea

### Programmatic chat scrolling must not impersonate user navigation

- **System impact:** `NO_SYSTEM_UPDATE`
- **Importance:** `MEDIUM`
- **Difficulty:** `LOW`
- **Size:** `XS`
- **Evidence:** `MEDIUM`
- **Risk:** `LOW`
- **Dependencies:** audit PocketRisu chat scroll owner(s), auto-follow path, and any floating scroll-navigation listener; reproduce before implementation
- **Priority:** `P1`
- **Lifecycle:** `DESIGN_NEEDED`
- **Source evidence:** `PocketRisu-Alter/PocketRisu-Alter@d4c8d17931a0b662be9746ce54c0d45921f02fdd`
- **Benefit:** prevents streaming auto-follow / anchor correction from repeatedly triggering UI intended only for deliberate user scrolling, reducing overlay flicker and useless timer churn during generation.
- **Conflict / risk:** a generic global `scroll` suppression can hide real user input or break pagination/bottom detection; origin must be scoped narrowly to the programmatic scroll operation and shared scroll owner.
- **Validation need:** reproduce a stream with auto-follow enabled and no user scroll; assert scroll-navigation UI is not raised by programmatic ticks, then assert wheel/touch/keyboard/user-driven scrolling still raises it. Verify history pagination and bottom detection remain active during programmatic scrolling.
- **Follow-up:** inspect current `hanmiyoo10-alt/PocketRisu` chat scroll ownership. If the same dual-listener coupling exists, implement one small origin/suppression boundary; otherwise retain as an invariant and mark `SUPERSEDED`/`ADOPTED` as appropriate.

## Evidence summary

The source commit documents two listeners sharing one chat scroll container: streaming auto-follow performs programmatic scrolling while another listener raises a floating scroll-navigation control on every scroll event. Because the second listener could not distinguish scroll origin, every streaming tick refreshed its visibility timer. The source fix marks only the bounded programmatic scroll window and lets the navigation listener ignore that origin while preserving the rest of its scroll work.

This is architecture evidence, not authority to copy a DOM `dataset` marker verbatim. PocketRisu should use the narrowest mechanism matching its current ownership model.

## Backfill coverage

This review does not establish initial-history completeness for `PocketRisu-Alter/PocketRisu-Alter`; `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
