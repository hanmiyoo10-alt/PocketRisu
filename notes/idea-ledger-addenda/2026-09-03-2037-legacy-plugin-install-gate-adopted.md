# Legacy plugin install gate — historical reclassification

Date: 2026-09-03
Feature-ID: `LEGACY-PLUGIN-INSTALL-GATE-DEFAULT-DENY`
Lifecycle status: `ADOPTED`

## Classification

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

- Upstream/base safety direction: `kwaroran/Risuai@839d190b` (V2.1 install retirement/default denial).
- PocketRisu adoption: `PocketRisu/PocketRisu@127b975dd8ba8fc6ec34c8e3048052b94a1fa47c` — new V2.1 installs/updates are blocked by default behind `allowV21Plugin`; the opt-in defaults false; already-installed V2.1 runtime loading remains unchanged; when opt-in is enabled the existing V2.1 code-safety check still runs.
- Current durable-tip evidence at `ca09a80746e74e5334145e5e78af47ce423e0eba`: `allowV21Plugin` remains exposed as an explicit advanced setting, defaults false in database initialization, and gates the V2.1 install/update path.

## Reclassification / dedupe

The older shared-backlog row `READY_TO_PORT | plugin security | Keep strong V3 APIs capability/permission-gated and explicitly retire unsafe legacy plugin install paths` bundled more than one security boundary. The legacy V2.1 install-retirement slice is no longer a port candidate: PocketRisu adopted it in `127b975d...`. Preserve the broader V3 capability/permission-gating family separately; do not treat this addendum as evidence that every V3 permission boundary is fully reviewed.

## Benefit

Default-deny prevents accidental installation or update of deprecated V2.1 plugins while retaining an explicit compatibility escape hatch for trusted legacy users. Keeping runtime loading of already-installed V2.1 plugins unchanged avoids turning the safety change into a surprise destructive compatibility migration.

## Conflict / risk

The opt-in is a deliberate compatibility exception. It must not bypass the V2.1 safety check, silently become enabled by default, or broaden into implicit permission for V2.0/V2.1 execution/install behavior beyond the documented boundary.

## Validation need

Preserve regression coverage or equivalent inspection proving: default false; new V2.1 install/update denied when false; install/update allowed only when true; safety check still executes when true; already-installed V2.1 runtime behavior is unchanged; V3 targeted reload remains unchanged.

## Follow-up

- Keep this slice `ADOPTED` and preserve it as a security invariant.
- When the main backlog is next structurally rewritten, split the old bundled plugin-security row so this V2.1 install-gate slice is `ADOPTED` instead of `READY_TO_PORT`.
- Continue separately auditing V3 capability/permission boundaries and legacy V2.0 behavior; do not infer adoption from this record alone.
