# Backfill review — prompt-block role schema compatibility

Reviewed historical PocketRisu sequence:

- `PocketRisu/PocketRisu@f8fb60fb52e815347f57ebeeaa421fc3f8fee076` — introduced optional role selection for prompt blocks and lorebook entries.
- `PocketRisu/PocketRisu@e79789f9a0ccdca9316b2f0cb514a9f222a36e85` — reverted lorebook role selection/defaulting.
- `PocketRisu/PocketRisu@ee98b43d8b0b848e6a6b19564d28674528078ef1` — preserved prompt-block backward compatibility by moving the new block-role field from the pre-existing `role` name to `role2`.

## Durable idea

Feature-ID: `PROMPT-BLOCK-ROLE-SCHEMA-COMPATIBILITY`

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu@f8fb60fb52e815347f57ebeeaa421fc3f8fee076`, `e79789f9a0ccdca9316b2f0cb514a9f222a36e85`, `ee98b43d8b0b848e6a6b19564d28674528078ef1`; upstream attribution in those commits points to `kwaroran/Risuai` changes `72497fef`, `55661a4e`, and `2dfab9d3`.
- benefit: lets new prompt-role behavior coexist with old saved prompt data without silently changing the meaning of an already-established serialized field.
- conflict/risk: reusing an existing persisted key for a new semantic purpose can reinterpret legacy saves, alter prompt construction, or make migration behavior depend on load order/default normalization. A cosmetic UI default is not sufficient evidence that serialized semantics are compatible.
- validation need: load representative legacy prompt templates with the old `role` semantics, assert their generated prompt roles are unchanged; create new templates using the new block-role field and assert the override applies only to supported block types; round-trip save/load both forms; verify absence/invalid new-field values preserve legacy behavior.
- follow-up: preserve this as a schema-evolution invariant. When adding a serialized field, first prove the key is semantically unused for that object family; otherwise use a distinct key or an explicit versioned migration. Do not delete this historical sequence even if a future schema renames `role2`; preserve the reason.

## Why it matters

The initial feature explicitly attempted load-time normalization, but the subsequent compatibility patch still had to move the new property from `role` to `role2`. That sequence is strong evidence that "same type-looking field name" did not imply the same persisted meaning. For PocketRisu, serialized schema changes should therefore be treated as semantic compatibility changes, not merely TypeScript/interface edits.

## Guardrail compatibility

This is an already-adopted application-level schema invariant. It does not change DB flushing, `flushServerDbKeepalive()`, save-integrity optimizations, V3 plugin reload, runit, Android notifications, device packages, or runtime/service management.

## Progression result

No autonomous production implementation was started because the compatibility fix is already present in current PocketRisu history and remains visible in current source (`role2`). No feature branch, tests, or personal PR were needed for this adopted invariant.

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` was not advanced: this was a bounded historical slice, not proof of complete coverage for every tracked source through 2026-07-29.

Bounded new-repository discovery was attempted, but the GitHub integration rejected the repository-search endpoint. This is an integration/discovery limitation only; it is not a code or CI failure.
