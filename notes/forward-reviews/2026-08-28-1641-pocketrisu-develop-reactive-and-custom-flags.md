# Forward review — PocketRisu develop — 2026-08-28 16:41 KST

Source: `PocketRisu/PocketRisu:develop`
Previous authoritative cursor: `f04547eccb2bb51fbc2f5eaa7de3280654599e6c`
Reviewed HEAD: `a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9`
Range status: 2 commits ahead, no divergence behind.

## 1. Reactive derived-section write boundary

Source commit: `a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9` (`fix: defer translating state write out of the derived sync section`).

PocketRisu's translation render path was writing bound state (`translating = true`) while still executing inside a Svelte `$derived` synchronous section, which can trigger `state_unsafe_mutation`. The fix inserts an async boundary before the state write so derived evaluation stays read-only and the side effect occurs afterward.

Classification:
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `ADOPTED`
- Source evidence: official PocketRisu commit `a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9`, 2-line focused fix in `src/lib/ChatScreens/ChatBody.svelte`.
- Benefit: prevents a framework-level reactive-state correctness failure in the translated-message render path while preserving existing translation behavior.
- Conflict/risk: introducing an async boundary can expose stale-selection ordering if nearby state ownership is already weak; do not generalize into arbitrary `Promise.resolve()` sprinkling.
- Validation need: translated/untranslated messages, loading placeholder on/off, translation failure/cancel, rapid chat/message switch, and confirmation that stale async completion cannot overwrite a newer rendered message.
- Follow-up: preserve as an invariant whenever translation/render derived ownership is refactored. No autonomous personal-fork PR is opened because the fix is already adopted in the official PocketRisu source and this watch loop does not auto-cherry-pick upstream commits.

Invariant: synchronous derived computation must remain read-only with respect to bound/runtime state; side effects must occur after leaving the derived section and still obey stale-result ownership.

## 2. Restore supported legacy custom-flag controls

Source commit: `d7daf1754c63f39c8b02f2fb93a899332aeefabb` (`fix: restore custom flags settings in the chat bot menu`).

The settings surface restored controls for an already-supported `DBState.db.customFlags` / `enableCustomFlags` capability and explicitly scoped them to legacy models, while model presets continue to derive capabilities from model profiles.

Classification:
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle: `ADOPTED`
- Source evidence: official PocketRisu commit `d7daf1754c63f39c8b02f2fb93a899332aeefabb`, restoring the UI plus English/Korean scope warning.
- Benefit: avoids a supported compatibility override becoming unreachable after settings-menu changes, especially for custom/legacy model capability quirks.
- Conflict/risk: users could misunderstand flags as overriding model-preset capability profiles; the restored UI explicitly warns that the controls are legacy-model-only.
- Validation need: enable/disable persistence, each flag toggle, legacy-model request capability behavior, and confirmation that model presets remain profile-driven and unaffected.
- Follow-up: preserve the ownership rule that removing/reorganizing a settings UI must not silently orphan still-supported persisted capability state; if the state is intentionally retired, migrate/deprecate it explicitly instead.

## Cursor / guardrail result

Advance only the official PocketRisu forward cursor to `a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9`. All other active source HEADs reviewed in this run were unchanged from their durable cursors. No `HISTORICAL_BACKFILL_COMPLETE_THROUGH` change is justified by this forward-only review.

PocketRisu guardrails checked: no forced DB flush, no keepalive behavior change, no save/integrity replacement, no V3 plugin reload change, no PM2/runit change, and no Android server-phone notification behavior involved.
