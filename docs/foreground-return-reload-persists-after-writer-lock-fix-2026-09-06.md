# Foreground-return reload persists after writer-lock fix — 2026-09-06

## Runtime reproduction

After the manual-refresh-only writer-lock patch was built successfully and loaded in Firefox, switching to another Android app and returning to PocketRisu still produced an unwanted page refresh/reconstruction.

This proves the removed writer-lock `location.reload()` paths were not the only cause of the foreground-return symptom.

## Built artifact inspection

A grep of the newly built `dist` showed:

- `risu-session-handoff-reload` is absent from `dist`, confirming the new writer-lock code is present in the production build;
- `location.reload` still exists elsewhere in built assets, including several occurrences in `dist/assets/index-fAT_an_l.js` and in `dist/assets/backuplocal-CDCL174x.js`;
- source-map occurrences mirror those built occurrences.

Therefore the next investigation should identify which remaining source-level `location.reload()` calls are included in the main runtime bundle and whether any can run on foreground return. Firefox/Android content-process reconstruction/OOM remains a separate fallback hypothesis, but must not be assumed until remaining app-level reload paths are ruled out.

Manual-refresh-only policy remains in force; do not add any automatic reload as recovery.