# Forward review — HaejeokRisuai BTW scroll ownership

Source: `nevaeh5379/HaejeokRisuai:main`
Reviewed range: `051c976ee09ff3286c9666601bf3b7e8ccd082c2..96bfd02f39544b56ab4243a8b6515f265c5290c2`
Commits reviewed: 3

## Meaningful evidence

`403a067465850e441c3f61e5802484302c1dfc3d` refactors the BTW panel onto shared runtime state and adds an effect which reacts to the active session's latest message/message count, waits for `tick()`, then unconditionally writes `messagesElement.scrollTop = messagesElement.scrollHeight`.

This is useful as regression evidence for the existing `CHAT-PROGRAMMATIC-SCROLL-ORIGIN` idea, not as a new idea. A message-arrival effect that always writes the bottom position gives application-owned auto-follow precedence over user-owned scroll position even when the user intentionally scrolled upward to read history. It is the same underlying ownership class already evidenced by PocketRisu-Alter's programmatic-scroll/user-navigation confusion and PocketRisu-Kei's wheel-settle writeback bug.

The later commits `77aec9fd9c9f578af4756357b08cf383859aebb9` and `96bfd02f39544b56ab4243a8b6515f265c5290c2` primarily reuse the shared `ChatMessage` component and improve BTW settings/search UX. They do not establish a separate PocketRisu architectural candidate in this pass.

## Classification merge

Merge into `CHAT-PROGRAMMATIC-SCROLL-ORIGIN` without creating a duplicate.

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: current PocketRisu chat scroll-owner / auto-follow / scroll-nav / wheel-settle audit and direct reproduction
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai@403a067465850e441c3f61e5802484302c1dfc3d`; existing Alter/Kei evidence remains merged
- Benefit: preserve user scroll ownership while retaining bounded auto-follow for users who remain at bottom
- Conflict/risk: a broad suppression mechanism can break pagination, bottom detection, keyboard/touch scrolling, or legitimate auto-follow
- Validation need: reproduce user break-away during streaming/message arrival and verify app-owned bottom writes occur only while auto-follow ownership is still valid
- Follow-up: strengthen existing helper dossier; inspect current PocketRisu before any implementation

## Cursor result

Forward review is complete through `96bfd02f39544b56ab4243a8b6515f265c5290c2`. Advance only the HaejeokRisuai authoritative cursor to this HEAD. Historical backfill coverage is unchanged.
