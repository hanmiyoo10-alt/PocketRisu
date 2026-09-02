# Design draft — PLUGIN-V3-CBS-PARSER-ACTIVE-CONTEXT-BOUNDARY

## Problem / evidence

`kwaroran/Risuai` added a Plugin V3 `parseRisuChat` API in `c4cf5442606da6788239ad2cfc03273b6ee6857a`, then hardened it in `3470cc7762df91e988f1ba23ed0fae135408b286` before merge `754af0ba5d546db9a8cc0c2676ba4c2693f3f72d`. The initial API allowed a plugin to select arbitrary character/chat indexes while also optionally invoking the editprocess script pipeline and enabling variable writes. The hardening removed arbitrary character/chat selection, required the currently selected character and active chat, validates `messageIndex`, and documents that `processRegex` can invoke plugin/action handlers that mutate the active chat.

PocketRisu currently has no `parseRisuChat` Plugin V3 API, so this is evidence for a future parser capability boundary, not code to port automatically.

## Minimal safe scope

If PocketRisu ever exposes CBS parsing to Plugin V3, begin with a read-oriented API bound to the active selected character/chat and a validated existing message index. Do not expose arbitrary cross-chat context selection in the first slice. Do not enable side-effecting regex/action processing or variable writes by default.

## Ownership boundaries

- Core parser owns CBS semantics and trusted access to active chat state.
- Plugin runtime owns capability/permission checks and the public API contract.
- Plugin callers may supply text and bounded contextual hints, but must not gain implicit authority to target arbitrary chats or trigger mutation-capable pipelines.
- Side-effecting parser modes are separate capabilities from pure text parsing.

## Proposed mechanism

1. Resolve the active selected character and active chat inside core code; fail if either is absent.
2. Accept `messageIndex` only when it is an integer in `[-1, activeChat.message.length - 1]`.
3. Keep pure CBS parsing separate from any editprocess/action-script stage.
4. If mutation-capable options are ever exposed, gate them behind explicit Plugin V3 permissions/capabilities and document the side effects in types/API docs.
5. Avoid caller-provided arbitrary character/chat indexes until a separate cross-context capability is designed and justified.

## Compatibility / invariants

- No existing PocketRisu API changes are required while the feature is absent.
- Existing targeted V3 reload behavior remains unchanged.
- Parser behavior must use the same active-context semantics as first-party UI parsing.
- Invalid message indexes fail closed instead of silently selecting another context.
- Pure parsing must not mutate chat state.
- Enabling editprocess/action processing, variable writes, or any equivalent side effect must be explicit and permission-reviewed.

## Validation / acceptance

- Active character/chat required; missing context returns a bounded error.
- `messageIndex`: accept `-1` and valid integer indexes; reject fractional, NaN, below `-1`, and out-of-range values.
- Pure parse tests prove no chat/message/variable/plugin state mutation.
- If mutation-capable processing is later added, tests must prove capability denial, correct active-chat targeting, and no cross-chat mutation.
- Compare CBS output against first-party parser behavior for representative macros and roles.
- Fuzz/bound malformed option objects and parser inputs before exposing the API broadly.

## Risk / blast radius

High if implemented incorrectly: parser context and optional script processing can cross plugin/chat mutation boundaries. A pure active-context-only first slice has a much smaller blast radius, but the overall idea remains security-sensitive.

## Rollback / fallback

Keep the API absent or feature/capability-gated until validation is complete. If side effects cannot be reliably isolated, retain only pure parsing or remove the public entry point without changing stored data.

## Dependencies

- Explicit Plugin V3 permission/capability review for parser access.
- Separate review before exposing editprocess/action-script execution or variable writes.
- PocketRisu-specific parser tests and mutation audit.

## PR decomposition

1. Pure active-context parser adapter + type contract + index validation tests.
2. Optional capability declaration/permission UI, if required by PocketRisu's V3 model.
3. Only after separate security review: narrowly scoped mutation-capable processing, with dedicated tests.

## Readiness

Remain `DESIGN_NEEDED`. This is security-sensitive parser work and therefore not eligible for autonomous implementation under the standing gate.
