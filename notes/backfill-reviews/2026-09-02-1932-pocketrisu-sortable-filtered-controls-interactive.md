# PocketRisu historical review — sortable filtered controls remain interactive

Reviewed source: `PocketRisu/PocketRisu:develop`

Source commit: `dd07f4d10c3d11b5194f58246246ba04ef2903dd`

Current verification: `src/ts/util.ts` on current `develop` still sets `filter: '.no-sort'` together with `preventOnFilter: false` in the shared `sortableOptions` object.

## Finding

`SortableJS` uses `preventOnFilter` by default. In PocketRisu, `.no-sort` is not merely a drag-exclusion marker: it also contains plugin argument inputs and the plugin enable/disable toggle. Calling `preventDefault()` on pointer-down for those filtered controls blocked normal mouse focus and could cancel the synthetic click on iOS. The adopted fix keeps the region excluded from sorting while allowing the embedded controls to receive their normal interaction events.

The durable invariant is:

> A drag/filter exclusion marker may suppress sorting authority, but must not implicitly suppress the native interaction authority of controls inside the excluded region.

This is distinct from responsive-shell state, generic mobile touch handling, or plugin-state persistence. It is specifically an event-ownership boundary between SortableJS drag filtering and native form/control interaction.

## Classification

- Feature-ID: `SORTABLE-FILTERED-CONTROLS-REMAIN-INTERACTIVE`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- source evidence: official `PocketRisu/PocketRisu` commit `dd07f4d10c3d11b5194f58246246ba04ef2903dd`; current `develop` retains the fix.
- benefit: preserves keyboard/mouse/touch accessibility and plugin toggle/input usability inside drag-excluded UI regions, especially on iOS.
- conflict/risk: setting `preventOnFilter: false` means filtered children receive their normal default events; future sortable surfaces must still ensure their `filter`/`onMove` rules prevent an unintended drag start without globally cancelling control interaction.
- validation need: focused UI regression coverage for input focus, toggle activation, and no drag start from `.no-sort`; include at least pointer/mouse semantics and iOS/touch-click behavior where practical.
- follow-up: preserve this invariant whenever shared SortableJS options or plugin-card interaction surfaces are refactored. If a future surface genuinely needs event suppression, scope it to that surface instead of changing the shared contract.

## Progression

No implementation branch or PR was created because this behavior is already adopted in official PocketRisu and remains present on the current `develop` branch. This review records the invariant for future refactors and historical coverage only.

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged: this was a bounded single-commit slice and does not prove complete coverage for every tracked source through a date.
