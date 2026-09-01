# Historical backfill review — lazy asset manifest descriptor-loss guard

Date: 2026-09-02
Source: `PocketRisu/PocketRisu:develop`
Commit: `e38a3833989c4f04d556379c653677f6b9d49341`

## Finding

PocketRisu's lazy asset-manifest split leaves a client-visible owner with a descriptor instead of the full inline asset array. A writer can accidentally reconstruct an owner without either the descriptor or the inline array (for example a plugin field whitelist, an explicit descriptor-removal patch, or a malformed full write). If accepted, hydration cannot distinguish accidental descriptor loss from intentional deletion and the owner's asset list can disappear from the persisted database while manifest rows become orphaned.

The adopted fix compares the previous client view against the proposed next document by stable owner identity and rejects transitions where a previously manifest-backed owner has neither its descriptor nor an inline replacement. Patch writes return `409 ASSET_MANIFEST_GUARD_REJECTED` so callers can rebase; full writes abort. Cold-cache full writes first load the current client view from disk so the guard remains effective after restart.

The same commit also canonicalizes the hex `file-path` request header before cache lookup. Without canonicalization, an uppercase spelling could create a second cache key and bypass integrity checks performed against the canonical lowercase key.

## Transferable invariant

**LAZY-DESCRIPTOR-LOSS-MUST-NOT-IMPLY-DESTRUCTIVE-DELETE**

When a large persisted field is externalized behind a lightweight descriptor, omission of both the descriptor and the materialized value is ambiguous and must not automatically acquire destructive-delete authority. Compare against the prior authoritative/client projection and fail closed unless deletion is represented by an explicit operation/contract.

Identity-bearing request/cache keys used by integrity checks must be canonicalized before lookup so equivalent encodings cannot fork guard state.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle status: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu@e38a3833989c4f04d556379c653677f6b9d49341`; added guard tests in `test/compat/asset-manifest-guard.test.ts`
- Benefit: prevents silent loss of manifest-backed character/module/persona assets during compatibility writes and keeps integrity guards effective across cache state/key spelling variants
- Conflict/risk: false positives can reject a legitimate descriptor deletion if deletion intent is not represented explicitly; owner identity matching must remain stable and complete
- Validation need: retain patch/full-write regression cases for descriptor omission, inline replacement, legitimate owner removal, cold-cache restart, and equivalent case variants of cache/file identifiers
- Follow-up: preserve as an adopted invariant; any future lazy/externalized field should define explicit deletion semantics and canonical key identity before shipping

## Guardrail check

No change is proposed to DB visibility/pagehide flushing, `flushServerDbKeepalive()`, save/integrity optimizations, targeted V3 reload, runit, or server-phone notification behavior.

## Backfill coverage

This is a bounded historical slice. It does not establish complete reviewed coverage for all tracked sources, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
