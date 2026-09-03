# PLUGIN-UPDATE-PRESERVES-USER-STATE

- System impact: NO_SYSTEM_UPDATE
- Importance: HIGH
- Difficulty: LOW
- Size: XS
- Evidence: HIGH
- Risk: MEDIUM
- Dependencies: NONE
- Priority: P0
- lifecycle status: ADOPTED
- source evidence: `PocketRisu/PocketRisu@c81938a487887953cdbd3b82a84178fee3edbbf3` preserves existing plugin argument values for keys still declared with the same type and preserves disabled state on automatic update. `PocketRisu/PocketRisu@89fc53db9383e46d43ad3662b750341630a8ff35` fixes option-list (`string[]`) type equivalence to compare declaration contents rather than array identity. The reviewed durable tip `ca09a80746e74e5334145e5e78af47ce423e0eba` retains both boundaries in `src/ts/plugins/plugins.svelte.ts`.
- benefit: Plugin-managed presets/API keys and explicit user enable/disable choices survive normal updates instead of being silently reset to new defaults. Structural comparison for option-list declarations prevents logically unchanged list arguments from being treated as a type change merely because a manager rebuilt the array.
- conflict/risk: Over-preserving values across a real argument-contract change can retain incompatible or stale settings. Preservation therefore remains limited to keys still declared by the new plugin with the same declaration type; new, removed, or retyped keys must follow the new plugin defaults. Automatic-update preservation of `enabled` must not turn manual reinstall/hot-reload behavior into a hidden policy change.
- validation need: Verify scalar argument value survives same-type update; option-list value survives when the new declaration has the same ordered options but a distinct array object; changed option list or changed scalar type falls back to the new default; newly introduced keys use defaults; removed keys do not leak; automatic update preserves a disabled plugin; unrelated plugin-owned/update metadata behavior remains unchanged.
- follow-up: Preserve this invariant whenever plugin import/update/reinstall code is refactored. If the plugin argument schema grows beyond `'int' | 'string' | string[]`, extend semantic type-equivalence deliberately with tests rather than falling back to object identity or broad value coercion.

## Dedupe / history

This is one canonical invariant covering the original state-preservation fix and its immediate option-list comparison correction. The V2 preload-alert changes bundled into `89fc53db...` belong to the separate V2 storage-preload safety boundary and are not part of this Feature-ID.

No autonomous implementation was opened: the behavior is already ADOPTED in PocketRisu and current reviewed code confirms the invariant. No active-source forward cursor moved during this historical normalization pass.
