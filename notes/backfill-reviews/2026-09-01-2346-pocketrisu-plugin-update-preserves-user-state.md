# Historical review — plugin updates preserve user-owned state

Source: `PocketRisu/PocketRisu:develop`
Reviewed commits: `c81938a487887953cdbd3b82a84178fee3edbbf3`, follow-up `89fc53db9383e46d43ad3662b750341630a8ff35`

## Finding

Plugin update/reinstall is a schema transition, not authority to reset user-owned runtime configuration. PocketRisu fixed an update path that rebuilt `realArg` from new plugin defaults and implicitly re-enabled an automatically updated plugin. The adopted behavior preserves existing argument values only for keys still declared by the new plugin with the same semantic argument type, preserves the prior enabled state for automatic updates, and lets new/retyped arguments take the new default.

The review follow-up is important: option-list argument declarations are `string[]`, so semantic type equality cannot use array object identity. Lists with equal ordered contents are the same declaration type; otherwise legitimate values would still reset on every plugin-manager rewrite/update.

## Durable invariant

- Updating code must not silently seize ownership of user-owned plugin settings.
- Preserve existing values only when the new plugin still declares that key with a compatible semantic type.
- New or retyped keys use new-code defaults; do not coerce stale values into a changed schema.
- Automatic update must preserve an explicit user-disabled state.
- Structured type descriptors use semantic/content equality where object identity is unstable.
- Keep PocketRisu targeted V3 reload behavior; this invariant does not justify full reload or broader plugin-state migration.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu` `c81938a487887953cdbd3b82a84178fee3edbbf3`; follow-up `89fc53db9383e46d43ad3662b750341630a8ff35`
- benefit: prevents plugin updates from destroying presets/API-key arguments or reversing a user's disabled-state choice while still accepting deliberate schema changes.
- conflict/risk: over-broad preservation can carry invalid values across a changed plugin schema; under-broad equality can reset valid structured option declarations.
- validation need: characterize unchanged scalar types, equal option-list declarations, reordered/changed option lists, added/removed/retyped keys, manual reinstall versus automatic update, and disabled-state persistence.
- follow-up: preserve this as a regression invariant when plugin import/update code or argument schema representation changes.

## Backfill coverage

This was a bounded historical slice only. It does not establish complete cross-source coverage and does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.