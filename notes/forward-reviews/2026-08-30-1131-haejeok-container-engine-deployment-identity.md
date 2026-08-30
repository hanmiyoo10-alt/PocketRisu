# Forward review — Haejeok container-engine deployment identity

Reviewed source: `nevaeh5379/HaejeokRisuai:main`

Forward range: `03516f2de86399ab8ee4050a2067339799a86826..e06091c8c697ec35881661463955300df59dbcfd`

## Meaningful source evidence

- `a8e0357b251d38544b69375d892461cfd9f7ddc0` — `Add Podman support to deployment lifecycle`.
  - Adds explicit `RISUAI_CONTAINER_ENGINE` ownership and `--container-engine` selection.
  - Persists the selected engine and reuses it for later lifecycle commands.
  - Allows automatic selection only when a usable engine is available.
  - Rejects in-place switching from the persisted engine to another engine as unsafe.
  - Extends deployment tests so Docker/Podman selection, persistence, reuse, fallback, and unsafe-switch refusal are observable.
- `962ac4af1ec929713853a126abab3e581b9d6fd6` — release-note/platform-download presentation; reviewed, no separate PocketRisu idea promoted.
- `e06091c8c697ec35881661463955300df59dbcfd` — merge of the release-note branch; no separate idea.

## Deduplicated idea

Feature ID: `DEPLOYMENT-CONTAINER-ENGINE-IDENTITY`

This is not primarily a request to add Podman. The transferable invariant is that a deployment substrate choice that affects compose/network/service semantics should become explicit persisted deployment identity, and lifecycle commands should reuse that identity instead of opportunistically changing engines underneath an existing installation.

### Classification

- System impact: `SYSTEM_UPDATE_REQUIRED`
- Importance: `MEDIUM`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: explicit PocketRisu requirement for a second supported container engine; host capability/support matrix; compose/network/volume parity tests; documented migration or reinstall path between engines
- Priority: `P2`
- Lifecycle status: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai` `a8e0357b251d38544b69375d892461cfd9f7ddc0`
- Benefit: prevents lifecycle drift where install/start/update/stop operate through different container engines or engine-specific semantics, and makes deployment state diagnosable/reproducible.
- Conflict/risk: changes deployment substrate and may alter networking, rootless permissions, compose behavior, volumes, service ownership, and recovery assumptions; therefore it is outside autonomous implementation gates.
- Validation need: engine-selection matrix; persisted-identity reuse tests; missing/unusable-engine failure tests; explicit unsafe-switch refusal; volume/network/config parity; rollback/reinstall documentation; verify runit and server-phone notification guardrails remain unchanged.
- Follow-up: design/investigation only until a concrete PocketRisu need for non-Docker engine support exists. If activated, first PR should be contract/tests for deployment-engine identity without installing, migrating, or switching any host runtime.

## Progression decision

Assistant-owned design dossier created in the helper repository. No PocketRisu implementation branch, host change, package/runtime change, test execution, or PR was created because this idea is `SYSTEM_UPDATE_REQUIRED` and `Risk: HIGH`.

## Cursor decision

The forward range was reviewed through `e06091c8c697ec35881661463955300df59dbcfd`; advancing the Haejeok cursor to that HEAD is safe and does not move it backward.
