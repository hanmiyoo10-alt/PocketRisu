# Risu family idea watch

Track useful changes for PocketRisu without blind cherry-picking. Each active source keeps its own forward cursor; historical backfill is tracked separately in `notes/external-risu-ideas.md`.

## Active sources

- Source: `nevaeh5379/HaejeokRisuai`
  - Branch: `main`
  - Last reviewed HEAD: `2ee2ef86065eb0037590317f1950fe389144af02`
- Source: `rpaddict/RisuBard`
  - Branch: `main`
  - Last reviewed HEAD: `3ae4501bf40fa5bb86bb20a93c4f4d7cf4b48a93`
- Source: `kwaroran/Risuai`
  - Branch: `main`
  - Last reviewed HEAD: `7101c3c9e71f56e603a25e239554333fc9100695`
- Source: `kwaroran/Risuai-Next`
  - Branch: `main`
  - Last reviewed HEAD: `8dae43c533e5d4a1211298d1f8a6400266c94f74`
- Source: `PocketRisu/PocketRisu`
  - Branch: `develop`
  - Last reviewed HEAD: `b95d0fa72ce41c61e4ea8d42303499c72a6ba315`

## Historical source

- `nevaeh5379/Risuai:dev` — retired as a forward source; preserve for historical backfill only. Original watch cursor: `584738fc73936c696965d7578984fd32d5e913a6`.

## Priority

1. ultra-long-chat and mobile responsiveness
2. character/chat switching and render-window ownership
3. image/blob/cache memory behavior
4. plugin update/persistence/security boundaries
5. bounded-context and narrative-memory techniques
6. Node/self-host performance and save integrity
7. backup/restore and crash-recovery safety
8. reusable upstream/base-Risu and Risuai-Next architecture ideas that PocketRisu may have missed
9. PocketRisu's own architectural fixes, regressions, and adopted invariants worth preserving as design knowledge

## Guardrails

- do not reintroduce forced db flush on visibilitychange/pagehide
- keep flushServerDbKeepalive no-op unless separately reviewed
- preserve current PocketRisu save/integrity optimizations unless explicitly and safely superseded
- preserve targeted V3 plugin reload
- keep runit; do not introduce PM2
- no Android notifications on the server phone
- PocketRisu itself is a source of lessons, but an existing implementation is not automatically optimal; record regressions, reversions, and invariants too

## Automation rule

When any active source advances, review only commits newer than that source's cursor, classify meaningful transferable ideas, update the cursor, and write deduplicated ideas to `notes/external-risu-ideas.md`. When forward traffic is quiet, continue bounded historical backfill across every active source (including Risuai-Next) without moving active cursors backward. Notify only for meaningful candidates, risks/regressions, or newly discovered historical ideas.
