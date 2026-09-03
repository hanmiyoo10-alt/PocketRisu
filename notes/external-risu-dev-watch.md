# Risu family idea watch

Track useful changes for PocketRisu without blind cherry-picking. Each active source keeps its own forward cursor; historical backfill is tracked separately in `notes/external-risu-ideas.md`.

## Active sources

- Source: `nevaeh5379/HaejeokRisuai`
  - Branch: `main`
  - Last reviewed HEAD: `5cb7fa23010d11076a6382fd8a98402858605833`
- Source: `rpaddict/RisuBard`
  - Branch: `main`
  - Last reviewed HEAD: `1c90eca110150350ba1551d3f800be5a903e54f2`
- Source: `kwaroran/Risuai`
  - Branch: `main`
  - Last reviewed HEAD: `754af0ba5d546db9a8cc0c2676ba4c2693f3f72d`
- Source: `kwaroran/Risuai-Next`
  - Branch: `main`
  - Last reviewed HEAD: `b0d40f89a9f40b29900d86e5251a78649b2c6173`
- Source: `PocketRisu/PocketRisu`
  - Branch: `develop`
  - Last reviewed HEAD: `278251f85a19bfdfd4cf3faae780e62682878f9e`
- Source: `InoriNatsume/RisuVault`
  - Branch: `master`
  - Last reviewed HEAD: `1284cc93853bdba80fc3aab537fad2817d695914`
- Source: `TripleHwang/RisuVault`
  - Branch: `main`
  - Last reviewed HEAD: `5afa95a9379ef45ef8484617a5407726d14e5f2b`
- Source: `seto-sama/PocketRisu-Kei`
  - Branch: `main`
  - Last reviewed HEAD: `3b55f692c02c04082b087547b0114506a5373681`
- Source: `Nagase-Kotono/PocketRisu-kotono`
  - Branch: `main`
  - Last reviewed HEAD: `7dc29aeec37bba4d08dfc769fc3e467409a1d68b`
- Source: `tegy1117/Kei-Risu`
  - Branch: `main`
  - Last reviewed HEAD: `8d794f9753381ab2582509a6cfb577968a6de595`
- Source: `PocketRisu-Alter/PocketRisu-Alter`
  - Branch: `main`
  - Last reviewed HEAD: `128482ce9984a30ecb68834d561169846d068295`

## Discovery pool

Do not blindly promote every GitHub fork to active monitoring. Compare candidates against the closest upstream/base and promote only repositories with distinct code, architecture, patches, tooling, or maintained divergence worth mining. Exact mirrors and abandoned zero-diff forks stay discovery-only.

Seeded full-code candidates discovered on 2026-08-26 include:

- RisuAI-family: `kangjoseph90/RisuAI` (`patchsync`), `risuai/RisuAI` (`main`), `shenruotong/risuai` (`main`), `jeong-jimin-github/RisuAI-KAI` (`main`), `dilluti0n/RisuAI` (`electron-port`), `Pyser08/RisuAI` (`main`), `Pyser08/Risuai-custom` (`main`), `yas-zoa/RisuAI` (`master`), `tresbien-rai/RisuAI` (`main`), `devforai-creator/RisuAI-Hardened` (`main`), `ChatPoongKun/RisuMaou` (`main`), `Budy123/RisuaiClone` (`main`), `magicarslan2007-ctrl/Risuai` (`main`), `sunnyark/Risuai` (`main`), `darthzoloft/Risuai` (`main`), `linyue404/Risuai` (`main`), `misov1/Risuai` (`main`), `octo-patch/Risuai` (`main`), `tiwentichat/RisuAI` (`main`).
- PocketRisu-family: `myoun/PocketRisu` (`codex/main`), `Eclipses-Saros/PocketRisu`, `boounge2e-ai/PocketRisu`, `3ae3ae/PocketRisu`, `aCafela-coffee/PocketRisu`, `SameDesu123/PocketRisu`, `canister2668/PocketRisu`, `EvoLinkAI/PocketRisu`, `noelkim12/PocketRisu`, `Fau57/PocketRisu`, `repryty/PocketRisu`, `rpaddict/PocketRisu`, `IHaBiS02/PocketRisu`, `shittim-plana/PocketRisu`, `0-Elisha-1/PocketRisu`, `empty1313/PocketRisu`, `hyomibam/PocketRisu`, `Laily6026/PocketRisu`, `georgeatparallel/PocketRisu`, `Pycnocline/PocketRisu`, `Gynephobia/PocketRisu`, `rhplus0831/PocketRisu` (`serve-prd`), `rakey0/PocketRisu`, `hvboq/PocketRisu`, `LemonDouble/PocketRisu`, `universebaby1020/PocketRisu`, `pnya2021/PocketRisu` (`pnya/main`), `yas-zoa/PocketRisu`, `minsawook/PocketRisu-in-server`, `TrissElan/ServerRisu`, `lunayeon82/PocketRisu`, `wuhaoyu050721/PocketRisu`.
- Discovery-only / architecture source: `rhplus0831/risuai-fastify` (`fastify-main`) — meaningful server-authoritative/Fastify divergence; reviewed current HEAD `5c91d9cef3240aaad6aa016fe27001910f2f902e` (2026-07-22). Keep discovery-only until renewed maintenance is demonstrated; do not hourly poll yet. Latest reviewed commit also shows bounded translator-history slots with hard reset boundaries and token budget, but those principles overlap existing server-authority/bounded-context ideas.
- Discovery-only / non-code source: `k-risu/k-risu` (`main`) — reviewed through initial commit `3f735da8a4345628066e7f6f50f963a27fdaa4fa`; repository contains only `README.md`, and all visible commits are README edits. Former active cursor `1ea18e2cc3e63cfb648ab3b0a1ec9392f64d5ec2` is preserved here for history; do not hourly poll unless code divergence appears.

Also search the wider ecosystem periodically for Risu-related storage, backend, sync, monitoring, memory, plugin, import/export, and deployment projects. Ecosystem projects are idea sources, not automatic code-port sources.

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
8. reusable architecture, safety, storage, memory, import/export, and deployment ideas from any Risu-family variant
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

1. Treat the Active sources section as the durable registry for forward cursors.
2. When an active source advances, review only commits newer than that source's cursor, classify meaningful transferable ideas, update the cursor, and write deduplicated ideas to `notes/external-risu-ideas.md`.
3. When forward traffic is quiet, continue bounded historical backfill without moving active cursors backward.
4. In bounded discovery passes, search GitHub for `RisuAI`, `Risuai`, `PocketRisu`, `RisuVault`, `RisuBard`, `RisuMaou`, `Kei-Risu`, and obvious related variants. Compare likely full-code forks to their nearest base. Promote a candidate to Active sources only if it has meaningful maintained divergence; initialize its cursor at the reviewed current HEAD and record why it was promoted in the idea backlog/history.
5. Keep low-signal mirrors out of hourly active polling, but retain them in the discovery pool so later divergence can be detected.
6. Review ecosystem tools/plugins when they expose transferable architecture or safety ideas, but do not confuse plugin-specific code with core PocketRisu architecture.
7. Notify only for meaningful candidates, risks/regressions, newly promoted sources, or newly discovered historical ideas.
