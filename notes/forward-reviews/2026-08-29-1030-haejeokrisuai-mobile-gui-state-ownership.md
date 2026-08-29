# Forward review — HaejeokRisuai mobile GUI state ownership

Reviewed source: `nevaeh5379/HaejeokRisuai:main`

Cursor range: `d7796eb4960b54faa8b1fd8e1a77fa3b885e6377..2a952c4dde32bb1e8f33b610f545737ed6e1b683` (11 commits)

## Meaningful evidence

- `ed95732bf97ea8a0b5a4bc7a7b6e3939df42604e` centralizes mobile-GUI activation in `syncMobileGUI`, recomputes it on runtime setting and viewport changes, and makes mobile gesture initialization idempotent so repeated activation cannot install duplicate document listeners.
- `2a952c4dde32bb1e8f33b610f545737ed6e1b683` routes settings navigation through the mobile-specific navigation owner whenever MobileGUI is active instead of opening desktop settings state from mobile surfaces.
- The remaining commits in the range are protocol validator refactors/build plumbing or formatting and do not create a distinct PocketRisu transfer candidate in this review.

## Deduplicated idea

Feature-ID: `UI-MODE-ACTIVATION-OWNERSHIP`

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: matching PocketRisu-owned runtime UI-mode/gesture owner and a demonstrated duplicate-listener or stale-routing path
- Priority: `P1`
- Lifecycle status: `HOLD`
- Source evidence: `nevaeh5379/HaejeokRisuai` `ed95732bf97ea8a0b5a4bc7a7b6e3939df42604e`, `2a952c4dde32bb1e8f33b610f545737ed6e1b683`
- Benefit: prevents stale responsive-mode state, duplicate global gesture listeners, and desktop/mobile navigation divergence when UI mode changes after startup.
- Conflict/risk: PocketRisu currently does not expose the same `MobileGUI`/`initMobileGesture` owner names; blindly importing the source mechanism would create dead or divergent UI state.
- Validation need: first identify PocketRisu's actual responsive-mode owner; if present, reproduce repeated activation/resize/toggle and verify one listener installation, current-state routing, and reversible mode transitions.
- Follow-up: retain as an invariant and promote only if a concrete PocketRisu owner/hazard is found.

## Guardrail check

No storage/save behavior, DB flushing, plugin reload behavior, process manager, Android notification behavior, or system/runtime dependency is involved.

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged; this was a forward review.
