# PocketRisu develop source-head rewind — 2026-09-03 19:31 KST

## Observation

- Source: `PocketRisu/PocketRisu`
- Branch: `develop`
- Durable `Last reviewed HEAD`: `ca09a80746e74e5334145e5e78af47ce423e0eba`
- Observed current branch HEAD: `278251f85a19bfdfd4cf3faae780e62682878f9e`
- GitHub compare `ca09a807...develop`: `status=behind`, `ahead_by=0`, `behind_by=1`; merge base is `278251f85a19bfdfd4cf3faae780e62682878f9e`.
- The durable cursor commit still exists and is exactly one child of the observed current branch HEAD. Its change is documentation-only (`docs: warn that web-account RisuAI backups are encrypted and how to export a readable one`).

## Cursor handling

Do **not** move the authoritative cursor backward. Keep `ca09a80746e74e5334145e5e78af47ce423e0eba` as the forward cursor until `develop` again contains that commit or advances on a new lineage that can be safely compared against the preserved cursor. On future runs, detect ancestry/compare status before treating a lower/rewound branch HEAD as new forward traffic.

## Classification / idea handling

This is a source-watch integrity event, not a PocketRisu implementation idea, so the shared idea-classification schema is not instantiated for it and no feature dossier/branch/PR is warranted.

## Safety / progression result

- No source cursor was moved backward.
- No code was modified in official `PocketRisu/PocketRisu`.
- No implementation candidate was created.
- `HISTORICAL_BACKFILL_COMPLETE_THROUGH` was not changed.
- Remaining checked active sources were at their durable cursors; no forward candidate was identified during this pass.

## Follow-up

Recheck `PocketRisu/PocketRisu:develop` next run. If the branch returns to or advances beyond `ca09a807...`, resume normal forward-only review from the preserved cursor. If it establishes a different non-descendant lineage, preserve the cursor and record a lineage-change review before selecting any new forward baseline.