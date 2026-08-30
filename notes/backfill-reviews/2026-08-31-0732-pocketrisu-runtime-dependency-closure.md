# Historical backfill — runtime dependency closure drift guard

- Reviewed at: 2026-08-31 07:32 KST
- Source: `PocketRisu/PocketRisu:develop`
- Source commit: `01681eeb5995156b065b65c6c02741ced4a3553d`
- Historical-only review: active forward cursor is unchanged.

## Finding

PocketRisu's portable and Docker artifacts ship a prebuilt frontend, so installing the application's entire production dependency set into runtime artifacts is unnecessary and materially increases package size. The source commit derives the Node server's runtime dependency closure by walking static `require()`/`import()` edges from the server/updater entry points, pins the resulting direct dependencies against the canonical lockfile, commits the generated minimal manifest/lockfile, and makes CI regenerate/compare it. Any dynamic/non-literal dependency edge fails closed instead of silently producing an incomplete runtime package. Release assembly then smoke-boots the trimmed runtime and verifies an HTTP response before packaging.

The source reports `node_modules` shrinking from roughly 1 GB to roughly 39 MB while retaining a frozen transitive lock and assembled-runtime smoke test.

## Deduplication

No existing durable idea in the current ledger describes this exact invariant. It is distinct from host/system package changes and from the earlier `onnxruntime-node` CUDA-download suppression: the reusable idea is *derived runtime dependency closure + drift detection + assembled-artifact boot proof*, not a one-package exclusion.

## Classification

- Feature-ID: `RUNTIME-DEPENDENCY-CLOSURE-DRIFT-GUARD`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE` for the adopted official invariant; any backport to the lagging personal fork requires reconciling its older build/release graph first
- Priority: `P2`
- Lifecycle status: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu@01681eeb5995156b065b65c6c02741ced4a3553d`
- Benefit: materially smaller portable/Docker runtime payloads and explicit CI detection when server dependency edges drift
- Conflict/risk: incomplete dependency discovery can create packages that build successfully but fail only at runtime; dynamic imports and platform-specific/native dependencies require fail-closed treatment
- Validation need: regenerate-and-diff the minimal manifest, frozen-lock install, assembled portable/server smoke boot, and platform matrix coverage
- Follow-up: preserve the fail-closed dependency walker, canonical generated manifest/lockfile, and post-assembly smoke test when server entry points or packaging change; do not blindly backport the M-sized build-system change into the personal fork without a dedicated release-graph audit

## Guardrail check

No DB flush behavior, plugin reload semantics, service manager, Android notifications, storage migration, or device/system package migration is involved. This is retained as an adopted build/release invariant rather than an autonomous implementation candidate in this run.
