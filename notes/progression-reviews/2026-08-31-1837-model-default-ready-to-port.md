# Progression review — MODEL-DEFAULT-DEPRECATION-WITH-LEGACY-RESOLUTION

Date: 2026-08-31

## Decision

Move `MODEL-DEFAULT-DEPRECATION-WITH-LEGACY-RESOLUTION` from `DESIGN_NEEDED` to `READY_TO_PORT` for one isolated OAI2 preset slice.

## Evidence

- Source pattern: `kwaroran/Risuai@ffabb06a386f1aee13217e5ca3c4268a35edb421` updates retired Claude IDs only in onboarding/preset default writers while deliberately retaining retired IDs in provider/model catalogs for existing-save resolution.
- PocketRisu `develop` current upstream base reviewed: `PocketRisu/PocketRisu@273e7c2fd541cd7df0d21f03e29892247c49e724`.
- PocketRisu `src/ts/process/templates/templates.ts` OAI2 preset still writes `claude-3-5-sonnet-20240620` into exactly these inspected default-writer fields: `aiModel`, `proxyRequestModel`, `customProxyRequestModel`.
- PocketRisu `src/ts/model/providers/anthropic.ts` already contains `claude-sonnet-4-6` and marks it `recommended: true`.
- The same catalog retains legacy `claude-3-5-sonnet-20241022` and `claude-3-5-sonnet-20240620`, so the first slice can preserve backwards-compatible resolution without a saved-data migration.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE` for the isolated OAI2 preset slice
- Priority: `P1`
- lifecycle status: `READY_TO_PORT`
- source evidence: `kwaroran/Risuai@ffabb06a386f1aee13217e5ca3c4268a35edb421`; PocketRisu direct inspection at upstream base `273e7c2fd541cd7df0d21f03e29892247c49e724`
- benefit: new OAI2 preset loads use a supported/recommended current Claude Sonnet model instead of a retired model ID, without rewriting existing saves
- conflict/risk: a global replacement could break legacy resolution or unrelated provider namespaces; scope must remain three confirmed OAI2 literals only
- validation need: normal type/check suite; focused preset assertion for all three OAI2 fields; compatibility assertion that retired Anthropic IDs remain resolvable
- follow-up: implement only on personal-fork branch `feature/model-default-deprecation-legacy-resolution`; open a personal-fork draft PR only after focused validation succeeds

## Autonomous progression performed

1. Re-read durable registry/classification/backlog before progressing.
2. Verified all 11 Active-source HEADs against their durable cursors; no forward cursor moved.
3. Performed direct PocketRisu ownership audit for the OAI2 preset and Anthropic model catalog.
4. Updated helper-repo design dossier to `READY_TO_PORT` with exact first-slice ownership, validation, rollback, and no-dependency decision.
5. Created clean personal-fork branch `feature/model-default-deprecation-legacy-resolution` from current official upstream base commit `273e7c2fd541cd7df0d21f03e29892247c49e724`.

## Implementation boundary / blocker

No production modification was made in this run. The available GitHub contents write action replaces a complete file, while the inspected `templates.ts` is large and the connector response is truncated; using an incomplete reconstructed file would violate the project's stop-on-unexpected-output rule. The local execution environment also cannot resolve `github.com`, so a normal clean checkout and focused local test run could not be performed.

This is an integration/execution-environment blocker, not a code or CI failure. The feature branch remains clean at base `273e7c2fd541cd7df0d21f03e29892247c49e724`. No personal PR was opened because no verified production commit exists.

## Guardrails

This candidate does not touch save flushing, `flushServerDbKeepalive()`, V3 plugin reload, runit/PM2, Android notifications, storage architecture, security-sensitive parsing, or device/runtime packages.

## Historical-backfill marker

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` unchanged: this run progressed an existing idea and did not establish complete cross-source historical coverage through a newer date.
