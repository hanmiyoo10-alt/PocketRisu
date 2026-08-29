# PocketRisu-Kei historical review — shared token-count owner

- Reviewed source: `seto-sama/PocketRisu-Kei`
- Source commit: `ae05122d6f7423a285e74d1e07fe245ac1847236` (`feat(ui): unify CBS-aware token counts`)
- Active-source cursor: unchanged at `3b55f692c02c04082b087547b0114506a5373681`; this is bounded historical backfill and must not move the cursor backward.

## Finding

PocketRisu-Kei replaced repeated per-field debounce/sequence ownership in character/settings editors with a reusable `TokenCount` component. The component centralizes the 400 ms debounce, accurate/CBS-aware tokenization, stale async-result suppression via a generation sequence, timer cleanup, and presentation. The source also opts additional eligible textarea surfaces into the same owner.

Current `hanmiyoo10-alt/PocketRisu:main` still contains the same repeated `tokenizeField` + per-field timer/sequence pattern in `src/lib/SideBars/CharConfig.svelte`, so this is a direct matching ownership/refactor opportunity rather than a purely external analogy.

## Classification

- Feature-ID: `SHARED-ASYNC-TOKEN-COUNT-OWNER`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `LOW`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P2`
- Lifecycle: `READY_TO_PORT`

## Benefit

One async owner keeps debounce timing, CBS-aware counting, stale-result rejection, cleanup, and display behavior consistent across editors. It removes duplicated lifecycle state and makes later token-count surfaces less likely to implement weaker async invalidation.

## Conflict / risk

A broad UI sweep could accidentally change which fields display counts or alter spacing. Minimal safe scope is behavior-preserving extraction for already-counted fields only; adding new counted surfaces belongs in a separate follow-up.

## Validation need

- component-level test: debounce suppresses immediate work;
- stale async completion cannot overwrite a newer value;
- teardown clears pending timer;
- existing character description/first-message/local-note counts remain accurate and CBS-aware;
- visual/layout parity on the existing three surfaces.

## Follow-up

Keep `READY_TO_PORT`, but do not displace the existing P0 backup-export candidate while that candidate is blocked only on runtime verification. When implemented, use a fresh one-feature branch from current `main`; first slice should only extract the shared owner and replace the three existing CharConfig counters. Do not mix the source's additional persona/alternate-greeting UI expansion into that PR.
