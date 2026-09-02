# Historical backfill review — plugin update preserves compatible user state

Date: 2026-09-02
Source: `PocketRisu/PocketRisu:develop`
Primary commit: `c81938a487887953cdbd3b82a84178fee3edbbf3`
Review follow-up: `89fc53db9383e46d43ad3662b750341630a8ff35`

## Finding

Plugin update/reinstall rebuilt `realArg` from new-code defaults, which discarded user-owned values such as presets/API keys. Automatic update also re-enabled plugins the user had disabled. The adopted fix carries forward values only for keys still declared by the new plugin with a compatible argument type, and preserves the previous enabled state for automatic updates.

The review follow-up is important evidence: option-list argument declarations are arrays, so reference identity is not a valid compatibility test. Equivalent option-list declarations must compare by content/order; otherwise compatible user state is still silently reset on every update.

## Durable invariant

**PLUGIN-UPDATE-PRESERVES-COMPATIBLE-USER-STATE**

An update/reinstall may replace plugin-owned code/defaults, but it must not silently seize ownership of user-owned runtime configuration. Preserve a prior argument value only when the new plugin still declares the key under the same effective argument schema; new or retyped keys use the new default. An automatic update must preserve the user's disabled/enabled choice.

Schema compatibility must be semantic for structured declarations (for current string-array option lists: same values in the same order), not object/reference identity.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu` `c81938a487887953cdbd3b82a84178fee3edbbf3`, strengthened by review follow-up `89fc53db9383e46d43ad3662b750341630a8ff35`
- benefit: prevents plugin updates from erasing compatible user presets/API-key-like argument values or unexpectedly re-enabling disabled plugins
- conflict/risk: carrying values across genuinely changed schemas can preserve invalid state; compatibility therefore must remain narrow and explicit
- validation need: regression coverage for scalar-compatible keys, option-list declarations reconstructed with equal content, retyped/new/removed keys, and automatic-update preservation of disabled state
- follow-up: preserve this ownership boundary in future plugin manager/update refactors; if richer argument schemas are introduced, extend the compatibility predicate deliberately instead of broad deep-equality guessing

## Dedupe notes

This is distinct from targeted V3 reload and “persist plugin updates before reload”: those govern persistence/reload ordering. It is also distinct from plugin-storage read/write invariants: this item owns migration of **plugin entry user configuration across code replacement**.

## Progression decision

No autonomous production implementation is needed: the invariant is already adopted in official PocketRisu and the follow-up corrected the structured-type comparison. Record as `ADOPTED`; do not create a feature branch or personal-fork PR for already-landed code.

## Backfill coverage

This is one bounded historical slice. It does not establish complete chronological coverage for all active/tracked sources, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
