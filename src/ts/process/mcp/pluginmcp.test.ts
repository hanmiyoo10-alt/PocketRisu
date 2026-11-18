import { afterEach, describe, expect, test, vi } from 'vitest'
import {
    CustomPluginMCPClient,
    registerMCPModule,
    registeredCustomPluginMCPs,
    syncRegisteredCustomPluginMCP,
} from './pluginmcp'

function registered(identifier: string) {
    return registeredCustomPluginMCPs.get(identifier)!
}

afterEach(() => {
    registeredCustomPluginMCPs.clear()
})

describe('plugin MCP cache synchronization', () => {
    test('replaces a cached client when the plugin sandbox re-registers', async () => {
        const id = 'plugin:test'
        await registerMCPModule(
            { identifier: id, name: 'first', version: '1', description: '' },
            async () => [],
            async () => [],
        )
        const first = registered(id)
        const destroy = vi.spyOn(first, 'destroy')
        const cache: Record<string, any> = { [id]: first }

        await registerMCPModule(
            { identifier: id, name: 'second', version: '2', description: '' },
            async () => [],
            async () => [],
        )
        const second = registered(id)
        expect(second).not.toBe(first)

        expect(syncRegisteredCustomPluginMCP(cache, id)).toBe(second)
        expect(cache[id]).toBe(second)
        expect(destroy).toHaveBeenCalledTimes(1)
    })

    test('drops a cached plugin client when no sandbox registration exists', async () => {
        const id = 'plugin:missing'
        const stale = new CustomPluginMCPClient({
            identifier: id,
            name: 'stale',
            version: '1',
            description: '',
            getToolList: async () => [],
            callTool: async () => [],
        })
        const destroy = vi.spyOn(stale, 'destroy')
        const cache: Record<string, any> = { [id]: stale }

        expect(syncRegisteredCustomPluginMCP(cache, id)).toBeNull()
        expect(cache[id]).toBeUndefined()
        expect(destroy).toHaveBeenCalledTimes(1)
    })

    test('keeps the current registered client without destroying it', async () => {
        const id = 'plugin:current'
        await registerMCPModule(
            { identifier: id, name: 'current', version: '1', description: '' },
            async () => [],
            async () => [],
        )
        const current = registered(id)
        const destroy = vi.spyOn(current, 'destroy')
        const cache: Record<string, any> = { [id]: current }

        expect(syncRegisteredCustomPluginMCP(cache, id)).toBe(current)
        expect(cache[id]).toBe(current)
        expect(destroy).not.toHaveBeenCalled()
    })
})
