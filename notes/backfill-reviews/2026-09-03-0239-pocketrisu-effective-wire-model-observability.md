# Historical backfill review — effective wire model identity in observability

- Reviewed source: `PocketRisu/PocketRisu:develop`
- Source commit: `764c62c903f0cc2d4d276dba2a3ec228733664e4`
- Current develop checked: `278251f85a19bfdfd4cf3faae780e62682878f9e`
- Review date: 2026-09-03

## Finding

`requestModelPreset()` resolves the effective provider-facing model id once with `resolveWireModelId(preset)` and reuses that identity in request logs, generation/job metadata, preview results, streaming/non-streaming results, tool-loop results, and failures. The historical fix specifically documents why `preset.name` and `profileSnapshot.modelId` are not sufficient: a preset name is not the wire identity, and user-defined model ids may live in `userValues.modelId`.

This is a durable observability/correctness invariant: diagnostics and persisted generation metadata should describe the model that was actually selected for the provider request, not a mutable display label or an incomplete default field.

## Classification

- Feature-ID: `REQUEST-OBSERVABILITY-USES-EFFECTIVE-WIRE-MODEL-ID`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu` commit `764c62c903f0cc2d4d276dba2a3ec228733664e4`; invariant still present on develop `278251f85a19bfdfd4cf3faae780e62682878f9e`
- benefit: request logs and generation metadata stay attributable to the actual provider-facing model even for user-valued ids, renamed/edited presets, preview/tool/streaming/failure paths
- conflict/risk: a broken preset may make model resolution throw; observability must keep a non-secret identifying fallback without changing request semantics. Do not accidentally log credentials while expanding diagnostics.
- validation need: cover user-valued model ids, renamed presets, preview, tool-loop, streaming/non-streaming, failure, and malformed-config fallback; assert every surface reports the same effective wire model identity
- follow-up: preserve the single-resolution/reuse invariant whenever preset adapters, request logging, generation metadata, or model routing are refactored

## Dedupe boundary

This is not the same as provider capability selection or preset source-of-truth ownership. It is specifically the observability identity after routing/model resolution has selected the effective wire model.
