# Historical review — filtered single-file selection cancel contract

- Source: `PocketRisu/PocketRisu`
- Branch reviewed: `develop`
- Commit: `d5f786a1fdb607357e23b342748a6830e13abb78`
- Date: 2026-08-22
- Review date: 2026-09-02

## Finding

`selectFileByDom(ext, 'single')` can legitimately resolve to an empty list when the user picked a file that fails the extension filter. `selectSingleFile()` previously dereferenced `v[0]` unconditionally, turning a filtered-out selection into an exception rather than the same null/cancel contract callers already handle.

The adopted fix uses the first item only when present and returns `null` otherwise. This preserves the API boundary that rejected/filtered input is non-selection, not a partially valid file and not an exceptional path.

## Classification

- Feature-ID: `FILTERED-FILE-SELECTION-USES-CANCEL-CONTRACT`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- Source evidence: official PocketRisu commit `d5f786a1fdb607357e23b342748a6830e13abb78`, localized change in `src/ts/util.ts`
- Benefit: avoids crashes on filtered single-file picks and lets existing caller cancel guards remain authoritative
- Conflict/risk: callers that intentionally distinguished rejection from cancellation would need a richer typed result; current contract intentionally does not
- Validation need: preserve regression coverage for empty result from extension filtering and normal selected-file read behavior
- Follow-up: treat filtered/rejected picker results as non-selection consistently when future file-picker abstractions are refactored

## Dedupe

Kept separate from import/parser validation ideas. This invariant owns the utility-level return contract after the DOM picker has already rejected a file; it does not decide whether a file type is valid or how an import parser handles accepted bytes.

## Backfill marker

This is one bounded historical slice only. It does not establish complete tracked-source coverage through 2026-08-22, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
