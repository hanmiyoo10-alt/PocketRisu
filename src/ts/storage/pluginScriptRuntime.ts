import { DBState } from '../stores.svelte'
import {
    hydrateAllPluginScripts,
    hydratePluginScriptByName,
    isPluginScriptStub,
} from './pluginScriptHydration'

async function getPluginStorage() {
    const { forageStorage } = await import('../globalApi.svelte')
    await forageStorage.Init()
    return forageStorage.realStorage
}

export async function ensurePluginScriptHydrated(index: number): Promise<any | null> {
    const plugins = DBState.db?.plugins
    if (!Array.isArray(plugins) || index < 0 || index >= plugins.length) return null
    const plugin = plugins[index]
    if (!plugin) return null
    if (!isPluginScriptStub(plugin)) return plugin
    const pluginName = plugin.name

    const storage = await getPluginStorage()
    return hydratePluginScriptByName(
        () => DBState.db?.plugins,
        pluginName,
        (name) => storage.fetchPluginContent(name),
    )
}

export async function ensureEnabledPluginScriptsHydrated(): Promise<void> {
    const plugins = DBState.db?.plugins
    if (!Array.isArray(plugins)) return

    for (let index = 0; index < plugins.length; index++) {
        if (plugins[index]?.enabled !== true || !isPluginScriptStub(plugins[index])) continue
        const hydrated = await ensurePluginScriptHydrated(index)
        if (!hydrated) {
            throw new Error('Failed to hydrate enabled plugin ' + (plugins[index]?.name ?? index))
        }
    }
}

export async function ensureAllPluginScriptsHydrated(): Promise<void> {
    const plugins = DBState.db?.plugins
    if (!Array.isArray(plugins)) return

    const storage = await getPluginStorage()
    await hydrateAllPluginScripts(
        plugins,
        (name) => storage.fetchPluginContent(name),
    )
}
