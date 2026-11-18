import { describe, expect, it } from 'vitest'
import {
    hydrateAllPluginScripts,
    hydratePluginScriptAtIndex,
    hydratePluginScriptByName,
    dehydratePluginScriptAtIndex,
    isPluginScriptHydrationTransitionActive,
    isPluginScriptStub,
    projectPluginForSave,
    resolveIncomingPluginScriptForComparison,
} from './pluginScriptHydration'

const stub = (name: string) => ({
    name,
    displayName: name.toUpperCase(),
    enabled: false,
    version: '3.0',
    script: '',
    realArg: { x: name },
    _pluginScriptStub: true as const,
})

const full = (name: string, script: string) => ({
    name,
    displayName: 'SERVER',
    enabled: false,
    version: '3.0',
    script,
    realArg: { x: 'server' },
})

describe('plugin script hydration', () => {
    it('hydrates by stable name after reordering and preserves client metadata', async () => {
        const plugins = [stub('a'), stub('b')]
        let stateDuringFetch: boolean | null = null
        const fetchPlugin = async (name: string) => {
            stateDuringFetch = isPluginScriptHydrationTransitionActive()
            return full(name, name + '-code')
        }
        const waitForTick = async () => {
            plugins.reverse()
            expect(isPluginScriptHydrationTransitionActive()).toBe(true)
        }

        const hydrated = await hydratePluginScriptAtIndex(plugins, 0, fetchPlugin, waitForTick)

        expect(stateDuringFetch).toBe(false)
        expect(hydrated.script).toBe('a-code')
        expect(hydrated.displayName).toBe('A')
        expect(hydrated.realArg).toEqual({ x: 'a' })
        expect(isPluginScriptStub(hydrated)).toBe(false)
        expect(isPluginScriptHydrationTransitionActive()).toBe(false)
    })

    it('coalesces concurrent hydration for the same plugin', async () => {
        const plugins = [stub('a')]
        let fetches = 0
        let release!: () => void
        const gate = new Promise<void>(resolve => { release = resolve })
        const fetchPlugin = async () => {
            fetches++
            await gate
            return full('a', 'code')
        }

        const a = hydratePluginScriptAtIndex(plugins, 0, fetchPlugin, async () => {})
        const b = hydratePluginScriptAtIndex(plugins, 0, fetchPlugin, async () => {})
        release()

        const [one, two] = await Promise.all([a, b])
        expect(fetches).toBe(1)
        expect(one.script).toBe('code')
        expect(two.script).toBe('code')
    })

    it('projects read-hydrated disabled scripts back to stubs for ordinary saves', async () => {
        const plugins = [stub('a')]
        const hydrated = await hydratePluginScriptAtIndex(
            plugins,
            0,
            async () => full('a', 'server-code'),
            async () => {},
        )
        expect(hydrated._pluginScriptHydrated).toBe(true)

        const projected = projectPluginForSave(hydrated)
        expect(projected.script).toBe('')
        expect(projected._pluginScriptStub).toBe(true)
        expect(projected._pluginScriptHydrated).toBeUndefined()
    })

    it('keeps a newly imported disabled full script authoritative on save', () => {
        const dirty = { ...full('a', 'new-code'), enabled: false }
        const projected = projectPluginForSave(dirty)
        expect(projected.script).toBe('new-code')
        expect(projected._pluginScriptStub).toBeUndefined()
        expect(projected._pluginScriptHydrated).toBeUndefined()
    })

    it('removes runtime markers but keeps enabled hydrated scripts full', async () => {
        const plugins = [stub('a')]
        const hydrated = await hydratePluginScriptAtIndex(
            plugins,
            0,
            async () => ({ ...full('a', 'server-code'), enabled: true }),
            async () => {},
        )
        hydrated.enabled = true

        const projected = projectPluginForSave(hydrated)
        expect(projected.script).toBe('server-code')
        expect(projected._pluginScriptHydrated).toBeUndefined()
    })

    it('preserves a disabled locally-authored full body until it is persisted', () => {
        const local = { ...full('a', 'new-local-code'), enabled: false }
        const plugins = [local]

        const result = dehydratePluginScriptAtIndex(plugins, 0)

        expect(result).toBe(local)
        expect(plugins[0].script).toBe('new-local-code')
        expect(isPluginScriptStub(plugins[0])).toBe(false)
    })

    it('dehydrates a disabled body that was hydrated from server authority', async () => {
        const plugins = [stub('a')]
        const hydrated = await hydratePluginScriptAtIndex(
            plugins,
            0,
            async () => full('a', 'server-code'),
            async () => {},
        )
        expect(hydrated._pluginScriptHydrated).toBe(true)

        hydrated.enabled = false
        const dehydrated = dehydratePluginScriptAtIndex(plugins, 0)

        expect(dehydrated.script).toBe('')
        expect(dehydrated._pluginScriptStub).toBe(true)
        expect(dehydrated._pluginScriptHydrated).toBeUndefined()
    })

    it('resolves the current plugin index by name after hydration-time reordering', async () => {
        const plugins = [stub('a'), stub('b')]
        let release!: () => void
        const gate = new Promise<void>(resolve => { release = resolve })
        const hydration = hydratePluginScriptAtIndex(
            plugins,
            0,
            async () => {
                await gate
                return full('a', 'a-code')
            },
            async () => {},
        )

        plugins.reverse()
        release()
        await hydration

        const currentIndex = plugins.findIndex(plugin => plugin?.name === 'a')
        expect(currentIndex).toBe(1)
        plugins[currentIndex].enabled = true
        expect(plugins.map(plugin => plugin.name)).toEqual(['b', 'a'])
        expect(plugins[1].script).toBe('a-code')
    })


    it('hydrates the live plugin array when reordering replaces the array during fetch', async () => {
        let plugins = [stub('a'), stub('b')]
        let release!: () => void
        const gate = new Promise<void>(resolve => { release = resolve })
        const hydration = hydratePluginScriptByName(
            () => plugins,
            'a',
            async () => {
                await gate
                return full('a', 'a-code')
            },
            async () => {},
        )

        plugins = [{ ...plugins[1] }, { ...plugins[0] }]
        release()
        const hydrated = await hydration

        expect(hydrated?.name).toBe('a')
        expect(plugins.map(plugin => plugin.name)).toEqual(['b', 'a'])
        expect(plugins[1].script).toBe('a-code')
        expect(plugins[1]._pluginScriptStub).toBeUndefined()
        expect((plugins[1] as any)._pluginScriptHydrated).toBe(true)
    })

    it('treats an incoming disabled stub as a reference to the installed full script', () => {
        const incoming = stub('a')
        const installed = { ...full('a', 'installed-code'), enabled: false }

        expect(resolveIncomingPluginScriptForComparison(incoming, installed)).toBe('installed-code')
        expect(resolveIncomingPluginScriptForComparison(incoming, stub('a'))).toBeNull()
        expect(resolveIncomingPluginScriptForComparison(stub('missing'), null)).toBeNull()
        expect(resolveIncomingPluginScriptForComparison(full('a', 'new-code'), installed)).toBe('new-code')
    })

    it('hydrates all stubs before export', async () => {
        const plugins = [stub('a'), { ...full('b', 'b-code'), enabled: true }]
        await hydrateAllPluginScripts(
            plugins,
            async name => full(name, name + '-code'),
            async () => {},
        )
        expect(plugins.every(plugin => !isPluginScriptStub(plugin))).toBe(true)
        expect(plugins[0].script).toBe('a-code')
    })
})
