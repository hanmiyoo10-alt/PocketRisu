# RisuAI forward review — 2026-09-02 21:50 KST

Reviewed forward range: `kwaroran/Risuai` from authoritative cursor `9d31f8f48a4c7588070588b1e45ee246b950aa07` through `754af0ba5d546db9a8cc0c2676ba4c2693f3f72d` (3 commits in the compared range).

## PLUGIN-V3-CBS-PARSER-ACTIVE-CONTEXT-BOUNDARY

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: explicit Plugin V3 permission/capability review; PocketRisu parser mutation audit and tests; separate security review before exposing editprocess/action-script execution or variable writes
- Priority: `P2`
- Lifecycle status: `DESIGN_NEEDED`
- Source evidence: `kwaroran/Risuai@c4cf5442606da6788239ad2cfc03273b6ee6857a` introduced a Plugin V3 CBS parser API; `3470cc7762df91e988f1ba23ed0fae135408b286` narrowed it to the selected character + active chat, validates `messageIndex`, and documents that editprocess can invoke plugin/action handlers and mutate the active chat; merged as `754af0ba5d546db9a8cc0c2676ba4c2693f3f72d`.
- Benefit: if PocketRisu later exposes CBS parsing to plugins, active-context scoping and fail-closed index validation reduce accidental cross-chat authority while letting plugins reuse first-party parsing semantics.
- Conflict/risk: parser and script-processing surfaces are security-sensitive; `processRegex`, action scripts, plugin handlers, or variable writes can turn a seemingly read-only parser API into a mutation capability. PocketRisu currently does not expose `parseRisuChat`, so adding it would create new attack/compatibility surface.
- Validation need: prove active-context-only resolution, reject invalid/fractional/out-of-range message indexes, verify pure parsing cannot mutate chat/plugin/variable state, and separately permission-test any future side-effecting mode.
- Follow-up: assistant-owned design draft at `notes/design-drafts/plugin-v3-cbs-parser-active-context-boundary.md`; remain design-only under the standing security-sensitive parser gate.

### Deduplication

This complements the existing Plugin V3 capability/permission-gating idea rather than replacing it. That older item establishes the general strong-API permission principle; this item records the parser-specific active-context, message-index, and side-effect boundary needed if a CBS parser capability is ever added.

### Autonomous progression

Forward commits were inspected, the idea was classified, and an assistant-owned design draft was created. No feature branch, code change, test run, or personal-fork PR was created because this is security-sensitive parser work and PocketRisu currently lacks the API.
