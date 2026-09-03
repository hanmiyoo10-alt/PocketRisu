# PocketRisu historical backfill — explicit full plugin-storage hydration opt-in

Reviewed `PocketRisu/PocketRisu` plugin-storage compatibility history around `cccaf9ee585279467c98d8a0bb61d04c1392c6d9` and follow-up `838b47e598210a565ed3c0aa1474fbf20e6d97d4`.

Meaningful invariant: whole-store V3 compatibility hydration must not be inferred from `includeOnly` or other API-shape hints. It is an explicit per-plugin compatibility choice because the server-externalized store can be very large and a full snapshot is copied into the plugin execution environment.

Current reviewed tip `ca09a80746e74e5334145e5e78af47ce423e0eba` preserves the explicit toggle and bounded default behavior. Canonical ledger: `notes/idea-ledger-addenda/2026-09-04-0431-plugin-storage-full-hydration-explicit-opt-in.md`.

No implementation work was required because the invariant is already adopted. This bounded slice does not prove complete historical coverage for all tracked sources, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
