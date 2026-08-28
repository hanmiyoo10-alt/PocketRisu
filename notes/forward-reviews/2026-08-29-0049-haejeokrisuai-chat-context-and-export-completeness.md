# Forward review — HaejeokRisuai chat context + export completeness

Reviewed source: `nevaeh5379/HaejeokRisuai:main`

Authoritative prior cursor: `46d5959862aec7a19d57e04e1721cea13222c038`
Reviewed through: `f982424e9dc542c4fed013f66fd5642593c53a3e`
Range status: ahead by 4 commits; cursor only moves forward.

## Commits reviewed

- `fdd175297d23a1cd83e7e0484f04d0dbecf5c431` — load deferred chat-message batches before character export so exports cannot silently omit unloaded messages; native SQLite and web SQLite paths both covered by tests.
- `c1289a3b9a5515fd9ae689270d92d961d77538ac` — pass explicit target chat context into module lorebook and Lua trigger evaluation instead of implicitly reading the currently selected chat.
- `8d192f3dfe3f51ca3f63b49805c8567289391e50` — derive the effective chat target from indexes when a caller does not pass an explicit target, avoiding accidental fallback to unrelated current-chat context.
- `f982424e9dc542c4fed013f66fd5642593c53a3e` — snapshot/restore chat-scoped Lua state, global variables, and local-variable mode together with branch messages; legacy branches lacking snapshots keep current script state rather than being overwritten by invented defaults.

## Deduplication / classification decisions

### Existing idea evidence merge: complete persistence snapshots

`fdd175297...` is additional evidence for the existing `STORAGE-DEFERRED-DOMAIN-COMPLETE-SNAPSHOT` design. It generalizes the same invariant already observed for deferred plugin data: an export/backup owner must explicitly hydrate required deferred domains before serialization. No duplicate idea created.

Classification remains:

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: identify PocketRisu complete-snapshot/export owners and deferred-domain authority
- Priority: `P1`
- lifecycle status: `DESIGN_NEEDED`
- Source evidence: HaejeokRisuai `391c2574df6170dd91a5e68624ae8c9b5afb6be1`, `fdd175297d23a1cd83e7e0484f04d0dbecf5c431`
- Benefit: prevents logically incomplete exports/backups when message/plugin domains are only partially hydrated in runtime memory
- Conflict/risk: completeness mistakes can silently lose user data in portable exports; hydrate-all shortcuts can regress memory
- Validation need: shallow-runtime fixture, complete-export equivalence, hydration failure must fail closed, native/web parity
- Follow-up: keep design-only until PocketRisu snapshot owner and authoritative deferred reads are mapped

### New idea: explicit target-chat execution context + branch-scoped script-state ownership

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: PocketRisu must have or introduce non-active-chat/branch execution semantics; map current module/lore/script context ownership before any port
- Priority: `P1`
- lifecycle status: `DESIGN_NEEDED`
- Source evidence: HaejeokRisuai `c1289a3b9a5515fd9ae689270d92d961d77538ac`, `8d192f3dfe3f51ca3f63b49805c8567289391e50`, `f982424e9dc542c4fed013f66fd5642593c53a3e`
- Benefit: prevents triggers, module lore, globals, and script state from being evaluated against the wrong chat when acting on a background/branch target
- Conflict/risk: introducing explicit target plumbing broadly can create dual-source-of-truth bugs if legacy callers still read global current-chat state; branch snapshots can become stale or overwrite newer state
- Validation need: target/current divergence tests, branch switch round-trips, legacy branch compatibility, rapid target switching, stale async completion rejection
- Follow-up: assistant-owned design dossier; no implementation until a concrete PocketRisu owner/substrate exists and tests can reproduce the boundary

## Guardrail check

No proposal changes visibility/pagehide flush behavior, `flushServerDbKeepalive()`, save/integrity optimizations, targeted V3 reload, runit, PM2 policy, or server-phone notification behavior.

## Cursor action

Advance only `nevaeh5379/HaejeokRisuai:main` to `f982424e9dc542c4fed013f66fd5642593c53a3e` after durable review records are written. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unaffected by this forward-only review.