# Forward review — RisuBard module asset freeze fixes

Date: 2026-08-28
Source: `rpaddict/RisuBard`
Reviewed range: `372b4efe0cb8a10d40f4e227ad949d78b8aadc60..769c611cc3574e6b0277e944afa1ffaaf99c100d`

## Range summary

The source advanced by 8 commits. Most changes are RisuBard-specific narrative-memory/UI/release work. The transferable PocketRisu-relevant change in this range is `769c611cc3574e6b0277e944afa1ffaaf99c100d` (`fix: prevent asset module import freezes`).

That commit contains two related bounded-work mechanisms:

1. Module additional-asset UI renders only a bounded first page (`24`) and resolves previews only for visible rows, with in-flight preview deduplication and lazy media loading.
2. Legacy module import reduces decode/persist batch size to mobile-safe groups (`<= 8`) instead of server-sized groups.

## PocketRisu applicability audit

Current personal-fork `main` still has the same unbounded module asset editor shape in `src/lib/Setting/Pages/Module/ModuleMenu.svelte`: opening the additional-assets submenu iterates all assets, eagerly calls `getFileSrc()` for every asset when previews are enabled, and renders the complete asset table.

Current `src/ts/process/modules.ts` also retains a separate legacy import path that builds the full task list before bounded-concurrency decode/save work. The source's exact batch implementation is not copied blindly because PocketRisu's importer has diverged, but the bounded-worker/bounded-materialization lesson is relevant.

## Deduplication decision

Do not create a new broad asset-list idea. Merge this evidence into the existing `storage UI/perf — paginate large asset/file lists; fetch thumbnails only for active page; dedupe in-flight thumbnail requests` idea. The RisuBard commit independently demonstrates the same failure class specifically in module assets, and current PocketRisu has the matching owner.

The import-batch portion is retained as supporting evidence for the existing large-payload/batched-I/O family, but it does not independently authorize a change to PocketRisu's importer because its current ownership/concurrency model differs.

## Classification normalization

For the module-asset editor slice:

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `READY_TO_PORT`
- Source evidence: `rpaddict/RisuBard@769c611cc3574e6b0277e944afa1ffaaf99c100d`, plus earlier `nevaeh5379/Risuai@58b980ca`
- Benefit: bound DOM/media-preview work for large modules and avoid UI freezes/mobile memory spikes
- Conflict/risk: row-index editing must remain correct under pagination; previews must not leak stale URLs or duplicate in-flight work; existing Asset Viewer behavior must remain unchanged
- Validation need: focused component/source-connection test proving only the visible page is rendered/resolved; manual/automated large-module check; `pnpm check`
- Follow-up: implement one isolated module-asset-editor PR only after clean checkout tests can run

## Autonomous progression result

A helper-repo design dossier was prepared for the bounded module asset editor. No source branch or PR was created in this run because the execution environment cannot resolve `github.com` for a clean clone/test run. GitHub API reads/writes work, but this is an execution-environment blocker, not a code/CI failure. Per guardrails, modification was not started without a verifiable clean checkout.

Forward cursor may advance to `769c611cc3574e6b0277e944afa1ffaaf99c100d` because the full 8-commit range was reviewed.