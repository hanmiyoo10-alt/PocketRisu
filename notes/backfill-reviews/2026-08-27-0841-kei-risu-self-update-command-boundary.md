# Historical backfill — tegy1117/Kei-Risu self-update command boundary

Reviewed: 2026-08-27
Source: `tegy1117/Kei-Risu`
Forward cursor remains: `8d794f9753381ab2582509a6cfb577968a6de595`

## Idea

### Shell-free archive extraction for self-update / updater paths

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `HIGH`
- Dependencies: current PocketRisu updater/archive-extraction surface audit; no matching `/api/self-update` path was found in the personal fork during this pass
- Priority: `P0`
- Lifecycle status: `HOLD`
- Source evidence: `tegy1117/Kei-Risu` commit `9c38558d5ffbb68cdb83c9a6bcca7dafb4582c71`
- Benefit: prevents command injection when archive/extraction paths contain shell metacharacters; makes process invocation testable as executable + argv instead of interpolated command text
- Conflict/risk: updater/deployment surfaces are security-sensitive; blindly adding a helper where PocketRisu has no equivalent path would create dead or misleading code
- Validation need: inventory all current PocketRisu archive extraction / updater child-process calls; for any path influenced by downloaded filenames, temp paths, user/config input, or remote metadata, assert executable+argv invocation and test metacharacter-bearing paths on supported platforms
- Follow-up: preserve as a security invariant. If a matching current path is found, split that exact path into a separate design/implementation candidate; do not broaden into updater refactoring.

## Evidence details

The source change replaces interpolated `execSync` tar/PowerShell command strings with `execFileSync` executable + argument arrays. The Windows PowerShell fallback keeps untrusted archive/destination paths out of the command string and passes them via environment variables. Added tests explicitly use paths containing `;`, `$()`, `&`, and quote characters and assert that they remain data rather than shell syntax.

## PocketRisu applicability check

A bounded code search of `hanmiyoo10-alt/PocketRisu` for `api/self-update`, `extractUpdateArchive`, `Expand-Archive`, and the matching tar/exec pattern did not find an equivalent current self-update route. Therefore this pass records the lesson as `HOLD`, not `READY_TO_PORT`, and performs no source-code mutation.

## Backfill coverage

This bounded pass reviewed the most recent 25 commits shown for `tegy1117/Kei-Risu`, spanning 2026-07-31 through 2026-08-03. It does **not** claim initial-history coverage and does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
