import { describe, expect, it } from 'vitest'

const {
    createPluginScriptLazyStore,
    isPluginScriptStub,
} = require('./plugin-script-lazy-store.cjs')

function plugin(name: string, enabled: boolean, script: string) {
    return {
        name,
        displayName: name.toUpperCase(),
        enabled,
        version: '3.0',
        script,
        realArg: { token: name },
        arguments: { token: 'string' },
        customLink: [],
        argMeta: {},
        folderId: 'folder-a',
    }
}

describe('plugin script lazy store', () => {
    it('strips only disabled plugin scripts and restores them for disk', () => {
        const store = createPluginScriptLazyStore()
        const db = {
            plugins: [
                plugin('enabled', true, 'enabled-code'),
                plugin('disabled', false, 'disabled-code'),
            ],
        }

        store.resetFromDb(db)
        const client = store.stripForClient(db)

        expect(client).not.toBe(db)
        expect(client.plugins[0]).toEqual(db.plugins[0])
        expect(client.plugins[1].script).toBe('')
        expect(isPluginScriptStub(client.plugins[1])).toBe(true)

        client.plugins[1].folderId = 'folder-b'
        client.plugins[1].realArg = { token: 'changed' }

        const disk = store.hydrateForDisk(client)
        expect(disk.plugins[1].script).toBe('disabled-code')
        expect(disk.plugins[1].folderId).toBe('folder-b')
        expect(disk.plugins[1].realArg).toEqual({ token: 'changed' })
        expect(isPluginScriptStub(disk.plugins[1])).toBe(false)
    })

    it('fails closed when plugin names are ambiguous', () => {
        const store = createPluginScriptLazyStore()
        const db = {
            plugins: [
                plugin('same', false, 'one'),
                plugin('same', false, 'two'),
            ],
        }

        store.resetFromDb(db)
        expect(store.stripForClient(db)).toBe(db)
    })

    it('does not overwrite a newly hydrated script with stale authority', () => {
        const store = createPluginScriptLazyStore()
        const db = { plugins: [plugin('p', false, 'old-code')] }
        store.resetFromDb(db)

        const client = store.stripForClient(db)
        client.plugins[0] = {
            ...client.plugins[0],
            script: 'new-code',
            _pluginScriptStub: undefined,
        }
        delete client.plugins[0]._pluginScriptStub

        const disk = store.hydrateForDisk(client)
        expect(disk.plugins[0].script).toBe('new-code')
    })

    it('remembers a newer full plugin before a later stub persist', () => {
        const store = createPluginScriptLazyStore()
        const db = { plugins: [plugin('p', true, 'old-code')] }
        store.resetFromDb(db)

        const updated = { plugins: [plugin('p', true, 'new-code')] }
        expect(store.rememberFullPlugins(updated)).toBe(true)

        const disabledStub = store.stripForClient({
            plugins: [{ ...plugin('p', false, 'new-code') }],
        })
        const disk = store.hydrateForDisk(disabledStub)
        expect(disk.plugins[0].script).toBe('new-code')
        expect(disk.plugins[0].enabled).toBe(false)
    })

    it('fails closed immediately when a runtime patch introduces duplicate names', () => {
        const store = createPluginScriptLazyStore()
        const initial = { plugins: [plugin('a', false, 'a-code'), plugin('b', false, 'b-code')] }
        store.resetFromDb(initial)

        const duplicate = {
            plugins: [
                plugin('a', false, 'a-new'),
                plugin('a', false, 'duplicate-code'),
            ],
        }
        expect(store.rememberFullPlugins(duplicate)).toBe(false)
        expect(store.stripForClient(duplicate)).toBe(duplicate)

        expect(store.rememberFullPlugins(initial)).toBe(true)
        const stripped = store.stripForClient(initial)
        expect(stripped).not.toBe(initial)
        expect(stripped.plugins.every((item: any) => item._pluginScriptStub === true)).toBe(true)
    })

    it('fails closed for a stub that has no authoritative full body', () => {
        const store = createPluginScriptLazyStore()
        const initial = { plugins: [plugin('known', false, 'known-code')] }
        store.resetFromDb(initial)

        const unknownStub = {
            plugins: [{
                ...plugin('unknown', false, ''),
                _pluginScriptStub: true,
            }],
        }
        expect(store.rememberFullPlugins(unknownStub)).toBe(false)
        expect(store.stripForClient(unknownStub)).toBe(unknownStub)
    })

    it('returns cloned authoritative plugin content', () => {
        const store = createPluginScriptLazyStore()
        const db = { plugins: [plugin('p', false, 'secret-code')] }
        store.resetFromDb(db)

        const full = store.getFullPlugin('p')
        expect(full.script).toBe('secret-code')
        full.script = 'changed'
        expect(store.getFullPlugin('p').script).toBe('secret-code')
    })
})
