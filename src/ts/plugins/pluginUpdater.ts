import { importPlugin, type RisuPlugin } from './plugins.svelte'
import { comparePluginVersions, getPluginUpdateFetchInit } from './pluginUpdateUtils'

type PluginUpdateInfo = {
    version: string
    updateURL: string
}

const updateCache = new Map<string, PluginUpdateInfo>()

export const checkPluginUpdate = async (plugin: RisuPlugin): Promise<PluginUpdateInfo | undefined> => {
    try {
        if (!plugin.updateURL) {
            return
        }

        const cached = updateCache.get(plugin.name)
        if (cached && comparePluginVersions(cached.version, plugin.versionOfPlugin || '0.0.0') === 1) {
            return cached
        }

        const response = await fetch(plugin.updateURL, getPluginUpdateFetchInit(true))
        if (response.status < 200 || response.status >= 300) {
            return
        }

        const text = await response.text()
        const versionRegex = /\/\/@version\s+([^\s]+)/
        const match = text.match(versionRegex)
        if (!match?.[1]) {
            return
        }

        const latestVersion = match[1].trim()
        if (comparePluginVersions(latestVersion, plugin.versionOfPlugin || '0.0.0') !== 1) {
            return
        }

        const updateInfo = {
            version: latestVersion,
            updateURL: plugin.updateURL,
        }
        updateCache.set(plugin.name, updateInfo)
        return updateInfo
    } catch (error) {
        console.warn('Failed to check plugin update:', error)
    }
}

export const updatePlugin = async (plugin: RisuPlugin): Promise<boolean> => {
    try {
        if (!plugin.updateURL) {
            return false
        }

        const response = await fetch(plugin.updateURL, getPluginUpdateFetchInit(false))
        if (response.status < 200 || response.status >= 300) {
            return false
        }

        const jsFile = await response.text()
        await importPlugin(jsFile, {
            isUpdate: true,
            originalPluginName: plugin.name,
        })
        updateCache.delete(plugin.name)
        return true
    } catch (error) {
        console.error('Failed to update plugin:', error)
    }
    return false
}
