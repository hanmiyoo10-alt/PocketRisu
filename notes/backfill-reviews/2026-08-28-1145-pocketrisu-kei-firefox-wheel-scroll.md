# Historical backfill — PocketRisu-Kei Firefox wheel scroll preservation

Date: 2026-08-28
Source: `seto-sama/PocketRisu-Kei`
Evidence commit: `4c93d174280480264add1749f6adf07314585903`

## Finding

PocketRisu-Kei contains a concrete Firefox regression fix for chat scrolling where the application rewrote `scrollTop` while a wheel interaction was settling. Firefox may publish wheel movement asynchronously and retain fractional/sub-pixel motion internally; writing `scrollTop` during the settle path can discard that pending motion, make slow wheel scrolling appear stuck, or relatch the stream to the old bottom position before the browser publishes the user's upward movement.

The source fix separates wheel settlement from programmatic alignment: wheel settle records the current anchor without rewriting `scrollTop`, preserves fractional anchor geometry, treats the latest wheel direction as user intent, and ignores a late `scrollend` once the interaction has already settled. Focused tests cover fractional `scrollTop` and the late-published upward-wheel case.

## Deduplication decision

Do not create a separate feature family. Merge this as evidence into `CHAT-PROGRAMMATIC-SCROLL-ORIGIN` / chat scroll ownership because the underlying invariant is the same ownership boundary: user-originated browser scrolling must not be overwritten or misinterpreted by application-owned alignment/auto-follow work.

This extends that design with a distinct compatibility invariant: a bounded programmatic-scroll-origin marker is not enough if the settle path still writes the user's wheel position back into the browser's async scroll pipeline.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: current PocketRisu chat scroll-owner / auto-follow / wheel-settle audit and direct Firefox reproduction
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`
- Source evidence: `seto-sama/PocketRisu-Kei@4c93d174280480264add1749f6adf07314585903`
- Benefit: prevent stuck/sub-pixel wheel scrolling and unwanted bottom relatch during streaming while preserving programmatic auto-follow
- Conflict/risk: broad scroll suppression or unconditional pixel snapping can break legitimate user motion, pagination, bottom detection, or anchor correction
- Validation need: Firefox wheel regression with fractional `scrollTop`, late async publication after fallback settle, real user break-away from streaming auto-follow, plus Chrome/Samsung regression coverage
- Follow-up: keep `DESIGN_NEEDED`; inspect PocketRisu before code changes. If no comparable settle/writeback path exists, mark the source-specific mechanism `SUPERSEDED` while retaining the invariant.

## Backfill coverage

This bounded review inspected the 2026-08-15 PocketRisu-Kei history slice around commit `4c93d174...`. It does not establish complete source history coverage and does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.

Forward cursors were not changed in this run; all Active source HEADs matched their durable `Last reviewed HEAD` values.