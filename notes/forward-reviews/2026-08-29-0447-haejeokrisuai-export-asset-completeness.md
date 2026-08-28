# Forward review — HaejeokRisuai export completeness

Reviewed forward range: `9729880ef9b4da7887e790c7ba7f2e294db1bacc..866de33e1ed579f31d2ceba95a20cf626e9d2a99`.

## Source evidence

- `nevaeh5379/HaejeokRisuai@866de33e1ed579f31d2ceba95a20cf626e9d2a99`
  - `createBaseV3()` now guarantees the required `icon/main` asset independently of whether `emotionImages` is missing, empty, or populated.
  - regression tests cover missing and empty `emotionImages`.
  - chat export now hydrates the selected character/chat before serialization and re-resolves stable identity after awaited hydration instead of trusting a stale array position.

## Meaningful ideas

### Export required-asset completeness

Classification:
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: PocketRisu currently does not expose the upstream RisuAI character-card export owner in this server-oriented repository; direct applicability requires an owned frontend/export surface.
- Priority: `P1`
- Lifecycle: `HOLD`

Benefit: required portable-format assets must not be conditionally emitted only because an optional sibling collection happens to be present. This prevents structurally incomplete V3 character exports for characters without emotion images.

Conflict/risk: blindly adding frontend-specific code to PocketRisu would violate ownership boundaries; treat this as an export-format invariant unless/until PocketRisu owns the corresponding character-card exporter.

Validation need: if an owned exporter appears, add fixtures for missing/empty optional asset collections and assert the required main icon is still packaged exactly once.

Follow-up: preserve as a format-integrity lesson; no autonomous implementation because the matching PocketRisu owner is absent.

### Complete export snapshot evidence merge

The same commit independently reinforces `STORAGE-DEFERRED-DOMAIN-COMPLETE-SNAPSHOT`: chat export must hydrate authoritative character/chat/message state before serialization, and async hydration invalidates pre-await positional identity assumptions. Merge this evidence into the existing design rather than creating a duplicate idea.

## Cursor decision

Advance only HaejeokRisuai forward cursor to `866de33e1ed579f31d2ceba95a20cf626e9d2a99`. Other active sources checked in this run remained at their recorded cursors. Historical coverage marker is unchanged.