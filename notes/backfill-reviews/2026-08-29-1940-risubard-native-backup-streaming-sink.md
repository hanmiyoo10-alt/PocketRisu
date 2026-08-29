# Historical backfill review — RisuBard native backup streaming sink

- Reviewed: 2026-08-29
- Source: `rpaddict/RisuBard`
- Evidence commit: `5f5f80348509a034acb318563fb52ebef188a3f0` (release commit containing the hotfix and regression test; parent feature commit `9a8a02f2a0610cc58cc257de4007721c077dfed7`)
- Cursor treatment: historical normalization inside the already-reviewed cursor; do not move `Last reviewed HEAD` backward or forward for this entry.

## Finding

RisuBard documents and tests a failure where a normal backup reaches 100% and then fails while finalizing the StreamSaver download. On Chromium-family browsers it now asks for a native file handle before starting export and writes the response stream directly to that handle, bypassing the failing StreamSaver close path. Unsupported browsers retain the existing StreamSaver/download fallback. User cancellation is treated as cancellation rather than an export failure.

The personal PocketRisu fork currently has the same pre-fix `SaveLocalBackup()` / `streamBackupToDisk()` shape: it always selects StreamSaver when `response.body` exists and closes that writer after the stream completes. This is a direct matching owner and matching failure boundary, not merely analogous external evidence.

## Classification

- Feature-ID: `BACKUP-EXPORT-NATIVE-STREAMING-SINK`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `READY_TO_PORT`
- Source evidence: `rpaddict/RisuBard@5f5f80348509a034acb318563fb52ebef188a3f0`; hotfix lineage includes `9a8a02f2a0610cc58cc257de4007721c077dfed7`; regression test `src/ts/drive/backuplocal.test.ts`.
- Benefit: avoids a known post-100% finalization failure and reduces large-backup memory/finalization pressure by writing directly to a user-selected native file handle where supported.
- Conflict/risk: browser File System Access API is capability-gated and may be unavailable; cancellation must not be reported as failure; fallback behavior must remain intact; export bytes must remain unchanged.
- Validation need: prove native picker happens before export, bytes written equal response bytes, StreamSaver is not touched on native path, AbortError is quiet, and unsupported-browser fallback remains unchanged.
- Follow-up: implement one isolated personal-fork slice in `src/ts/drive/backuplocal.ts` plus focused regression tests; no import/restore/storage-format changes.

## Guardrail check

This is export-only UI/browser I/O. It does not touch DB flush semantics, `flushServerDbKeepalive()`, save/integrity optimizations, V3 plugin reload, runit/PM2, Android notifications, device packages/runtime, parsers, storage formats, migrations, or destructive restore paths.
