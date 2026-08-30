# RisuBard historical backfill — bounded module asset preview

Reviewed source: `rpaddict/RisuBard@769c611cc3574e6b0277e944afa1ffaaf99c100d`.

## Evidence

The source fixes large module-asset editor freezes by bounding the visible list (`moduleAssetPageSize = 24`), resolving previews only while the asset submenu is active and only for the visible slice, keying preview state by stable asset key, deduplicating in-flight `getFileSrc()` work, using lazy image loading / metadata-only media preload, and exposing explicit load-more progression. The same source commit separately reduces decoded import batches; that import-memory slice is not part of the candidate below.

Current PocketRisu fork inspection at `develop` shows `src/lib/Setting/Pages/Module/ModuleMenu.svelte` still iterates every `currentModule.assets` entry in `$effect.pre`, calls `getFileSrc()` for all assets when preview is enabled, and renders the full array.

## Deduplication / normalization

This is not a new underlying idea. It strengthens and normalizes the existing ledger item **“Paginate large asset/file lists; fetch thumbnails only for active page; dedupe in-flight thumbnail requests.”** RisuBard provides a directly matching module-editor implementation and regression test, raising evidence to HIGH for the module-asset slice.

Classification for the bounded module-editor slice:

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `READY_TO_PORT`
- source evidence: `rpaddict/RisuBard@769c611cc3574e6b0277e944afa1ffaaf99c100d`
- benefit: bound DOM/media preview work for modules with many additional assets; reduce browser memory/IO spikes and UI freezes, especially on mobile
- conflict/risk: stable editing/index semantics must survive incremental visibility; preview bookkeeping must not retain deleted/reordered assets indefinitely
- validation need: focused component/source regression for bounded rendering, active-submenu gating, in-flight preview dedupe, stable asset-key lookup, and load-more behavior; run project check if available
- follow-up: implement only the UI/preview slice on an isolated personal-fork feature branch; keep decoded import batching as a separate candidate

Historical source cursor is not moved backward by this review.
