# Historical review — legacy custom flags settings restoration

Source: `PocketRisu/PocketRisu:develop`
Commit: `d7daf1754c63f39c8b02f2fb93a899332aeefabb` (2026-08-28)

## Finding

A settings/UI refactor had removed the existing custom model-capability flag controls from the Chat Bot menu. The adopted fix restores the control surface for `enableCustomFlags` and the individual `LLMFlags`, while explicitly scoping them to legacy models and explaining that Model Presets derive capabilities from their model profile.

This is worth preserving as a compatibility invariant rather than as a port candidate: when settings are reorganized or modern preset/profile flows are introduced, legacy/manual capability overrides that remain part of the supported data model must not silently become unreachable. UI visibility and semantic ownership need to stay aligned with the persisted feature surface.

## Classification

- Feature-ID: `LEGACY-CUSTOM-FLAGS-CONTROL-SURVIVES-UI-REFACTOR`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu@d7daf1754c63f39c8b02f2fb93a899332aeefabb`; patch restores the controls in `BotSettings.svelte` and adds explicit legacy-vs-preset scope copy.
- benefit: prevents supported legacy/manual model capability settings from becoming effectively read-only/unreachable after UI restructuring; reduces confusing behavior drift between persisted state and available controls.
- conflict/risk: capability flags can misrepresent provider/model support, so this invariant is only about preserving an intentionally supported manual override surface; it must not leak into Model Preset ownership or override profile-derived capabilities.
- validation need: settings regression test or component-level check that a legacy-model path exposes `enableCustomFlags` and flag toggles, toggles persist to `DBState.db.customFlags`, and Model Preset flows do not consume this manual override path.
- follow-up: preserve as an adopted regression invariant when reorganizing Bot Settings or capability/profile code; no autonomous implementation needed because official PocketRisu already contains the fix.

## Guardrail check

No DB flush, keepalive, save-integrity, plugin reload, service manager, Android notification, storage migration, or security-sensitive parser behavior is touched by this lesson.

## Historical coverage

This is a bounded historical slice only. It does not establish complete tracked-source coverage through 2026-08-28, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` must not advance from this review alone.
