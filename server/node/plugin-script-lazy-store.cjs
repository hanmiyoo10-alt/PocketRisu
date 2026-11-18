const PLUGIN_SCRIPT_STUB_FLAG = '_pluginScriptStub'

function cloneValue(value) {
    return structuredClone(value)
}

function isPluginScriptStub(plugin) {
    return !!plugin
        && typeof plugin === 'object'
        && plugin[PLUGIN_SCRIPT_STUB_FLAG] === true
        && typeof plugin.name === 'string'
        && plugin.name.length > 0
}

function pluginToScriptStub(plugin) {
    if (!plugin || typeof plugin !== 'object') return plugin
    if (isPluginScriptStub(plugin)) return plugin
    if (typeof plugin.name !== 'string' || plugin.name.length === 0) return plugin
    if (plugin.enabled === true) return plugin

    const stub = cloneValue(plugin)
    stub.script = ''
    stub[PLUGIN_SCRIPT_STUB_FLAG] = true
    return stub
}

function mergePluginScriptStubWithFull(stub, fullPlugin) {
    if (!isPluginScriptStub(stub)) return stub
    if (!fullPlugin || typeof fullPlugin !== 'object') {
        throw new Error(`missing authoritative plugin for stub name=${stub?.name ?? '<missing>'}`)
    }

    const merged = cloneValue(fullPlugin)
    for (const [key, value] of Object.entries(stub)) {
        if (key === PLUGIN_SCRIPT_STUB_FLAG || key === 'script') continue
        merged[key] = cloneValue(value)
    }
    delete merged[PLUGIN_SCRIPT_STUB_FLAG]
    return merged
}

function createPluginScriptLazyStore() {
    let fullByName = new Map()
    let safeToStrip = false

    function resetFromDb(db) {
        const next = new Map()
        const plugins = Array.isArray(db?.plugins) ? db.plugins : []
        let safe = true

        for (const plugin of plugins) {
            if (
                !plugin
                || typeof plugin !== 'object'
                || typeof plugin.name !== 'string'
                || plugin.name.length === 0
                || typeof plugin.script !== 'string'
                || isPluginScriptStub(plugin)
                || next.has(plugin.name)
            ) {
                safe = false
                continue
            }
            next.set(plugin.name, cloneValue(plugin))
        }

        fullByName = next
        safeToStrip = safe && next.size === plugins.length
    }

    function clear() {
        fullByName = new Map()
        safeToStrip = false
    }

    function stripForClient(db) {
        if (!db || typeof db !== 'object' || !Array.isArray(db.plugins)) return db
        if (!safeToStrip) return db

        const stripped = { ...db }
        stripped.plugins = db.plugins.map(plugin => pluginToScriptStub(plugin))
        return stripped
    }

    function hydrateForDisk(db) {
        if (!db || typeof db !== 'object' || !Array.isArray(db.plugins)) return db
        if (!db.plugins.some(isPluginScriptStub)) return db
        if (!safeToStrip) {
            throw new Error('plugin script lazy store is not authoritative for stub hydration')
        }

        const full = { ...db }
        full.plugins = db.plugins.map(plugin => {
            if (!isPluginScriptStub(plugin)) return plugin
            const authoritative = fullByName.get(plugin.name)
            return mergePluginScriptStubWithFull(plugin, authoritative)
        })
        return full
    }

    function rememberFullPlugins(db) {
        if (!db || typeof db !== 'object' || !Array.isArray(db.plugins)) return true

        const seen = new Set()
        const updates = []
        for (const plugin of db.plugins) {
            if (!plugin || typeof plugin !== 'object' || typeof plugin.name !== 'string' || plugin.name.length === 0) {
                return false
            }
            if (seen.has(plugin.name)) return false
            seen.add(plugin.name)

            if (!isPluginScriptStub(plugin)) {
                if (typeof plugin.script !== 'string') return false
                updates.push([plugin.name, cloneValue(plugin)])
            }
        }

        for (const [name, plugin] of updates) fullByName.set(name, plugin)
        return true
    }

    function getFullPlugin(name) {
        if (!name) return null
        const plugin = fullByName.get(name)
        return plugin ? cloneValue(plugin) : null
    }

    return {
        resetFromDb,
        clear,
        stripForClient,
        hydrateForDisk,
        rememberFullPlugins,
        getFullPlugin,
    }
}

module.exports = {
    PLUGIN_SCRIPT_STUB_FLAG,
    isPluginScriptStub,
    pluginToScriptStub,
    mergePluginScriptStubWithFull,
    createPluginScriptLazyStore,
}
