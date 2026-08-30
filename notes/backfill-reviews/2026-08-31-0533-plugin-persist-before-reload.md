# Historical review — plugin persistence before runtime reload

Date: 2026-08-31

## Source evidence

- Source: `nevaeh5379/Risuai`
- Commit: `3b5b3d39425a6297e8ea8a634e6d957e17c7b771`
- Commit message: `fix(plugins): persist updates before reloading`
- Observed failure: plugin import/update mutated the in-memory plugin list, then reinitialized/reloaded runtime state before the pending SQL write was durably committed. The updated plugin could work for the current session and revert after application reload.
- Source fix: write the updated plugin list through the storage owner, await an explicit flush, then reload plugin runtimes; source regression test verifies updated version/script is present in the persisted settings upsert.

## PocketRisu inspection

Personal fork inspected at `hanmiyoo10-alt/PocketRisu:develop`.

Current `src/ts/plugins/plugins.svelte.ts` still does:

1. mutate `db.plugins`;
2. `setDatabaseLite(db)`;
3. `void requestImmediateSave()`;
4. immediately `await reloadV3Plugin(pluginData)` for V3→V3 updates, or `loadPlugins()` otherwise.

`requestImmediateSave()` is not merely a fire-and-forget flag: its implementation marks the DB changed, awaits a Svelte tick, then awaits `triggerSave()`, whose promise covers `persistTrackedChanges(...)`. Therefore the smallest ownership-preserving adaptation is to await that existing save boundary before any runtime reload.

This is compatible with the PocketRisu guardrail to preserve targeted V3 reload: the proposed slice changes ordering only; it does not replace `reloadV3Plugin()` with full `loadPlugins()` for V3→V3 updates.

## Classification

- Feature-ID: `PLUGIN-PERSIST-BEFORE-RUNTIME-RELOAD`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `READY_TO_PORT`
- Source evidence: `nevaeh5379/Risuai@3b5b3d39425a6297e8ea8a634e6d957e17c7b771`; direct PocketRisu owner inspection on personal fork `develop`
- Benefit: prevents plugin updates/imports from becoming runtime-visible before their durable DB state is known to be saved, eliminating session-only update/revert races.
- Conflict/risk: save failure must not be disguised as a successful durable update; preserve targeted V3 reload and current save/integrity architecture. Do not add visibility/pagehide flushes or change `flushServerDbKeepalive()`.
- Validation need: focused regression proving save completion precedes V3 targeted reload and general `loadPlugins()`; failure-path test proving reload is not treated as durable success when save rejects/fails; project type/check suite.
- Follow-up: safe autonomous implementation is eligible only after a clean isolated checkout can run focused tests/checks.

## Implementation gate result for this run

INSPECT_ONLY completed and the change is execution-eligible by classification. Local checkout verification could not start because the runtime cannot resolve `github.com` (`git ls-remote` failed with DNS resolution error). Per the project gate, no production branch/code/PR was created without the ability to run focused tests/checks. This is a tooling/network blocker, not a code or CI failure.

## Cursor / backfill note

This is historical evidence and does not move any Active-source forward cursor backward. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged because this bounded review does not establish complete coverage for every tracked source through a new date.
