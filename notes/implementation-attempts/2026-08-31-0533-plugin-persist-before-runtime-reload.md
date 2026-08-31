# Implementation attempt — PLUGIN-PERSIST-BEFORE-RUNTIME-RELOAD

Date: 2026-08-31

## Candidate

- System impact: `NO_SYSTEM_UPDATE`
- Lifecycle: `READY_TO_PORT`
- Risk: `LOW`
- Size: `XS`
- Dependencies: `NONE`
- Priority: `P0`

## INSPECT_ONLY result

Personal fork `hanmiyoo10-alt/PocketRisu:develop` has an execution-eligible ordering gap in `src/ts/plugins/plugins.svelte.ts`: `void requestImmediateSave()` is followed immediately by targeted V3 reload or general plugin reload.

The canonical save API in `src/ts/globalApi.svelte.ts` is awaitable and its promise covers `triggerSave()` / `persistTrackedChanges(...)`, so the intended implementation is a minimal happens-before correction using the existing owner rather than a new flush mechanism.

## Clean-boundary / verification gate

Attempted local repository access before creating a production feature branch:

`git ls-remote https://github.com/hanmiyoo10-alt/PocketRisu.git refs/heads/develop`

Result: transient environment/network failure — `Could not resolve host: github.com`.

Because focused tests and project checks could not be run from a clean isolated checkout, the automation stopped before production branch/code creation. No unverified GitHub Contents API edit was used as a substitute.

### Retry — 2026-08-31 11:44 KST

The candidate was re-inspected against current personal-fork `develop` (`e57c0435018646800566f2158fd1a9fa12caa9e2`). The ordering gap is still present exactly as previously recorded: `setDatabaseLite(db)` -> fire-and-forget `requestImmediateSave()` -> targeted V3 `reloadV3Plugin(pluginData)` or general `loadPlugins()`.

Source evidence `nevaeh5379/Risuai@3b5b3d39425a6297e8ea8a634e6d957e17c7b771` was rechecked and still supports persistence-before-reload with regression coverage. The helper Feature-ID dossier also still marks the candidate `READY_TO_PORT`.

GitHub connector access was healthy for repository inspection and durable-note writes, but the clean local verification environment again failed the same pre-branch command with `Could not resolve host: github.com`. Because the project policy requires modify -> focused verify before a successfully verified draft PR, connector-only source mutation was not used to bypass the unavailable test checkout.

This repeated blocker is environmental, not a code or CI failure. Do not interpret connector write availability as sufficient verification for this candidate.

## Production status

- Feature branch: not created
- Production code commit: none
- Focused tests: not run (environment blocker)
- Project checks: not run (environment blocker)
- Personal-fork draft PR: not opened
- Code/CI status: not failed; not exercised
- Integration/runtime status: blocked by local GitHub DNS resolution

## Next safe step

On a run with working local GitHub access: create one isolated feature branch from current personal-fork `develop`, add ordering regression tests, make the one-slice awaited-save change while preserving targeted V3 reload, run focused tests + project checks + `git diff --check`, then open a personal-fork draft PR with this Feature-ID.
