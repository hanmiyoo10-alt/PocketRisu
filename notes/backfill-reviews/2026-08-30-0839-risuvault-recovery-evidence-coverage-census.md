# Historical review — recovery evidence coverage census

Source: `TripleHwang/RisuVault`
Commit: `47fcb62948d74480c978093400cd58fed18a2a63`
Reviewed: 2026-08-30

## Finding

Recovery code must not claim that an item is absent from all backups unless every backup that exists was actually examined successfully. A bounded recovery sweep can skip candidates for count, byte, timeout, or decode-failure reasons; those omissions are evidence gaps, not proof of absence.

The source commit fixes a concrete false-negative recovery report by carrying a census of `total`, `examined`, `unreadable`, and `skipped` candidates, with the invariant `total == examined + unreadable + skipped`. Only complete coverage may produce an `ABSENT_FROM_ALL` result. Partial coverage is reported as `ABSENT_FROM_EXAMINED`; zero readable coverage cannot make any absence claim. It also changes candidate budgeting so one oversized candidate does not hide smaller affordable candidates behind it and derives limits from measured save sizes rather than arbitrary round numbers.

## PocketRisu relevance

This is a transferable recovery invariant, not a request to port RisuVault's SQL repair architecture. Any future PocketRisu recovery/restore/repair path that searches multiple bounded snapshots should separate:

- backup sources that exist;
- sources actually attempted;
- sources successfully decoded and examined;
- sources attempted but unreadable;
- sources skipped by bounded-resource policy.

User-facing claims and automated fallback decisions must never exceed that measured coverage.

## Classification

- Feature-ID: `RECOVERY-EVIDENCE-COVERAGE-CENSUS`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: matching PocketRisu multi-candidate recovery/repair owner; explicit candidate inventory; bounded decode/search budgets; regression fixtures covering unreadable and skipped candidates
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`

## Benefit

Prevents a recovery tool from telling the user that data is gone when the tool only searched a subset of available evidence. It also makes bounded recovery observable and testable instead of silently folding resource limits into semantic conclusions.

## Conflict / risk

Recovery semantics are data-safety sensitive. Incorrect census accounting can create either false certainty or unbounded recovery work. Do not widen limits blindly and do not copy RisuVault's storage format, SQL repair code, worker heap assumptions, or measured thresholds into PocketRisu.

## Validation need

Before implementation, identify a real PocketRisu path that searches multiple recovery candidates. Reproduce at least these cases with test fixtures: no backups; all unreadable; some examined plus some unreadable; some skipped by count/byte/time budget; all examined with target absent; target found in a later candidate; oversized candidate followed by a smaller affordable candidate. Assert that only the complete-coverage case may claim global absence.

## Follow-up

Keep as design/investigation only until a matching PocketRisu owner exists. If one is found, first land test-only coverage of the semantic result states and census invariant; only then adapt the smallest read-only accounting boundary. No destructive restore behavior, storage migration, forced DB flush, or host/runtime change is authorized by this idea.

## Cursor handling

This commit predates the authoritative `TripleHwang/RisuVault` forward cursor `5afa95a9379ef45ef8484617a5407726d14e5f2b`; the cursor is intentionally unchanged.
