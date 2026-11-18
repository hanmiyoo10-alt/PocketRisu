import { tick } from 'svelte'

export type PluginScriptStub = {
    name: string
    script: ''
    _pluginScriptStub: true
    [key: string]: any
}

export type HydratedPluginScript = {
    _pluginScriptHydrated?: true
    [key: string]: any
}

type FetchPlugin = (name: string) => Promise<any | null>
type WaitForTick = () => Promise<void>

const hydrationPromises = new Map<string, Promise<any | null>>()
let hydrationTransitionCount = 0

export function isPluginScriptStub(plugin: any): plugin is PluginScriptStub {
    return !!plugin
        && typeof plugin === 'object'
        && plugin._pluginScriptStub === true
        && typeof plugin.name === 'string'
        && plugin.name.length > 0
}

export function isPluginScriptHydrationTransitionActive(): boolean {
    return hydrationTransitionCount > 0
}

function mergeStubMetadata(fullPlugin: any, stub: PluginScriptStub): any {
    const merged = { ...fullPlugin }
    for (const [key, value] of Object.entries(stub)) {
        if (key === '_pluginScriptStub' || key === 'script') continue
        merged[key] = value
    }
    delete merged._pluginScriptStub
    merged._pluginScriptHydrated = true
    return merged
}

export function pluginScriptToStub(plugin: any): any {
    if (!plugin || typeof plugin !== 'object') return plugin
    if (isPluginScriptStub(plugin)) return plugin

    const stub = { ...plugin }
    stub.script = ''
    stub._pluginScriptStub = true
    delete stub._pluginScriptHydrated
    return stub
}

export function projectPluginForSave(plugin: any): any {
    if (!plugin || typeof plugin !== 'object') return plugin

    const projected = { ...plugin }
    const wasHydrated = projected._pluginScriptHydrated === true
    delete projected._pluginScriptHydrated

    if (projected.enabled !== true && (isPluginScriptStub(projected) || wasHydrated)) {
        projected.script = ''
        projected._pluginScriptStub = true
    }
    return projected
}

export function projectPluginsForSave(plugins: any): any {
    if (!Array.isArray(plugins)) return plugins
    return plugins.map(projectPluginForSave)
}

export function resolveIncomingPluginScriptForComparison(incoming: any, installed: any): string | null {
    if (!incoming || typeof incoming !== 'object') return null
    if (!isPluginScriptStub(incoming)) {
        return typeof incoming.script === 'string' ? incoming.script : null
    }

    if (
        !installed
        || typeof installed !== 'object'
        || installed.name !== incoming.name
        || isPluginScriptStub(installed)
        || typeof installed.script !== 'string'
    ) {
        return null
    }
    return installed.script
}

export function stripPluginScriptRuntimeMarkers(plugins: any): any {
    if (!Array.isArray(plugins)) return plugins
    return plugins.map(plugin => {
        if (!plugin || typeof plugin !== 'object') return plugin
        const clean = { ...plugin }
        delete clean._pluginScriptHydrated
        return clean
    })
}

export function dehydratePluginScriptAtIndex(plugins: any[], index: number): any | null {
    const plugin = plugins?.[index]
    if (!plugin || plugin.enabled === true) return plugin ?? null

    // Only discard a body that is already represented by a server-owned stub
    // or was hydrated from that server-owned body in this runtime. A full body
    // authored/imported/updated locally may not have reached the server yet.
    if (!isPluginScriptStub(plugin) && plugin._pluginScriptHydrated !== true) {
        return plugin
    }

    const stub = pluginScriptToStub(plugin)
    plugins[index] = stub
    return stub
}

async function hydratePluginByName(
    plugins: any[],
    pluginName: string,
    fetchPlugin: FetchPlugin,
    waitForTick: WaitForTick,
): Promise<any | null> {
    const existingPromise = hydrationPromises.get(pluginName)
    if (existingPromise) return existingPromise

    const promise = (async () => {
        try {
            const fullPlugin = await fetchPlugin(pluginName)
            if (!fullPlugin) return null
            if (fullPlugin.name !== pluginName) {
                throw new Error(`Plugin name mismatch: requested=${pluginName} received=${fullPlugin.name ?? '<missing>'}`)
            }
            if (typeof fullPlugin.script !== 'string') {
                throw new Error(`Plugin script missing: ${pluginName}`)
            }

            const currentIndex = plugins.findIndex(plugin => plugin?.name === pluginName)
            if (currentIndex < 0) return null

            const current = plugins[currentIndex]
            if (!isPluginScriptStub(current)) {
                return current
            }

            const hydrated = mergeStubMetadata(fullPlugin, current)

            // Suppress the save effect only for the actual stub -> full
            // assignment. Network wait time must not hide unrelated user
            // edits to plugin settings while hydration is in flight.
            hydrationTransitionCount++
            try {
                plugins[currentIndex] = hydrated
                await waitForTick()
            } finally {
                hydrationTransitionCount--
            }
            return hydrated
        } finally {
            hydrationPromises.delete(pluginName)
        }
    })()

    hydrationPromises.set(pluginName, promise)
    return promise
}

export async function hydratePluginScriptAtIndex(
    plugins: any[],
    index: number,
    fetchPlugin: FetchPlugin,
    waitForTick: WaitForTick = tick,
): Promise<any | null> {
    const plugin = plugins?.[index]
    if (!plugin) return null
    if (!isPluginScriptStub(plugin)) return plugin
    return hydratePluginByName(plugins, plugin.name, fetchPlugin, waitForTick)
}

export async function hydrateAllPluginScripts(
    plugins: any[],
    fetchPlugin: FetchPlugin,
    waitForTick: WaitForTick = tick,
): Promise<any[]> {
    const names = plugins
        .map(plugin => plugin?.name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0)

    for (const pluginName of names) {
        const currentIndex = plugins.findIndex(plugin => plugin?.name === pluginName)
        if (currentIndex < 0) continue
        const hydrated = await hydratePluginScriptAtIndex(
            plugins,
            currentIndex,
            fetchPlugin,
            waitForTick,
        )
        if (!hydrated) {
            throw new Error('Failed to hydrate plugin ' + pluginName)
        }
    }

    const remainingStub = plugins.find(isPluginScriptStub)
    if (remainingStub) {
        throw new Error('Failed to hydrate plugin ' + remainingStub.name)
    }
    return plugins
}
