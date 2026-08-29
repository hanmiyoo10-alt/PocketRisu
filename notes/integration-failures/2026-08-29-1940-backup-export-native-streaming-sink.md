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

## Safety response

Stopped rather than replacing the complete personal-fork file from incomplete/truncated connector output or guessing at unrelated tail content. The personal branch therefore remains a clean boundary with no feature diff.

## Next step

Apply the small verified patch through a write path that can safely patch the existing personal-fork file (or provide the complete current blob content to the contents API), add the focused regression test, then run focused Vitest/type checks. Only after successful verification should a personal-fork draft PR be opened.
