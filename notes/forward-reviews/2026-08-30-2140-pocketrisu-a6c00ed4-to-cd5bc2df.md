# Forward review: PocketRisu a6c00ed4 -> cd5bc2df

Source: `PocketRisu/PocketRisu:develop`
Previous cursor: `a6c00ed44aaf639b53f2195e58e9f670b24f079a`
Reviewed HEAD: `cd5bc2df14a83584405a417a756ebd15220fac4b`
Range: 15 commits, reviewed forward only.

## Meaningful findings

### SHELL-BREAKPOINT-REACTIVE-OWNERSHIP

Source: `fad12ba19287e0ef504e551b50aa144f3a3d3f0b`

The shell must react to width-mode transitions after boot, not treat `window.innerWidth` as a one-time initialization input. Sidebar state changes only when crossing the 1024px docked/overlay boundary, preserving user state for height-only mobile events and resizes within one mode. The 640px chat-toolbar grouping is also made reactive.

Classification:
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle: `READY_TO_PORT`
- Source evidence: official PocketRisu commit `fad12ba19287e0ef504e551b50aa144f3a3d3f0b` with focused breakpoint tests
- Benefit: prevents stale sidebar mode on foldable/split-screen/desktop resize while avoiding mobile keyboard/address-bar false resets
- Conflict/risk: a broad resize handler could overwrite user-toggled sidebar state; only breakpoint crossings may reset it
- Validation need: focused unit tests for first sample, same-mode resize, exact 1024/1025 crossing, plus UI check that toolbar grouping follows 640px changes
- Follow-up: candidate is safe by classification, but autonomous implementation is blocked in this runtime because a clean checkout/test run cannot be performed (`github.com` DNS resolution fails). Do not write production code without verification.

### CBS-SCRIPT-INTRODUCED-ASSET-HYDRATION (evidence merge)

Additional source: `41d83473b907d43a5f9798f1aa696f676486a7ca`.

The earlier display-path idea is strengthened: every prompt source that can reach the synchronous CBS parser must be scanned before prompt construction, including main/global prompts, character text, lorebooks, triggers, chat messages, persona prompt, module lorebooks/triggers, and prebuilt asset commands. Hydrate only missing manifests and normalize serialized whitespace so token names split by newline/tab are still detected.

Classification remains:
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `HIGH` (promoted from the earlier single-path evidence)
- Risk: `LOW`
- Dependencies: matching lazy asset-manifest architecture and parser hydration owner in the personal fork
- Priority: `P2`
- Lifecycle: `HOLD`
- Source evidence: `54813802f7b33ac437d097d3538b96087014fb82`, `41d83473b907d43a5f9798f1aa696f676486a7ca`
- Benefit: prevents asset-list CBS reaching the model unexpanded solely because no earlier UI path happened to warm the manifest cache
- Conflict/risk: broad eager hydration would erase the lazy-storage benefit; scan must be bounded to actual prompt sources and hydrate only required manifests
- Validation need: prompt-source coverage tests, whitespace-normalized token tests, cache-hit/no-round-trip checks, failure fallback behavior
- Follow-up: keep HOLD until the personal fork has the corresponding lazy-manifest architecture.

### EMBEDDED-MODULE-IDENTITY-AND-PLUGIN-ASSET-COMPAT

Sources: `1df37b5ab11e578896e390dbcd0478bc5e3b7b5b`, `e6e8ef040ec53ad132ecb572ada63538504079fa`, `2981235e49135b7e65849569a659e6954c91190d`.

Two related invariants became explicit. First, persona embedded modules share the sentinel id `$embedded`, so cache identity must include persona ownership or persona switching can serve the previous persona's module. Second, plugin compatibility hydration/write-back cannot use a small LRU as proof of what was handed to a plugin: LRU eviction is independent of snapshot ownership. Preserve a bounded fingerprint/identity of the handed-out list per manifest and compare write-back against that; unchanged data may restore the descriptor, while edited data must remain inline.

Classification:
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: lazy asset-manifest representation, explicit persona/module identity owner, plugin compatibility snapshot owner
- Priority: `P1`
- Lifecycle: `HOLD`
- Source evidence: official commits `1df37b5ab11e578896e390dbcd0478bc5e3b7b5b`, `e6e8ef040ec53ad132ecb572ada63538504079fa`, `2981235e49135b7e65849569a659e6954c91190d`
- Benefit: prevents cross-persona embedded-module cache bleed and prevents unchanged plugin write-back from accidentally inlining lazy assets after unrelated LRU eviction
- Conflict/risk: wrong identity/fingerprint logic can discard real plugin edits or retain stale compatibility state; bounded handed-out state must not become an unbounded memory leak
- Validation need: persona-switch cache tests; >LRU-capacity plugin database hydration then unchanged write-back; edited-list write-back after eviction; detached-copy/aliasing tests; failed hydration retains descriptor
- Follow-up: merge this evidence into `PLUGIN-LAZY-ASSET-COMPAT-SNAPSHOT`; keep implementation blocked until the personal fork gains the matching storage architecture.

## Cursor / backfill

Advance the official PocketRisu forward cursor to `cd5bc2df14a83584405a417a756ebd15220fac4b`. No cursor moved backward. This forward slice does not establish complete historical coverage for every active source, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
