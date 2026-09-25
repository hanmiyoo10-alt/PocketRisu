import { describe, expect, test, vi } from 'vitest'
import { WriterEditGuard } from './writerEditGuard'

describe('WriterEditGuard', () => {
    test('unblocked page stays writable without a server check', async () => {
        const guard = new WriterEditGuard()
        const getWriterLockState = vi.fn(async () => 'stale')

        await expect(guard.resolve({
            supportsServerLock: true,
            getWriterLockState,
        })).resolves.toBe(true)
        expect(getWriterLockState).not.toHaveBeenCalled()
    })

    test('non-server peer conflict remains blocked', async () => {
        const guard = new WriterEditGuard()
        guard.markPeerActivity()

        await expect(guard.resolve({
            supportsServerLock: false,
            getWriterLockState: async () => 'active',
        })).resolves.toBe(false)
        expect(guard.isBlocked()).toBe(true)
    })

    test('fresh server session clears peer conflict', async () => {
        const guard = new WriterEditGuard()
        guard.markPeerActivity()

        await expect(guard.resolve({
            supportsServerLock: true,
            getWriterLockState: async () => 'fresh',
        })).resolves.toBe(true)
        expect(guard.isBlocked()).toBe(false)
    })

    test('stale server session becomes permanently blocked', async () => {
        const guard = new WriterEditGuard()
        guard.markPeerActivity()

        await expect(guard.resolve({
            supportsServerLock: true,
            getWriterLockState: async () => 'stale',
        })).resolves.toBe(false)
        expect(guard.isStale()).toBe(true)

        await expect(guard.resolve({
            supportsServerLock: true,
            getWriterLockState: async () => 'active',
        })).resolves.toBe(false)
    })

    test('423-style deactivation blocks without another status check', async () => {
        const guard = new WriterEditGuard()
        guard.markSessionDeactivated()
        const getWriterLockState = vi.fn(async () => 'active')

        await expect(guard.resolve({
            supportsServerLock: true,
            getWriterLockState,
        })).resolves.toBe(false)
        expect(getWriterLockState).not.toHaveBeenCalled()
    })

    test('new peer activity during status check keeps the page blocked', async () => {
        const guard = new WriterEditGuard()
        guard.markPeerActivity()
        let release!: (value: string) => void
        const pending = new Promise<string>(resolve => { release = resolve })

        const resolving = guard.resolve({
            supportsServerLock: true,
            getWriterLockState: () => pending,
        })
        guard.markPeerActivity()
        release('fresh')

        await expect(resolving).resolves.toBe(false)
        expect(guard.isBlocked()).toBe(true)
    })
})
