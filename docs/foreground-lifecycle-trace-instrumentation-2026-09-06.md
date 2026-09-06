# Foreground lifecycle trace instrumentation — 2026-09-06

## Purpose

The Firefox/PocketRisu foreground-return symptom still reproduces after removing writer-lock auto-reload paths and after removing the locally introduced hide/pagehide immediate scroll DOM/layout scan. The next step is instrumentation rather than another speculative fix.

The trace is intended to distinguish:

- same-document resume;
- BFCache-style pagehide/pageshow restore;
- full reload/navigation;
- Firefox/Android content-process or document reconstruction.

Automatic page reload remains forbidden as recovery.

## Inspection before patch

`src/main.ts` is clean and imports `./ts/log-capture` at line 3 before the rest of application boot. `src/ts/log-capture.ts` was also clean before modification.

Pre-patch SHA-256 values:

- `src/main.ts`: `db6fad037050e542032f184fe67c7ba19ed9006a53bcf4b3fa69584989828cfd`
- `src/ts/log-capture.ts`: `2cf774e265ca4def0bd81c87ebb9604835dabf39f350c922416536a4c77b7aa4`

`log-capture.ts` already captures console errors/warnings and global errors, but it had no lifecycle instrumentation. Its existing `addLog()` path ultimately posts to `/api/logs`, but `addLog()` buffers for 500 ms and drops batches on network/auth failure, so it is not sufficient as the only source of evidence for a document reconstruction.

The writer-lock identity is stored in `sessionStorage` under `risu-writer-session-id`, so its short prefix can be used as one continuity signal across reload/restore behavior.

## Patch applied

A timestamped backup was created:

`src/ts/log-capture.ts.bak-lifecycle-trace-20260906-163904`

Backup SHA-256:

`2cf774e265ca4def0bd81c87ebb9604835dabf39f350c922416536a4c77b7aa4`

The working file was patched successfully and reported `PATCH_OK`.

Post-patch SHA-256:

`6c1e75a1979fccd2fe1c84f0d66a12525194cd7cecef0d036be2d582c3a9001c`

`git diff --check -- src/ts/log-capture.ts` produced no output.

## Trace design

The instrumentation adds a bounded localStorage ring under:

`risu-lifecycle-trace-v1`

The ring is capped at 80 entries and records:

- timestamp;
- per-document `bootId`;
- lifecycle event name;
- `document.visibilityState`;
- `PageTransitionEvent.persisted` for pagehide/pageshow;
- Navigation Timing entry `type`;
- short `risu-writer-session-id` prefix when available;
- `performance.timeOrigin`.

Installed events:

- `boot` at module initialization;
- `visibilitychange`;
- `pagehide`;
- `pageshow`.

When the document is visible, the latest 24 lifecycle entries are mirrored after a 12-second delay through the existing `addLog()` path as an info entry with source `lifecycle`. The localStorage ring remains the primary evidence source because it is synchronous and survives a newly created document as long as origin storage survives.

The instrumentation does not call `location.reload()`, navigate the page, modify chat/database state, or create Android notifications.

## Next validation

Run `pnpm check` first. If it passes, run `pnpm build`, manually load the rebuilt app once in Firefox, reproduce the long-background return case, then inspect the lifecycle ring and/or mirrored `/api/logs` entry before changing any more behavior.
