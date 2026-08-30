# Historical backfill — wire-model observability identity

- Reviewed: 2026-08-30
- Source: `PocketRisu/PocketRisu:develop`
- Historical commit: `764c62c903f0cc2d4d276dba2a3ec228733664e4`
- Forward cursor at review time: `615b79df3375bf9db2924a8003f61a747721c725`
- Cursor action: unchanged; historical evidence must not move the cursor backward.

## Finding

PocketRisu changed model-request observability so logs and generation result metadata record the actual resolved wire model id rather than a mutable preset display name or an incomplete profile snapshot field. `resolveWireModelId()` is used before request dispatch, with a best-effort identifying fallback only for broken configurations that are expected to fail anyway.

This matters because presets can be renamed or edited after a request, and some profiles store the actual model choice in user values instead of `profileSnapshot.modelId`. Recording the resolved transport identity at request time keeps request logs, generation metadata, and failure diagnostics tied to what was actually sent.

## Deduplication

No existing durable idea entry was found for wire-model/request-observability identity. This is separate from request-status generation identity: one identifies the request execution instance; this invariant identifies the model value actually used on the wire.

## Classification

- Feature-ID: `WIRE-MODEL-OBSERVABILITY-IDENTITY`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle status: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu@764c62c903f0cc2d4d276dba2a3ec228733664e4`; current personal-fork `develop` still resolves and logs `wireModel` before dispatch.
- Benefit: accurate post-hoc request/generation diagnosis even when presets are renamed, edited, or use user-supplied model ids.
- Conflict/risk: model identifiers can be user-controlled and may be sensitive in some deployments; diagnostics should not expand logging to credentials, prompt bodies, or unrelated secrets. Resolution failures must not hide a failed request row.
- Validation need: preserve a regression test where preset name differs from resolved model id and another where the model id comes from user values; assert logs/result metadata use the resolved id and broken configuration still produces an identifying failure record.
- Follow-up: preserve this invariant during request/preset refactors. No new implementation branch is warranted because the behavior is already present.

## Guardrail check

No DB flush/save-path, plugin reload, service manager, Android notification, runtime, package, storage migration, or security-sensitive parser behavior is involved.