# PLUGIN-STORAGE-FULL-HYDRATION-EXPLICIT-OPT-IN

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`

## Source evidence

- `PocketRisu/PocketRisu@cccaf9ee585279467c98d8a0bb61d04c1392c6d9`: added an explicit per-plugin compatibility toggle for full V3 `pluginCustomStorage` hydration, with store-size visibility and a large-store warning.
- `PocketRisu/PocketRisu@838b47e598210a565ed3c0aa1474fbf20e6d97d4`: tightened the rule so `getDatabase(includeOnly)` naming `pluginCustomStorage` does not itself trigger full hydration. Only the explicit per-plugin setting does. The commit records a concrete caller that named the field without using the values, where implicit hydration could copy hundreds of MB repeatedly.
- Reviewed tip `ca09a80746e74e5334145e5e78af47ce423e0eba` preserves this boundary.

## PocketRisu benefit

Keeps server-externalized plugin storage bounded by default while retaining a deliberate compatibility path for plugins that genuinely require an upstream-style full snapshot.

## Conflict / risk

Compatibility-only full hydration is intentionally expensive. Inferring it from field names or API shape can silently bypass the memory-pressure protections that motivated externalization.

## Validation need

Preserve regression coverage that default V3 database snapshots remain bounded, `includeOnly` alone does not enable full hydration, the explicit toggle does, disabling the toggle restores bounded behavior, and per-key reads remain the preferred path.

## Follow-up

`ADOPTED`: preserve this as an invariant when changing V3 compatibility, plugin storage ownership, or plugin settings UX. Any automatic hydration heuristic requires separate review and memory measurements.
