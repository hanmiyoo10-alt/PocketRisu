# Historical review — RisuVault encrypted reference worktree boundary

- Reviewed source: `InoriNatsume/RisuVault`
- Source commit: `d602bf8d268078a8d425432a217a8bdb12ffdf20`
- Review mode: bounded historical backfill; active forward cursor remains unchanged.

## Evidence

The source separates vault-wide reference material into an encrypted, git-tracked representation and a plaintext, gitignored working representation. `refs-sync` encrypts each work file to a temporary `.enc` file and renames it into place, then removes encrypted files that no longer have a plaintext counterpart. `refs-pull` decrypts tracked `.enc` files into the working area. Documentation explicitly notes that filenames remain public metadata even when file contents are encrypted.

This is useful as a storage/security boundary pattern rather than as code to port. It makes three ownership rules explicit: durable/shareable encrypted form and transient plaintext form are different domains; plaintext must not become source-control authority accidentally; and metadata leakage (filenames) must be modeled separately from content confidentiality.

## PocketRisu relevance

Potentially relevant only if PocketRisu later owns sensitive portable/reference material that must be shareable or backed up without committing plaintext. Current review did not establish a matching PocketRisu owner or user-visible defect. The source also has dangerous synchronization semantics for a generic transplant: `refs-sync` treats absence from the plaintext worktree as deletion authority for tracked encrypted files. That is acceptable only when the worktree is proven authoritative and complete; otherwise it can destroy durable references.

## Classification

- Feature-ID: `SENSITIVE-PORTABLE-DATA-DUAL-REPRESENTATION`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `HIGH`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: matching PocketRisu-owned sensitive portable/reference-data boundary; explicit threat model and key lifecycle; filename/metadata leakage policy; authoritative-side and conflict semantics; atomic write/recovery guarantees; tests proving missing plaintext is not treated as deletion unless explicitly intended
- Priority: `P3`
- Lifecycle status: `DESIGN_NEEDED`

## Benefit

Provides a durable design pattern for keeping shareable/backed-up sensitive content encrypted while exposing plaintext only in a bounded local working domain.

## Conflict / risk

Security-sensitive storage and key management are high-blast-radius. Mirroring the source's delete-on-absence behavior without a complete authority model could cause destructive data loss. Encryption does not hide filenames, sizes, counts, or repository history. A plaintext working copy also broadens local exposure and requires explicit cleanup/permissions behavior.

## Validation need

Before implementation is ever considered, identify a concrete PocketRisu data owner and demonstrate the need. Define threat model, key derivation/rotation/recovery, encrypted-record versioning, metadata leakage, crash-safe writes, clone/restore behavior, partial-failure recovery, conflict handling, and source-of-truth rules. Add round-trip, wrong-key, truncated/corrupt blob, interrupted-write, stale-worktree, and non-destructive sync tests.

## Follow-up

Design/investigation only. Do not port source crypto/storage code, do not introduce a migration, and do not create an implementation branch or PR under the autonomous gate. If a matching PocketRisu feature appears, start from the helper-repo design dossier and narrow the first slice to read-only format/threat-model tests before any persistent mutation.

## Historical coverage

This review covers one bounded historical slice around `d602bf8d...`. It does not establish complete coverage for all tracked sources and therefore does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
