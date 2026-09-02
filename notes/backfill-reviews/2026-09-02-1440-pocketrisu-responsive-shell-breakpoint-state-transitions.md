# PocketRisu historical review — responsive shell breakpoint state transitions

Reviewed source: `PocketRisu/PocketRisu:develop`

Commit: `fad12ba19287e0ef504e551b50aa144f3a3d3f0b` (`fix(gui): follow the shell breakpoint after boot (#79)`)

## Problem / evidence

The app shell has two ownership modes around the 1024px breakpoint: a docked sidebar on wide layouts and an overlay sidebar on narrow layouts. Before this fix, the open/closed sidebar state was chosen once at boot even though the responsive shell mode itself kept tracking resizes. Foldables, split-screen windows, or resized desktop windows could therefore cross the breakpoint while retaining state from the previous mode: an overlay could remain open over chat after moving narrow, or the docked sidebar could remain hidden after moving wide.

The same commit also replaced a mount-time `window.innerWidth >= 640` toolbar check with a reactive media query, showing the broader failure mode: layout mode decisions that are expected to track viewport transitions cannot be represented by one-time width samples.

Direct upstream regression tests cover first-sample behavior, no-op resize inside one mode, exact 1024/1025 breakpoint transitions, and the expected close-on-narrow/open-on-wide result.

## Transferable invariant

Responsive shell state should be recomputed only when the viewport crosses a semantic layout-mode boundary, not on every resize event. Crossing the boundary may reset mode-owned shell state to the same default a fresh boot at that width would choose; width changes that stay within the same mode must preserve user-owned toggles.

Height-only or fixed-width events such as mobile keyboard changes, address-bar collapse, and tab/page lifecycle noise must not reset sidebar state. When a breakpoint change can happen while the page is hidden or without a reliable resize event, lifecycle re-sampling may be used solely to detect an actual mode crossing.

One-time width reads in components that are meant to follow responsive state should be replaced with reactive breakpoint state rather than ad-hoc event-driven mutation.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle status: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu:develop` commit `fad12ba19287e0ef504e551b50aa144f3a3d3f0b`, including focused `shellBreakpoint` regression tests
- Benefit: keeps foldable/split-screen/resized-window shell state consistent with the current layout mode without disturbing normal mobile keyboard/address-bar resizing
- Conflict/risk: an over-broad resize handler could erase user sidebar choices repeatedly; lifecycle listeners must only re-sample and act on a genuine semantic breakpoint crossing
- Validation need: retain boundary tests at 1024/1025, same-mode no-op tests, fixed-width phone/height-change behavior, and component-level confirmation that toolbar grouping follows reactive breakpoint state
- Follow-up: preserve the distinction between layout-mode-owned defaults and user-owned in-mode state when future responsive shell or toolbar refactors land

## Dedupe

Keep separate from general mobile-light/performance and picker-sizing ideas. This record is specifically about ownership transfer when a viewport crosses a semantic responsive shell mode boundary, and about avoiding mount-only breakpoint reads where continued responsiveness is required.

## Guardrail check

No persistence, DB flush, plugin reload, service-manager, runtime/package, server-phone notification, or system-update behavior is involved. Existing PocketRisu guardrails remain unchanged.

## Progression result

Already implemented and regression-tested in official PocketRisu. Record as an adopted invariant and create a helper-repo dossier; no autonomous implementation branch or personal-fork PR is warranted solely for this historical item.
