# Common idea classification rules

This is the shared classification policy for PocketRisu/Risu-family idea backlogs. Apply it to newly discovered ideas and progressively backfill older entries. It is a decision aid, not permission to bypass PocketRisu guardrails, feature dossiers, review, or validation.

## 1. Primary grouping: system update impact

Every idea belongs to exactly one top-level group.

- `NO_SYSTEM_UPDATE` — can be implemented without changing the operating system, system packages, runtime/service manager, device-wide configuration, deployment substrate, or other host-level dependencies.
- `SYSTEM_UPDATE_REQUIRED` — requires or materially depends on an OS/package/runtime/service/device/deployment update or migration.

This is a grouping dimension, not an automatic quality score. Keep the two groups visibly separate so low-risk app changes are not mixed with host/device migrations.

## 2. Importance

- `HIGH` — protects data/security/correctness, prevents crashes/OOM or serious regressions, removes a demonstrated major bottleneck, or substantially improves a core long-chat/mobile/self-host workflow.
- `MEDIUM` — meaningful reliability/performance/UX improvement, but not a major correctness or survival issue.
- `LOW` — convenience, polish, niche optimization, or speculative improvement without strong evidence yet.

When evidence is weak, prefer the lower importance until measurements justify promotion.

## 3. Difficulty

- `LOW` — bounded change with clear ownership, limited compatibility surface, straightforward tests, and little migration risk.
- `MEDIUM` — multiple modules or state boundaries, non-trivial compatibility/testing, or moderate migration/concurrency implications.
- `HIGH` — architecture/storage/protocol migration, broad state ownership changes, security-sensitive parsing, device/runtime changes, or difficult rollback/compatibility requirements.

Difficulty means engineering/validation risk, not lines of code alone.

## 4. Size

- `XS` — tiny localized change or guard/test.
- `S` — small feature/fix, usually one narrow subsystem.
- `M` — several related modules or a contained subsystem change.
- `L` — broad feature or migration touching several subsystems.
- `XL` — architecture-scale program that should normally be decomposed before implementation.

Prefer decomposing `L`/`XL` ideas into independently useful, testable slices.

## 5. Priority ordering

The main rule is: **higher importance first, then lower difficulty, then smaller size.**

Canonical matrix:

- `P0` — `HIGH` importance + `LOW` difficulty.
- `P1` — `HIGH` + `MEDIUM`, or `MEDIUM` + `LOW`.
- `P2` — `HIGH` + `HIGH`, `MEDIUM` + `MEDIUM`, or `LOW` + `LOW`.
- `P3` — `MEDIUM` + `HIGH`, or `LOW` + `MEDIUM`.
- `P4` — `LOW` + `HIGH`.

Within the same priority class, sort by size `XS` → `S` → `M` → `L` → `XL`. After that, prefer stronger measured evidence, fewer dependencies, and easier rollback.

`SYSTEM_UPDATE_REQUIRED` and `NO_SYSTEM_UPDATE` should normally be shown as separate sections; apply the same P0–P4 ordering inside each section. Do not silently promote a system update merely because it is technically easy.

## 6. Required fields for every idea

Every backlog item should carry these fields, either as columns or an equivalent structured block:

- `System impact`: `NO_SYSTEM_UPDATE` / `SYSTEM_UPDATE_REQUIRED`
- `Importance`: `HIGH` / `MEDIUM` / `LOW`
- `Difficulty`: `LOW` / `MEDIUM` / `HIGH`
- `Size`: `XS` / `S` / `M` / `L` / `XL`
- `Priority`: `P0`–`P4`
- existing lifecycle status: `READY_TO_PORT`, `DESIGN_NEEDED`, `HOLD`, `ADOPTED`, or `SUPERSEDED`
- source evidence and commit SHA(s)
- expected PocketRisu benefit
- main risk/conflict
- validation evidence or measurement needed
- follow-up / implementation reference when applicable

If an estimate is uncertain, mark it explicitly and refine it after inspection rather than inventing certainty.

## 7. Assistant-owned design draft

For promising ideas, especially `DESIGN_NEEDED`, the assistant should proactively draft the design instead of waiting for the user to specify every implementation detail. A useful design draft should include:

1. **Problem/evidence** — what measured or observed problem is being solved.
2. **Minimal safe scope** — the smallest useful slice that can land independently.
3. **Affected ownership boundaries** — browser/client, shared code, server, plugin storage, DB, deployment/device, etc.
4. **Proposed mechanism** — enough detail to evaluate correctness, without blindly copying source architecture.
5. **Compatibility/invariants** — existing behavior and PocketRisu guardrails that must remain true.
6. **Validation plan** — tests, benchmark/heap/RSS/latency metrics, failure cases, and acceptance criteria.
7. **Rollback/fallback** — how to disable or revert safely if the change misbehaves.
8. **Dependencies and decomposition** — prerequisite work and smaller PR slices when appropriate.

A design may move an item from `DESIGN_NEEDED` to `READY_TO_PORT` only after its important assumptions are resolved and validation is concrete.

## 8. Shared PocketRisu guardrails

Classification never overrides project safety rules. In particular:

- do not reintroduce forced full DB flush on `visibilitychange` / `pagehide`;
- keep `flushServerDbKeepalive()` no-op unless separately and explicitly reviewed;
- preserve current save/integrity optimizations unless explicitly and safely superseded;
- preserve targeted V3 plugin reload;
- keep runit and do not introduce PM2;
- server phone must not create Android notifications;
- external Risu variants are evidence sources, not automatic authority.

## 9. Backfill rule

Existing idea lists should be progressively normalized to this schema. Do not discard historical entries merely because their old classification is incomplete. Add the new dimensions, re-rank them, and preserve source/history/status references.