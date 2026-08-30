# Backfill review — PocketRisu-Kei token-count observer boundary

Reviewed: 2026-08-30
Source: `seto-sama/PocketRisu-Kei`
Historical evidence: `ae05122d6f7423a285e74d1e07fe245ac1847236` (`feat(ui): unify CBS-aware token counts`)

## Finding

PocketRisu-Kei extracted repeated editor token-count effects into `TokenCount.svelte`. The component preserves the important semantics already present in PocketRisu's character editor: `tokenizeAccurate()` remains CBS-aware, expensive counting is delayed 400 ms off the keystroke path, each source-value change increments a sequence immediately, and an older async completion is ignored if a newer value has arrived. Cleanup clears the pending timer.

Current personal-fork `develop@e57c0435018646800566f2158fd1a9fa12caa9e2` still contains three copies of the timer/sequence machinery in `src/lib/SideBars/CharConfig.svelte`, for description, first-message, and active-chat author-note counts. This establishes a matching PocketRisu owner rather than a speculative port target.

## Deduplication

This is not a new tokenizer algorithm and does not duplicate provider token-accounting or server-side generation-planning ideas. The transferable idea is specifically a display-only async observer boundary: one reusable component owns debounce + stale-result rejection while the tokenizer remains authoritative.

## Classification

- Feature-ID: `TOKEN-COUNT-ASYNC-OBSERVER-BOUNDARY`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `READY_TO_PORT`
- source evidence: `seto-sama/PocketRisu-Kei@ae05122d6f7423a285e74d1e07fe245ac1847236`, especially `src/lib/UI/GUI/TokenCount.svelte` and the corresponding `CharConfig.svelte` replacement
- benefit: remove duplicated correctness-sensitive debounce/sequence code and make future CBS-aware token counters use one stale-result-safe owner
- conflict/risk: a refactor could accidentally change CBS semantics, debounce timing, source values, or styling; keep scope to behavior-preserving extraction
- validation need: `svelte-check`; verify the same three source values render counts; verify no local timer/sequence machinery or direct `tokenizeAccurate` import remains in `CharConfig.svelte`; review diff for display-only scope
- follow-up: helper dossier created at `products/pocketrisu-helper-mod/docs/features/ui/token-count-async-observer-boundary/DESIGN.md`; isolated personal branch `feat/token-count-async-observer-boundary` created from `develop@e57c0435018646800566f2158fd1a9fa12caa9e2`

## Autonomous progression result

The dossier resolves ownership, mechanism, invariants, validation, rollback, and one-PR decomposition, so the item is classified `READY_TO_PORT` and satisfies the normal autonomous implementation gates (`NO_SYSTEM_UPDATE`, `Risk LOW`, `Size XS`, dependencies none).

Implementation did not proceed past branch isolation in this run because the available GitHub contents write primitive replaces an entire existing file, while `CharConfig.svelte` is large and the connector returned it only in bounded/truncated reads. The local runtime also cannot resolve `github.com`, so a clean clone/patch/test route was unavailable. Guessing or reconstructing the entire file from partial reads would violate the INSPECT_ONLY -> modify -> verify rule. This is an integration/tooling limitation, not a code or CI failure. No partial production file was committed and no PR was opened.

## Cursor / backfill handling

This is historical evidence older than the active `seto-sama/PocketRisu-Kei` cursor `3b55f692c02c04082b087547b0114506a5373681`; the cursor must not move backward. This bounded slice does not establish complete historical coverage for all tracked sources, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
