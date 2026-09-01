# Historical review — wire model observability

Reviewed source: `PocketRisu/PocketRisu:develop`

Source commit: `764c62c903f0cc2d4d276dba2a3ec228733664e4` (2026-08-15)

## Finding

The request path previously exposed a mixture of preset display name and `profileSnapshot.modelId` in logs / generation results. That is not always the identifier actually sent on the provider wire: profiles can source the effective model from user values, and preset names remain editable aliases.

The adopted fix resolves the actual wire model once through `resolveWireModelId(preset)` and reuses that identity consistently for request logging, generation metadata, preview/error/success/streaming results, with a diagnostic fallback only when resolution itself fails. This preserves a useful observability invariant: diagnostics for a model request should identify the effective provider-facing model, not a mutable UI alias or an incomplete pre-resolution field.

The same commit also repairs a stale settings deep-link after model-mode settings moved pages. That routing fix is useful but is not a separate idea here; it is ordinary route ownership maintenance and overlaps the existing settings/deep-link invariants.

## Classification

- Feature-ID: `REQUEST-WIRE-MODEL-OBSERVABILITY`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu@764c62c903f0cc2d4d276dba2a3ec228733664e4`; `src/ts/process/request/request.ts` centralizes `wireModel = resolveWireModelId(preset)` and carries it through request logs and result metadata.
- benefit: request diagnostics, generation metadata, and failure reports identify the model actually selected for the provider request, improving debugging and auditability when presets are renamed or model IDs are user-configured.
- conflict/risk: do not confuse resolved wire identity with secret credentials or log arbitrary request payloads; fallback identity is diagnostic-only when configuration is already broken.
- validation need: regression coverage should include a preset whose effective model comes from user values, a renamed preset, success/failure/preview/streaming paths, and a broken configuration fallback. Ensure no credential/token material is introduced into logs.
- follow-up: preserve the invariant when adapter/profile resolution changes; any new request surface should consume the same resolved effective model identity instead of re-deriving from display metadata.

## Progression decision

No implementation branch or PR is appropriate: the invariant is already adopted in official PocketRisu, has direct code-level evidence, is low-risk, and does not represent missing fork functionality. Record as durable design knowledge only.

## Historical coverage

This was a bounded single-commit historical slice. It does not establish complete coverage for any date interval and therefore does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.