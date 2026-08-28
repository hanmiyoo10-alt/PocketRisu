# Historical backfill — PocketRisu-Alter strict-shell archive detection

Date: 2026-08-28
Source: `PocketRisu-Alter/PocketRisu-Alter`
Reviewed commit: `3181f3aa499b6af884293db3391b03c108af7144` (2026-05-14)

## Finding

Alter fixed a real installer/updater failure caused by combining `set -euo pipefail` with archive-directory discovery using `ls -d A* B* 2>/dev/null | head -1`. When exactly one glob matched, `ls` still exited non-zero for the unmatched branch; under `pipefail`, that status escaped the command substitution and aborted the script before the explicit directory guard. Redirecting stderr hid the diagnostic but did not neutralize the status.

The fix replaced that pipeline with bounded `find ... -print -quit`, then retained the explicit `[ -d "$EXTRACTED_DIR" ] || error ...` validation.

## PocketRisu applicability

Current `hanmiyoo10-alt/PocketRisu:main` already carries the same `find`-based extraction discovery in `install.sh` (and the corresponding updater lineage), so this is not a new implementation candidate. Preserve it as an adopted deployment invariant: strict-shell scripts must not use multi-pattern commands whose expected partial non-match becomes fatal under `set -e`/`pipefail`.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle status: `ADOPTED`
- Source evidence: `PocketRisu-Alter/PocketRisu-Alter@3181f3aa499b6af884293db3391b03c108af7144`
- Benefit: prevents silent fresh-install/update aborts in strict-shell deployment scripts.
- Conflict/risk: later cleanup could reintroduce a superficially simpler glob/pipe pipeline and revive the failure.
- Validation need: shell regression coverage should exercise exactly-one-match, legacy-name-only, current-name-only, and no-match extraction cases under `set -euo pipefail`.
- Follow-up: preserve the invariant when touching `install.sh`/`update.sh`; no feature branch or PR is warranted because the current code is already compliant.

## Backfill marker

This review extends bounded Alter inspection into 2026-05-14, but it does not establish complete historical coverage for every tracked source. Do not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH` from this review alone.
