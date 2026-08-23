# External RisuAI dev watch

Source: nevaeh5379/Risuai
Branch: dev
Last reviewed HEAD: 584738fc73936c696965d7578984fd32d5e913a6

Track useful changes for PocketRisu without blind cherry-picking.

Priority:
1. reset chat render window on character/chat switch
2. explicit low-spec/mobile-light mode
3. persist plugin updates before targeted runtime reload
4. character image thumbnail/preload optimization
5. lazy-load heavy sidebar actions
6. persist user messages before model generation
7. idle-batched inactive-chat memory release
8. active-chat message paging/compaction

Guardrails:
- do not reintroduce forced db flush on visibilitychange/pagehide
- keep flushServerDbKeepalive no-op unless separately reviewed
- preserve current PocketRisu save/integrity optimizations
- preserve targeted V3 plugin reload
- no Android notifications on the server phone

Automation rule: when dev advances, review only new commits, classify them as ready-to-port / design-needed / hold, update the reviewed HEAD, and notify only for meaningful candidates or risks.
