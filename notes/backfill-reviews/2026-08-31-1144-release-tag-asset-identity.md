# Historical review — release tag / asset identity

Date: 2026-08-31

## Source evidence

- `nevaeh5379/HaejeokRisuai@dbda43876b9322ce8284c166c28f0c3801f099b8` — publishing explicitly reasserts the requested `BUILD_TAG` + target commit, reads the published release back, retries once on mismatch, then fails closed if the release still points at a different tag.
- `nevaeh5379/HaejeokRisuai@b1fd6f3d3151eb347592339227ede5b3410b9ec9` — generated release-note asset URLs are rewritten from potentially stale/intermediate release tags to the requested build tag, with regression coverage.

These commits expose one underlying release-integrity invariant rather than two ideas: the requested build tag must remain the canonical identity across release publication and user-facing asset links. A release pipeline must not trust stale/intermediate release metadata when it can bind or verify against the triggering build tag.

## PocketRisu comparison

`hanmiyoo10-alt/PocketRisu:develop` currently triggers `.github/workflows/release.yml` on `refs/tags/v*` and creates the release with `softprops/action-gh-release@v3` using both `tag_name: ${{ github.ref_name }}` and `name: ${{ github.ref_name }}` while uploading the produced artifacts in that same tag-triggered job. PocketRisu therefore already follows the relevant invariant by construction rather than by post-publication repair.

No current evidence justifies copying Haejeok's exact retry/URL-rewrite machinery into PocketRisu. Preserve the invariant instead: any future release workflow refactor must keep trigger tag, release tag, release target, artifact naming/link identity, and updater-visible version identity coherent and should fail closed if they diverge.

## Classification

- Feature-ID: `RELEASE-TAG-ASSET-IDENTITY`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- source evidence: Haejeok commits `dbda43876b9322ce8284c166c28f0c3801f099b8` and `b1fd6f3d3151eb347592339227ede5b3410b9ec9`; PocketRisu `.github/workflows/release.yml` on current `develop`
- benefit: prevents a published release or its download links from silently identifying/serving a different build than the tag the operator requested
- conflict/risk: blindly porting source-specific repair logic could duplicate `action-gh-release` ownership or create a second release authority; future workflow_dispatch/reusable-workflow changes could weaken the current tag-derived invariant
- validation need: on release-workflow changes, assert trigger/ref tag -> release `tag_name` -> release target/artifact version identity remain coherent; fail closed on mismatch rather than silently publishing ambiguous links
- follow-up: preserve as an invariant; if release creation is later split across jobs/workflows or generated download links are introduced, add explicit read-back/tag/link regression checks at that boundary

## Backfill coverage

This was a bounded historical normalization inside an already-forward-reviewed Haejeok range. It does **not** prove complete historical coverage for every tracked source and therefore does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
