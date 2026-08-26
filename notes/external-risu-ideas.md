# Risu family idea backlog

Purpose: durable idea ledger for PocketRisu candidates and architectural lessons discovered across the Risu family. This is not a cherry-pick queue; every item must be re-evaluated against PocketRisu architecture and guardrails. PocketRisu itself is also a source: preserve successful invariants, reversions, regressions, and design lessons instead of only hunting external code.

## Sources

- `kwaroran/Risuai` (`main`) — upstream/base RisuAI
- `PocketRisu/PocketRisu` (`develop`) — official PocketRisu upstream; record both candidates and already-adopted lessons
- `nevaeh5379/HaejeokRisuai` (`main`)
- `rpaddict/RisuBard` (`main`)
- historical source retained for backfill only: `nevaeh5379/Risuai` (`dev`)

## Historical backfill

- 2026-08-26: backfilled the old `nevaeh5379/Risuai:dev` history beyond the original watch baseline, including commits at least through 2026-08-18, and deduplicated transferable ideas into this ledger.
- 2026-08-26: reviewed the visible `rpaddict/RisuBard:main` history back to its initial public source commit on 2026-08-17 and recorded PocketRisu-relevant architectural/safety ideas.
- 2026-08-26: seeded `kwaroran/Risuai:main` and `PocketRisu/PocketRisu:develop` as first-class sources. Initial scan captured current high-signal save/security/recovery lessons; older history remains eligible for bounded backfill.
- Backfill is evidence-oriented, not exhaustive code adoption. If later history inspection reveals an older distinct idea, add it without rewriting or deleting the prior record.

## Status labels

- `READY_TO_PORT` — small, well-bounded change that fits current PocketRisu architecture.
- `DESIGN_NEEDED` — promising, but needs adaptation or a feature-specific design first.
- `HOLD` — useful reference, but conflicts with current direction, duplicates planned work, or is not yet justified.
- `ADOPTED` — implemented in PocketRisu; preserve source attribution and resulting PR/commit reference.
- `SUPERSEDED` — no longer relevant because PocketRisu architecture changed or a better approach landed.

## Idea list

| Status | Area | Idea | Source evidence | PocketRisu benefit | Main risk / conflict | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| DESIGN_NEEDED | chat/mobile | Reset or aggressively bound the chat render window on character/chat switch | `nevaeh5379/Risuai` `c1067fcb`, `4a3d55ad`; later low-spec work `e48296e3` | reduce long-chat UI/memory spikes during switching | must preserve current navigation/state semantics and reject stale async selection completions | benchmark switch latency and retained DOM/messages; test rapid repeated switching |
| DESIGN_NEEDED | mobile/perf | Explicit low-spec / mobile-light mode with bounded render/cache budgets | `nevaeh5379/Risuai` `e48296e3`, `6ef9592e` | user-controlled memory/render pressure reduction | avoid divergent behavior that is hard to test | define exactly which budgets/features are gated and measurable targets |
| READY_TO_PORT | plugin safety | Persist plugin updates before targeted runtime reload | `nevaeh5379/Risuai` `3b5b3d39` | avoid update/reload races and lost state | preserve V3 targeted reload; no full-page reload regression | verify current update path and add regression test |
| DESIGN_NEEDED | image/cache | Character image thumbnail/preload optimization with bounded batch loading | `nevaeh5379/Risuai` `a3e52178`, `4c993a5c`, `7fce3d5a`, `0c6d67ca` | lower decode/cache/network pressure on mobile | stale cache / wrong-size asset reuse; cache ownership bugs | profile decode memory, cache hit rate, and batch size |
| READY_TO_PORT | image/cache | Pin actively rendered blob URLs and treat transient caller-owned URLs separately | `nevaeh5379/HaejeokRisuai` `08fe5fbc`, `666672df` | prevent visible images disappearing during bounded cache eviction while still reclaiming memory | leaked pins or double ownership can retain blobs indefinitely | audit current blob URL ownership and add eviction/pin lifecycle test |
| READY_TO_PORT | UI/perf | Lazy-load heavy sidebar/actions and expensive helpers on intent | `nevaeh5379/Risuai` `6ef9592e`, `9021c009` | reduce initial bundle parse/compile and startup jank | interaction latency on first open | identify largest lazy-loadable modules and measure first-use latency |
| READY_TO_PORT | save integrity | Persist user messages before model generation | `nevaeh5379/Risuai` `0fd90fcf` | reduce message-loss risk on generation failure/crash | must not reintroduce forced full DB flush patterns | inspect transaction/save ordering and test provider failure/cancel paths |
| DESIGN_NEEDED | memory | Idle-batched inactive-chat memory release | `nevaeh5379/Risuai` `9c5ef605`, `e48296e3` | reduce retained memory in ultra-long sessions | accidental release of still-referenced reactive state | heap profiling + ownership boundaries |
| DESIGN_NEEDED | long-chat | Active-chat message paging / compaction with absolute positions and non-destructive partial pages | `nevaeh5379/Risuai` `14be1584` | major long-chat memory/render reduction | high interaction with search/edit/navigation/plugin assumptions | prototype read window and compatibility matrix |
| READY_TO_PORT | storage UI/perf | Paginate large asset/file lists; fetch thumbnails only for active page; dedupe in-flight thumbnail requests | `nevaeh5379/Risuai` `58b980ca` | constant-size DOM and fewer thumbnail request storms on huge stores | cross-page selection and cache invalidation semantics | inspect PocketRisu asset/browser lists for unbounded rendering/fetches |
| DESIGN_NEEDED | asset integrity | Detect missing referenced assets and make orphan cleanup reference-aware/fail-safe | `nevaeh5379/Risuai` `1e4342cc`, `e46c9f29`; PocketRisu hardening `3b8b6401`, `3c6bdaf5` | prevent silent broken characters/modules and accidental deletion of live thumbnails/assets | reference discovery must be complete; false negatives are destructive | preserve fail-closed empty-reference refusal; expand reference tests whenever new asset domains appear |
| DESIGN_NEEDED | recovery | Revision diff + impact-aware dry-run restore before destructive rollback | `nevaeh5379/Risuai` `60489e18` | safer backup/revision recovery and easier diagnosis | potentially large scope; must align with PocketRisu save format and backup model | map current recovery surfaces and define minimal preview contract |
| DESIGN_NEEDED | I/O/perf | Stream large asset/backup payloads and batch DB writes instead of materializing giant buffers/JSON | `nevaeh5379/Risuai` `67bcfd47`, `eed465f8`, `a7fa3ee2` | lower peak memory and improve large backup/import/export reliability | streaming changes failure/rollback semantics | benchmark current peak RSS for large backup/asset operations |
| DESIGN_NEEDED | storage architecture | Domain-specific stores with explicit dirty marking and serialized commits | `nevaeh5379/Risuai` `4f848221`, `46f39645`, `d6899df1` | clearer mutation ownership, smaller commits, fewer persistence races | major architectural migration; may conflict with existing optimized patch path | borrow invariants/tests first, not architecture wholesale |
| DESIGN_NEEDED | startup/data | Defer heavy domains (personas, presets, lorebooks, modules, prompts, scripts) and hydrate on demand | historical `nevaeh5379/Risuai` `a91e9578` | smaller startup object graph and lower initial memory/IO | plugin/prompt code may assume synchronous fully hydrated DB | inventory synchronous consumers and identify safe deferred domains |
| DESIGN_NEEDED | cache/recovery | Explicit database recovery path plus cache reconciliation rather than assuming cache is authoritative | historical `nevaeh5379/Risuai` `15deee7e` | safer recovery after partial/corrupt cache state | recovery can overwrite newer state if revision identity is weak | define authoritative source/revision rules before implementation |
| DESIGN_NEEDED | server compute | Capability-aware Node chat execution boundary with exact provider/format support and browser fallback | `nevaeh5379/HaejeokRisuai` `73b3cdb6`, `d6891c88`, `db4fb3be`, `16e23121` and follow-ups | move selected expensive/network work off browser while preserving compatibility | server-side arbitrary URL/credential exposure; phone CPU/load; broad architecture change | only consider pinned providers and explicit capability negotiation; benchmark phone impact |
| DESIGN_NEEDED | chat/perf | Server-side token accounting/generation planning that returns kept indexes rather than prompt payload copies | `nevaeh5379/HaejeokRisuai` `d8d3aaa6`, `493f1267`, `fd39dba7` | reduce browser planning CPU and avoid sending duplicate large prompt bodies | tokenizer parity and server-phone load; protocol complexity | compare browser planning time vs server round-trip on long chats |
| DESIGN_NEEDED | architecture | Share runtime-neutral frontend/server contracts and pure chat policies instead of duplicating semantics | `nevaeh5379/HaejeokRisuai` `bf92c8fa`, `742cc2bb`, `3abae085` | fewer browser/server drift bugs and easier safe offload | refactor churn without immediate user benefit | adopt opportunistically when touching a duplicated contract |
| READY_TO_PORT | request safety | Bound retry/fallback state machines, including pathological content retries | `nevaeh5379/HaejeokRisuai` `807f33b1`, `f3fb11d2` | prevent unbounded retry loops and make fallback behavior testable | behavior changes may affect provider-specific retry expectations | audit PocketRisu retry loops and add hard upper-bound tests |
| DESIGN_NEEDED | narrative memory | Ground historical answers in detailed per-event evidence and preserve relations during canonical compression | `rpaddict/RisuBard` `c9ddb025`, `3c1fefb7`, `b06177c1`, `0b4772f6`, `38f0b7ab` | better long-chat factual recall without injecting all old history | extra memory/model cost and source-specific BardWiki architecture | extract evidence-selection principles; do not port BardWiki wholesale |
| READY_TO_PORT | narrative memory/perf | Skip unnecessary narrative-memory analysis when a turn cannot meaningfully change memory | `rpaddict/RisuBard` `6ceafaec` | reduce auxiliary model calls/latency/cost | false negatives may miss important state changes | inspect the gating predicate and reproduce with PocketRisu-specific tests before porting |
| DESIGN_NEEDED | cache integrity | Durable serialized cache manager with explicit key index, legacy reconciliation, validation, and conditional duplicate cleanup | `rpaddict/RisuBard` `9d9a30a4`, `31482fcc`, `f8e3e05b`, `ffab21cb`, `49945e62`, `e130f301`, `2d56f748`, `a4a34766` | safer cache cleanup/recovery without races or hidden orphan keys | extra metadata can itself become stale | apply pattern to caches that currently lack ownership/index invariants |
| DESIGN_NEEDED | file persistence | Crash-safe file-native writes with serialized mutation/log paths | `rpaddict/RisuBard` `26e6ff88`, `35a7a1a5` | reduce corruption on interruption/concurrent writes | RisuBard storage architecture differs strongly from PocketRisu | extract atomic-write/serialization invariants only |
| DESIGN_NEEDED | narrative memory | Scope memory/saved-chat state to the source chat with per-chat controls | `rpaddict/RisuBard` `88eb35d5`, `6488f0b1` | prevent cross-chat memory bleed and allow explicit per-chat behavior | changes user-visible memory semantics | map current plugin/memory ownership boundaries |
| DESIGN_NEEDED | narrative memory/recovery | Rebuild long-term memory in a staging workspace and atomically publish only after resumable batches complete | `rpaddict/RisuBard` `3ae4501b` (BardWiki reboot plan), related workspace hardening `e4e18589` | crash-safe reindex/rebuild without exposing half-written memory | complex job state, model cost, source-specific architecture | retain as design reference for any future PocketRisu memory rebuild tool |
| READY_TO_PORT | import safety | Await/serialize parallel imports so module assets cannot be lost by racing finalization | `rpaddict/RisuBard` `f27bb016`, `96a5350f` | safer bulk character/module imports | unnecessary serialization can slow imports | inspect current import concurrency and add race regression test |
| DESIGN_NEEDED | backup safety | Harden local backup restore with explicit server limits and validated recovery ordering | `rpaddict/RisuBard` `80fe8e15` | safer restore against malformed/oversized inputs | exact limits depend on PocketRisu formats and device capacity | compare existing restore validation/size caps |
| READY_TO_PORT | plugin security | Keep strong V3 APIs capability/permission-gated and explicitly retire unsafe legacy plugin install paths | base `kwaroran/Risuai` `26072043`, `839d190b` | reduce privilege surprises and legacy attack surface | compatibility impact for old plugins | compare PocketRisu V3 permission surface and legacy install behavior |
| DESIGN_NEEDED | parser/security | Restore transformed CSS only from call-scoped parsed elements/markers after sanitization, never by raw string reinsertion | base `kwaroran/Risuai` `5cc5bc05` | preserve rich character CSS while avoiding sanitizer-bypass regressions | parser behavior is security-sensitive and may differ in PocketRisu | audit PocketRisu markdown/style pipeline before copying any technique |
| HOLD | save architecture lesson | Do not replace snapshots with a reactive DB proxy unless write-side effects, descriptor writes, and self-subscription loops are proven safe | base `kwaroran/Risuai` revert `72ce7218` of incremental proxy layer | preserves a concrete failure lesson for future save optimization work | not a feature to port; a regression warning | require regression tests for effect loops, legacy descriptor writes, and settings mutations before similar refactors |
| ADOPTED | save integrity | Recompute current ETag when a precondition arrives and bump revision identity after side-channel manifest edits | official `PocketRisu/PocketRisu:develop` `b95d0fa7` | prevents stale full writes from rolling back newer plugin/manifest state after restart/cache invalidation | ETag semantics must stay consistent across all write paths | preserve as an invariant when #66/#74-style storage architecture evolves |
| ADOPTED | patch safety | Snapshot patch application safely and retain actionable patch-failure diagnostics | official PocketRisu `e2c6d157`; selective-clone work later reviewed in upstream PRs | safer rollback/diagnosis when patches fail | full structuredClone can be expensive on huge DBs | keep correctness invariant while optimizing cloning selectively |
| ADOPTED | server-phone / large DB | Spill SQLite VACUUM temp to disk and preflight enough free space instead of copying multi-GB DBs in RAM | official PocketRisu `f437a4c8` | avoids OOM during DB maintenance on constrained/self-host devices | disk-space estimation and temp path portability | preserve for any future optimize/compact command |
| ADOPTED | asset integrity | Orphan cleanup must include plugin-stored/legacy/specialized asset references and fail closed when reference discovery is suspect | official PocketRisu `3b8b6401`, `3c6bdaf5`, `729db6ad` | avoids destructive cleanup of live assets | every new asset-bearing feature can create a new hidden reference domain | add reference-discovery tests alongside new asset features |
| DESIGN_NEEDED | plugin storage / browser memory | Externalize large plugin storage from the main browser DB object and hydrate per key/on demand | official PocketRisu direction discussed around upstream #73/#74 | attacks browser OOM at the source instead of only speeding server saves | migration, compatibility hydration, GC, snapshot/value lifetime | measure lazy hydration, duplicate fetch/parse, snapshot GC and legacy export hydrate hot paths |
| HOLD | organization UX | Persona-scoped modules and collection-folder managers | `rpaddict/RisuBard` `9e2b5b26`, `0ffe502c`, `d922c28e` | potentially better organization for large libraries | product-level UX scope, not current performance/integrity priority | keep as reference until matching user need exists |

## Recording rules

For every newly discovered meaningful change from any source:

1. Add or update one deduplicated row rather than appending a duplicate idea.
2. Record source repository and commit SHA(s) in `Source evidence`.
3. Separate the transferable idea from source-specific implementation details.
4. Classify as `READY_TO_PORT`, `DESIGN_NEEDED`, `HOLD`, `ADOPTED`, or `SUPERSEDED` based on current PocketRisu architecture.
5. Preserve history when an item later becomes `ADOPTED` or `SUPERSEDED`.
6. Link PocketRisu PR/commit/feature dossier in `Follow-up` once implementation starts.
7. Historical scans must continue walking older unreviewed history when practical; do not assume the first automation cursor was the beginning of useful history.
8. Base RisuAI is upstream evidence, not automatic authority. PocketRisu is implementation evidence, not proof that the current design is final. Record reversions and regressions with the same care as successful features.
9. When the same idea appears in base RisuAI, PocketRisu, HaejeokRisuAI, and RisuBard, merge the evidence into one row and note architectural differences rather than creating four copies.

## PocketRisu guardrails

- Do not reintroduce forced full DB flush on `visibilitychange` / `pagehide`.
- Keep `flushServerDbKeepalive()` no-op unless separately and explicitly reviewed.
- Preserve existing incremental hash / selective clone / opaque-ETag-related save safety decisions unless a newer feature explicitly replaces them safely.
- Preserve targeted V3 plugin reload.
- Keep runit; do not introduce PM2.
- Server phone must not create Android notifications.
- External architecture is reference material, not authority: prefer measured PocketRisu-specific evidence before porting.
