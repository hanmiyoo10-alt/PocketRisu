# Historical backfill review — plugin update user-state preservation

Reviewed source: `PocketRisu/PocketRisu`

Evidence slice:
- `c81938a487887953cdbd3b82a84178fee3edbbf3` — preserve plugin argument values for declarations that remain same-type; automatic update preserves disabled state.
- `89fc53db9383e46d43ad3662b750341630a8ff35` — compare `string[]` option-list declaration types by ordered contents rather than array identity.
- Current reviewed durable tip `ca09a80746e74e5334145e5e78af47ce423e0eba` still contains `sameArgType(...)`, same-type `realArg` carry-over, and automatic-update `enabled` preservation.

Canonical Feature-ID: `PLUGIN-UPDATE-PRESERVES-USER-STATE`.

Result: ADOPTED invariant, normalized into the current classification schema in `notes/idea-ledger-addenda/2026-09-04-0645-plugin-update-preserves-user-state.md`. The V2 preload-alert portion of `89fc53db...` was deliberately excluded from this Feature-ID to avoid conflating plugin update state with storage-preload outage behavior.

Forward cursors were not moved. `PocketRisu/PocketRisu:develop` remains on the previously recorded rewind lineage, so its durable cursor remains `ca09a80746e74e5334145e5e78af47ce423e0eba`.

This bounded slice alone does not prove complete reviewed coverage for every tracked source, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
