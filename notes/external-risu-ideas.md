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
| DESIGN_NEEDED | server compute | Capability-aware Node chat/memory execution boundary with exact provider/format support and browser fallback | `nevaeh5379/HaejeokRisuai` `73b3cdb6`, `d6891c88`, `db4fb3be`, `16e23121`, `1d4b0c5c` and follow-ups | move selected expensive/network/memory-orchestration work off browser while preserving compatibility | server-side credential exposure; authenticated session isolation; phone CPU/load; broad architecture change | only consider pinned providers and explicit capability negotiation; benchmark phone impact and validate session isolation/cancel paths |
| DESIGN_NEEDED | server retrieval/cache | Bound and scope repeated Hypa query embeddings; coalesce identical in-flight requests with clear-safe epochs | `nevaeh5379/HaejeokRisuai` `59c4eb7a`, `3a192633` | avoid duplicate embedding calls/latency for repeated or concurrent retrieval queries while bounding RAM | cross-session/provider/credential reuse would be a privacy bug; cache-clear races can resurrect stale entries | only after a Node Hypa boundary exists; test scope/provider fingerprints, eviction, concurrent joins, clear races, and no-cache fallback |
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
| DESIGN_NEEDED | server retrieval/cache | Persist validated Node vector indexes across restarts with bounded disk LRU and lazy restore | `nevaeh5379/HaejeokRisuai` `d23a24a6`, graceful-write evidence `3a192633` | avoid re-embedding/rebuilding unchanged retrieval indexes after server restarts; lower restart recovery latency/cost | stale/corrupt/private embedding cache, disk growth, revision/signature mismatch, backup/export semantics | prototype as disposable derived cache only; measure restart reuse, shutdown flush, and corruption/invalidation behavior |
| HOLD | diagnostics/storage | Authenticated read-only browser/Node SQLite explorer with pagination and explicit backend capability checks | `nevaeh5379/HaejeokRisuai` `c19d5bfb` | make storage migrations/corruption/cache debugging observable without raw shell access | can expose sensitive DB contents; write-capable explorer would have too much blast radius | keep read-only/admin-scoped; require redaction/authorization and no mutation path before reconsidering |
| HOLD | organization UX | Persona-scoped modules and collection-folder managers | `rpaddict/RisuBard` `9e2b5b26`, `0ffe502c`, `d922c28e` | potentially better organization for large libraries | product-level UX scope, not current performance/integrity priority | keep as reference until matching user need exists |

## Normalized classification overlays

This section progressively backfills the common schema without deleting the historical compact rows above. It is authoritative when it names an existing idea.

### NO_SYSTEM_UPDATE

#### P1 — Scoped Hypa query embedding cache + in-flight coalescing

- Lifecycle: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai` `59c4eb7a8881e335d12fc49c627436dd689301bc`, `3a192633716f42ffa5a557de08ad99189568b668`.
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: PocketRisu must first have an authenticated Node Hypa/vector execution boundary; provider/credential fingerprint contract; session-scope identity; server-phone embedding workload measurement.
- Priority: `P1`
- PocketRisu benefit: repeated and concurrent memory-retrieval queries can reuse or join one embedding request, lowering provider calls, latency, and server work while bounding RAM with entry/byte limits.
- Main conflict/risk: an incorrect key or scope can leak derived information across users/providers; cache clears must not allow stale in-flight work to repopulate state. High risk means this remains blocked despite low implementation difficulty.
- Validation need: prove no cross-scope/provider/credential reuse; concurrent identical calls coalesce; clear increments an epoch so old work cannot repopulate/rejoin; bounds evict correctly; provider failures reject all waiters cleanly; disabling cache preserves prior results.
- Follow-up: design-only sub-slice of the Node Hypa boundary; do not implement independently of the execution/session contract.

Design draft:
- Problem/evidence: HaejeokRisuai shows bounded per-scope LRU query embeddings and, one commit later, in-flight request joining plus epoch-based invalidation with concurrency tests. Evidence is credible code-level behavior but not yet PocketRisu workload evidence.
- Minimal safe scope: cache only query embeddings for one explicitly supported Node Hypa provider path; no document/source-memory caching and no persistence in the first slice.
- Ownership boundaries: Node executor owns transient derived vectors; authenticated session scope and provider configuration define reuse boundaries; authoritative chats/memory remain outside the cache.
- Proposed mechanism: key by scope + normalized provider/model + one-way credential fingerprint + query text; cap both entries and bytes; coalesce only matching in-flight keys from the same current cache epoch; cache clear advances the scope epoch and removes metrics/entries without cancelling unrelated fresh requests.
- Compatibility/invariants: cache miss/disabled cache is behaviorally identical to current execution; no durable data semantics change; no cross-scope reuse; clear cannot resurrect stale entries; cancellation/failure never commits partial durable memory state.
- Acceptance criteria: deterministic result parity with cache disabled; one backend request for N concurrent identical queries; stale pre-clear request cannot repopulate or be joined after clear; hard memory bounds hold; failures fan out without leaked in-flight entries.
- Risk/blast radius: privacy/session isolation is the main high-risk boundary; contain it by making reuse scope explicit and keeping the feature transient and disableable.
- Rollback/fallback: feature flag/config can disable query caching/coalescing and fall back to direct embedding calls with no migration.
- PR decomposition: (1) cache-key/scope invariants + tests, (2) bounded LRU, (3) in-flight coalescing + clear epoch race tests, (4) metrics only after authorization/redaction review.

#### P2 — Node-owned Hypa memory orchestration boundary

- Lifecycle: `DESIGN_NEEDED`
- Existing idea: `Capability-aware Node chat/memory execution boundary with exact provider/format support and browser fallback`
- Source evidence: `nevaeh5379/HaejeokRisuai` `1d4b0c5c783b3f4ef5738c21a17192c07a6f3cbb` plus earlier Node execution evidence already listed in the compact row.
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `HIGH`
- Size: `L`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: explicit Node capability negotiation; authenticated session-scope/security review; PocketRisu long-chat benchmark; provider/embedding compatibility matrix; server-phone resource budget.
- Priority: `P2`
- PocketRisu benefit: move summarization planning, token budgeting, memory selection, embedding/vector work, and similarity ranking out of the browser on Node deployments, reducing browser long-chat CPU/memory pressure while keeping web/Tauri fallback.
- Main conflict/risk: broad browser/server ownership shift; credentials and arbitrary-provider exposure; stale/cross-session continuation; cancellation/failure parity; server-phone CPU/RAM pressure. `Risk: HIGH` means this is not execution-ready despite priority.
- Validation need: reproduce a long-chat Hypa workload on PocketRisu; compare browser main-thread time, peak browser memory, Node RSS/CPU, latency, and model/embedding parity; test rapid cancel/restart, cross-session isolation, unsupported provider fallback, and old-server fallback.
- Follow-up: investigation/design only until evidence is strong enough for the risk and all blockers are resolved.

Design draft:
- Problem/evidence: HaejeokRisuai demonstrates a full Node-owned Hypa executor with authenticated start/continue/cancel and browser fallback; evidence is credible external code/tests but not yet PocketRisu measurement.
- Minimal safe scope: first offload only pure memory planning/vector ranking for one explicitly supported embedding/provider path; keep client execution as fallback and do not move general arbitrary provider execution in the first slice.
- Ownership boundaries: browser owns UI/reactive state and unsupported-runtime capabilities; Node owns an authenticated, session-scoped compute job with explicit capability/version handshake; durable DB/save ownership remains unchanged.
- Mechanism: negotiate server capability, submit immutable job inputs plus revision identity, return compact results/kept indexes, require session token on continuation/cancel, and fall back on any capability/version mismatch.
- Compatibility/invariants: no forced DB flush; no change to `flushServerDbKeepalive()`; targeted V3 reload untouched; web/Tauri/older Node remain functional; cancellation must not commit partial memory state.
- Acceptance criteria: same selected memories/tokens within defined parity tolerance; no cross-session access; unsupported capability falls back; cancel leaves no durable partial write; browser main-thread/memory improves without unacceptable Node-phone regression.
- Rollback/fallback: feature/capability gate defaults off; client path remains intact; disabling the server capability must restore prior behavior with no migration.
- PR decomposition: (1) capability/session contract + tests, (2) one pure planning/ranking operation, (3) benchmark/telemetry, (4) only then consider broader Hypa orchestration.

#### P2 — Persistent derived vector-index cache

- Lifecycle: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai` `d23a24a6ec747dcf21f671a095da9dedd60c3356`, shutdown-flush follow-up `3a192633716f42ffa5a557de08ad99189568b668`.
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: Node vector-index path must exist in PocketRisu; define authoritative revision/signature identity; choose derived-cache location excluded from user backup/export; measure server-phone disk budget and restart rebuild cost.
- Priority: `P2`
- PocketRisu benefit: reuse unchanged embeddings/indexes after Node restart instead of rebuilding every document vector, reducing restart recovery latency, embedding calls, and CPU work.
- Main conflict/risk: a stale or corrupt cache must never become authoritative; embeddings may contain sensitive derived information; disk pruning and backup/export behavior must be explicit.
- Validation need: benchmark cold rebuild vs warm restore; corrupt/truncate cache files; change revision/signature; exceed disk cap; restart during write; graceful SIGINT/SIGTERM with pending debounced writes; verify permissions and that cache exclusion does not hide user-authored source data.
- Follow-up: design/prototype as disposable cache only; do not couple it to DB/save integrity semantics.

Design draft:
- Problem/evidence: HaejeokRisuai persists metadata separately from Float32 payloads, uses atomic temp-write+rename, lazy restore, signature/revision validation, private permissions, hashed filenames, bounded disk LRU, and now explicitly flushes pending vector snapshots during graceful shutdown. This is strong implementation evidence but not yet PocketRisu workload evidence.
- Minimal safe scope: persist only a single existing Node retrieval index family as a disposable derived artifact; no migration of source data and no effect on browser/Web paths.
- Ownership boundaries: authoritative documents/revisions stay in normal PocketRisu storage; the server cache owns only recomputable embeddings/index metadata under an internal cache directory.
- Mechanism: key cache files by opaque hash; encode version + index id + revision + dimension + per-entry signature metadata plus binary Float32 payload; atomic write+fsync+rename; lazy load; reject on any format/revision/signature/size mismatch; bounded disk LRU; flush pending debounced snapshots on orderly shutdown only after new work is stopped.
- Compatibility/invariants: cache miss/corruption is equivalent to no cache; save/backup/export correctness cannot depend on cache presence; existing save/integrity optimizations untouched; cache files are not user assets.
- Acceptance criteria: warm restart reuses unchanged vectors; any revision/signature change rebuilds affected data; malformed/truncated/oversized cache is ignored safely; disk cap prunes oldest derived entries; graceful shutdown flushes pending derived writes without prolonging hard-failure recovery requirements; cache removal causes only performance loss.
- Risk/blast radius: confined to Node retrieval performance if the cache is strictly non-authoritative; privacy requires restrictive permissions and no accidental exposure through asset/file APIs.
- Rollback/fallback: delete/disable the cache directory and fall back to in-memory rebuild; no DB migration or rollback step required.
- PR decomposition: (1) cache format/validation helpers + corruption tests, (2) one index persistence integration + warm/cold benchmark, (3) disk LRU/permissions + shutdown flush, (4) optional expansion to other vector users.

#### P2 — Read-only storage explorer for diagnostics

- Lifecycle: `HOLD`
- Source evidence: `nevaeh5379/HaejeokRisuai` `c19d5bfb5c91ca2a9fed8c1f08475d726ac70e42`.
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `LOW`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: authenticated/admin-only access contract; sensitive-column redaction policy; read-only backend capability; explicit prohibition on mutation APIs.
- Priority: `P2`
- PocketRisu benefit: easier inspection of WASM/OPFS/Node SQLite tables when debugging migrations, storage regressions, cache ownership, or import/export integrity.
- Main conflict/risk: raw DB browsing can expose secrets or private chat/plugin data; turning it into a generic editor would create unnecessary persistence risk.
- Validation need: prove all operations are read-only; pagination/search are bounded; unauthorized contexts cannot open endpoints; sensitive values are redacted or explicitly gated.
- Follow-up: retain as diagnostics reference only; not a current implementation priority.

### SYSTEM_UPDATE_REQUIRED

No new system-update candidate was found in the 2026-08-26 forward review. Current HaejeokRisuai changes are application/server-code changes and do not require OS/runtime/service-manager migration.

## Forward review log

- 2026-08-26: `nevaeh5379/HaejeokRisuai:main` advanced from `d23a24a6ec747dcf21f671a095da9dedd60c3356` to `c19d5bfb5c91ca2a9fed8c1f08475d726ac70e42`. Reviewed exactly three new commits: `59c4eb7a8881e335d12fc49c627436dd689301bc` (bounded scoped Hypa query cache + vector-cache controls), `3a192633716f42ffa5a557de08ad99189568b668` (in-flight query coalescing, clear-safe epochs, graceful persistent-vector write flush), and `c19d5bfb5c91ca2a9fed8c1f08475d726ac70e42` (browser SQLite explorer). Added one blocked P1 design candidate, strengthened the persistent-vector-cache design, and retained the explorer as P2/HOLD diagnostics evidence. Registry cursor advanced to `c19d5bfb5c91ca2a9fed8c1f08475d726ac70e42`.
- 2026-08-26: prior forward pass reviewed `nevaeh5379/HaejeokRisuai:main` from `2ee2ef86065eb0037590317f1950fe389144af02` to `d23a24a6ec747dcf21f671a095da9dedd60c3356`, covering `1d4b0c5c783b3f4ef5738c21a17192c07a6f3cbb` (Node-owned Hypa memory orchestration) and `d23a24a6ec747dcf21f671a095da9dedd60c3356` (persistent server vector indexes).
- 2026-08-26: `rpaddict/RisuBard`, `kwaroran/Risuai`, `kwaroran/Risuai-Next`, `PocketRisu/PocketRisu:develop`, and `TripleHwang/RisuVault` were rechecked at their registered heads during this pass. No cursor changes were needed for those confirmed sources; remaining low-traffic active sources retain their previous cursors pending the next bounded verification pass.
- Historical backfill milestone did not advance in this pass; forward traffic took precedence and several active sources still lack proven complete pre-2026-08-26 coverage.

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
