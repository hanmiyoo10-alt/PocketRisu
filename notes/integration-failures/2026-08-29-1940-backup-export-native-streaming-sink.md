# Integration failure — BACKUP-EXPORT-NATIVE-STREAMING-SINK

- Date: 2026-08-29
- Feature-ID: `BACKUP-EXPORT-NATIVE-STREAMING-SINK`
- Intended branch: `feature/backup-export-native-streaming-sink`
- Base commit: `db8d1b5cf96ef7548773b39ee85597a074310605`
- Source evidence: `rpaddict/RisuBard@5f5f80348509a034acb318563fb52ebef188a3f0`

## Result

The isolated personal-fork branch was created successfully from the current `main` base. No code commit was made.

A bounded attempt to construct the feature commit through the GitHub integration used the already-verified source blobs for `src/ts/drive/backuplocal.ts` and its focused regression test. GitHub rejected the tree creation because the source-fork blob SHA is not a valid blob in the personal-fork object database (`422`).

This is an integration/patch-transport failure, not a code or CI failure. No test run or draft PR exists for the personal fork because there is no feature commit to test or review.

## 2026-08-29 follow-up verification

The remaining code-divergence uncertainty was resolved without modifying the feature branch:

- personal fork `feature/backup-export-native-streaming-sink:src/ts/drive/backuplocal.ts` blob: `bccb53966862b66d3c7e643c7e3daeac2eb40e81`
- RisuBard immediately before the native-streaming change, `rpaddict/RisuBard@9a8a02f2a0610cc58cc257de4007721c077dfed7:src/ts/drive/backuplocal.ts` blob: `bccb53966862b66d3c7e643c7e3daeac2eb40e81`

The blobs are byte-identical. Therefore the verified RisuBard patch is based on exactly the same file content as the personal feature branch; there is no hidden fork-specific tail divergence to reconcile for this file. The source change remains a bounded `NO_SYSTEM_UPDATE / P0 / Evidence HIGH / Risk LOW / Dependencies NONE / READY_TO_PORT` candidate.

The integration still lacks a safe patch-capable write path. Reusing the post-change source blob across repositories is rejected, and replacing a complete file by manually reconstituting connector chunks would add avoidable transcription risk. This remains a transport limitation, not a code or CI result.

## Safety response

Stopped rather than replacing the complete personal-fork file from manually reconstructed connector chunks or guessing at unrelated content. The personal branch therefore remains a clean boundary with no feature diff.

## Next step

Apply the small verified patch through a write path that can safely patch the existing personal-fork blob (or can copy/create the exact post-change blob in the personal repository), add the focused regression test, then run focused Vitest/type checks. Only after successful verification should a personal-fork draft PR be opened.
