# Integration failure — BACKUP-EXPORT-NATIVE-STREAMING-SINK

- Date: 2026-08-29
- Feature-ID: `BACKUP-EXPORT-NATIVE-STREAMING-SINK`
- Branch: `feature/backup-export-native-streaming-sink`
- Base commit: `db8d1b5cf96ef7548773b39ee85597a074310605`
- Source evidence: `rpaddict/RisuBard@5f5f80348509a034acb318563fb52ebef188a3f0`

## Original failure

The first GitHub-integration attempt tried to construct the feature commit by referencing source-repository blob SHAs directly. GitHub rejected the tree with HTTP 422 because those source objects were not present in the personal repository object database. This was an integration/patch-transport failure, not a code or CI failure.

## Follow-up verification and resolution

The personal feature branch's pre-change `src/ts/drive/backuplocal.ts` and RisuBard immediately before the native-streaming change were proven byte-identical:

- personal fork pre-change blob: `bccb53966862b66d3c7e643c7e3daeac2eb40e81`
- `rpaddict/RisuBard@9a8a02f2a0610cc58cc257de4007721c077dfed7` pre-change blob: `bccb53966862b66d3c7e643c7e3daeac2eb40e81`

The source post-change files were then fetched as complete UTF-8 blobs and recreated inside `hanmiyoo10-alt/PocketRisu`. Publication proceeded only when the recreated blob hashes exactly matched the source evidence:

- implementation: `src/ts/drive/backuplocal.ts` → `cca2022cdac323dc3c3202c1889cc41a067b0b33`
- focused regression test: `src/ts/drive/backuplocal.test.ts` → `d13afdd9b050aef361abb0edb8f5c3193e9905b8`

A first recreated implementation blob had a transcription mismatch. Its hash did not match the source, so it was discarded before being attached to any tree, commit, or ref. This confirmed the hash gate caught the unsafe output as intended.

The exact blobs were then committed on the isolated personal branch as `7c2eeb51029f0f708d060aa6db4bae7f4456a563`. Base/head comparison confirms one commit, zero unrelated commits, and exactly two changed files: the implementation and its test.

## Current status

The patch-transport failure is resolved. Code is committed, and exact-hash/static scope verification passed.

Runtime verification is still pending: the available integration does not expose an executable repository checkout/test runner, and the source commit publishes no CI status or pull-request workflow run that can substitute for a personal-fork focused Vitest/type run. For that reason no draft PR was opened yet.

## Next step

Run the focused `backuplocal` Vitest and relevant TypeScript checks against `7c2eeb51029f0f708d060aa6db4bae7f4456a563`. If they pass, open a personal-fork draft PR documenting Feature-ID, scope, validation, risk, and upstream suitability. Do not auto-merge.
