import { describe, expect, it } from 'vitest'
import { comparePluginVersions, getPluginUpdateFetchInit } from '../src/ts/plugins/pluginUpdateUtils'

describe('comparePluginVersions', () => {
    it('orders numeric alpha patch increments', () => {
        expect(comparePluginVersions('3.0.0-alpha.5.47', '3.0.0-alpha.5.46')).toBe(1)
    })

    it('orders rc after alpha prereleases', () => {
        expect(comparePluginVersions('3.0.0-rc.1', '3.0.0-alpha.5.47')).toBe(1)
    })

    it('orders stable after prerelease', () => {
        expect(comparePluginVersions('3.0.0', '3.0.0-rc.9')).toBe(1)
    })

    it('compares numeric prerelease identifiers numerically', () => {
        expect(comparePluginVersions('1.2.3-alpha.10', '1.2.3-alpha.9')).toBe(1)
    })

    it('ignores build metadata', () => {
        expect(comparePluginVersions('1.2.3+build.1', '1.2.3+build.99')).toBe(0)
    })

    it('keeps legacy dot-numeric fallback behavior', () => {
        expect(comparePluginVersions('1.2.10', '1.2.9')).toBe(1)
    })
})

describe('getPluginUpdateFetchInit', () => {
    it('bypasses the browser cache for metadata checks', () => {
        const init = getPluginUpdateFetchInit(true)
        expect(init.cache).toBe('no-store')
        expect(init.method).toBe('GET')
        expect(init.headers).toEqual({ Range: 'bytes=0-512' })
    })

    it('bypasses the browser cache for full plugin downloads', () => {
        const init = getPluginUpdateFetchInit(false)
        expect(init.cache).toBe('no-store')
        expect(init.method).toBe('GET')
        expect(init.headers).toBeUndefined()
    })
})
