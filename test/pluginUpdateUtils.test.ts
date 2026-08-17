import { describe, expect, it } from 'vitest'
import { buildPluginUpdateURL, comparePluginVersions, getPluginUpdateFetchAttempts } from '../src/ts/plugins/pluginUpdateUtils'

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

describe('buildPluginUpdateURL', () => {
    it('adds a deterministic cache buster without dropping an existing query', () => {
        const url = buildPluginUpdateURL('https://example.com/plugin.js?channel=stable', 12345)
        expect(url).toBe('https://example.com/plugin.js?channel=stable&_risu_update=12345')
    })
})

describe('getPluginUpdateFetchAttempts', () => {
    it('tries range + no-store first, then progressively safer metadata fallbacks', () => {
        const attempts = getPluginUpdateFetchAttempts(true)
        expect(attempts).toHaveLength(3)
        expect(attempts[0]).toEqual({
            method: 'GET',
            cache: 'no-store',
            headers: { Range: 'bytes=0-512' },
        })
        expect(attempts[1]).toEqual({ method: 'GET', cache: 'no-store' })
        expect(attempts[2]).toEqual({ method: 'GET' })
    })

    it('falls back from no-store to a plain full GET for plugin downloads', () => {
        const attempts = getPluginUpdateFetchAttempts(false)
        expect(attempts).toEqual([
            { method: 'GET', cache: 'no-store' },
            { method: 'GET' },
        ])
    })
})
