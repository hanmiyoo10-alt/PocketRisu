# Historical backfill — PocketRisu-kotono root scroll / iOS keyboard regression

Date: 2026-08-28
Source: `Nagase-Kotono/PocketRisu-kotono`
Evidence commit: `37ef6e3b4215d52d580e95a23b11e6ff3afdcad5`
Source branch: `main`
Forward cursor: unchanged at `1fa0294df185910c45606dfd678c490b1793ebcb`

## Idea / invariant

Do not solve chat/root displacement by globally clamping `documentElement.scrollTop/scrollLeft` on every root-targeted scroll. On iOS the on-screen keyboard may legitimately scroll the root/visual viewport to keep the focused composer visible; a global clamp can race that browser behavior and produce input oscillation. App-owned bookmark/search/message jumps should instead target the actual chat scroll container and avoid `scrollIntoView` paths that can climb to the document root.

This is a regression lesson, not a request to copy the source patch blindly. The source explicitly notes that removing the global clamp restored iOS keyboard behavior while reopening a separate Chrome/Edge desktop root-displacement failure mode, so those two concerns need separate ownership and validation.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: current PocketRisu mobile-keyboard/root-scroll reproduction and chat-jump scroll-owner audit
- Priority: `P0`
- Lifecycle status: `HOLD`
- Source evidence: `Nagase-Kotono/PocketRisu-kotono` `37ef6e3b4215d52d580e95a23b11e6ff3afdcad5`; commit removes `installRootScrollGuard()` and keeps container-scoped `scrollWithinContainer` behavior
- Benefit: avoid iOS keyboard lift/snap-back oscillation while preserving bounded ownership for app-driven chat jumps
- Conflict/risk: simply removing/clamping root behavior can trade the mobile bug for the previously observed Chrome/Edge root-displacement bug; custom CSS/plugin DOM may also inflate the root
- Validation need: iOS keyboard typing/focus regression; rapid composer typing; visualViewport resize; bookmark/search/message jumps; Chrome/Edge long-response root displacement; plugin/custom-CSS inflated-root case
- Follow-up: only promote to `DESIGN_NEEDED` if current PocketRisu reproduces either root-displacement or keyboard oscillation, then solve the two failure modes with separate container/viewport ownership rather than a universal root clamp

## PocketRisu inspection

Repository code search did not find `rootScrollGuard`, `scrollWithinContainer`, or the exact `scrollToMessage` symbols in `hanmiyoo10-alt/PocketRisu` during this pass. That is insufficient evidence to claim the regression exists or is already fully adopted. Therefore no source mutation, branch, or PR is justified.

## Historical coverage

This bounded page of `PocketRisu-kotono` history reaches at least 2026-06-14. It is not proof of complete repository history coverage, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` must not advance from this review alone.
