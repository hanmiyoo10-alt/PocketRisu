import { describe, expect, it } from 'vitest'
import {
    hydrateAllPluginScripts,
    hydratePluginScriptAtIndex,
    dehydratePluginScriptAtIndex,
    isPluginScriptHydrationTransitionActive,
    isPluginScriptStub,
    projectPluginForSave,
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
        const fetchPlugin = async (name: string) => full(name, name + '-code')
        const waitForTick = async () => {
            plugins.reverse()
            expect(isPluginScriptHydrationTransitionActive()).toBe(true)
        }

        const hydrated = await hydratePluginScriptAtIndex(plugins, 0, fetchPlugin, waitForTick)

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

    it('dehydrates a disabled local plugin immediately', () => {
        const plugins = [{ ...full('a', 'loaded-code'), enabled: false }]
        const dehydrated = dehydratePluginScriptAtIndex(plugins, 0)
        expect(dehydrated.script).toBe('')
        expect(dehydrated._pluginScriptStub).toBe(true)
        expect(plugins[0]).toBe(dehydrated)
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
