import { describe, expect, test } from 'vitest'
import { createV3BackgroundGuard, type V3BackgroundGuardScheduler } from './v3BackgroundGuard'

type TimerEntry = { id: number, callback: () => void, delay: number }

function harness(isAndroidFirefox = true) {
    let visibility = 'visible'
    let generating = false
    let liveRequests = false
    let fullscreen = false
    let instances = 13
    let nextTimer = 1
    const timers = new Map<number, TimerEntry>()
    const events: string[] = []
    const errors: unknown[] = []
    let suspendGate: Promise<void> | null = null
    let releaseSuspend: (() => void) | null = null

    const scheduler: V3BackgroundGuardScheduler = {
        setTimeout(callback, delay) {
            const id = nextTimer++
            timers.set(id, { id, callback, delay })
            return id as unknown as ReturnType<typeof setTimeout>
        },
        clearTimeout(timer) {
            timers.delete(timer as unknown as number)
        },
    }

    const guard = createV3BackgroundGuard({
        isAndroidFirefox,
        getVisibility: () => visibility,
        isGenerating: () => generating,
        hasLiveRequests: () => liveRequests,
        hasFullscreenFrame: () => fullscreen,
        getInstanceCount: () => instances,
        suspend: async () => {
            if (suspendGate) await suspendGate
            instances = 0
        },
        resume: async () => { instances = 13 },
        onEvent: (event, count) => events.push(`${event}:${count}`),
        onError: (error) => errors.push(error),
    }, scheduler)

    const fireTimers = async () => {
        const pending = [...timers.values()]
        timers.clear()
        for (const timer of pending) timer.callback()
        await guard.whenSettled()
    }

    return {
        guard,
        timers,
        events,
        errors,
        fireTimers,
        setVisibility: (v: string) => { visibility = v },
        setGenerating: (v: boolean) => { generating = v },
        setLiveRequests: (v: boolean) => { liveRequests = v },
        setFullscreen: (v: boolean) => { fullscreen = v },
        setInstances: (v: number) => { instances = v },
        getInstances: () => instances,
        blockSuspend: () => {
            suspendGate = new Promise<void>((resolve) => { releaseSuspend = resolve })
        },
        releaseSuspend: () => {
            releaseSuspend?.()
            suspendGate = null
            releaseSuspend = null
        },
    }
}

describe('V3 Android Firefox background guard', () => {
    test('suspends after the hidden grace and resumes on visible', async () => {
        const h = harness()
        h.setVisibility('hidden')
        h.guard.reconcile()
        expect([...h.timers.values()].map(t => t.delay)).toEqual([5000])

        await h.fireTimers()
        expect(h.guard.isSuspended()).toBe(true)
        expect(h.getInstances()).toBe(0)
        expect(h.events).toEqual(['suspended:13'])

        h.setVisibility('visible')
        h.guard.reconcile()
        await h.guard.whenSettled()
        expect(h.guard.isSuspended()).toBe(false)
        expect(h.getInstances()).toBe(13)
        expect(h.events).toEqual(['suspended:13', 'resumed:13'])
    })

    test('short hidden switch cancels before suspension', async () => {
        const h = harness()
        h.setVisibility('hidden')
        h.guard.reconcile()
        expect(h.timers.size).toBe(1)
        h.setVisibility('visible')
        h.guard.reconcile()
        expect(h.timers.size).toBe(0)
        await h.fireTimers()
        expect(h.events).toEqual([])
        expect(h.getInstances()).toBe(13)
    })

    test('live generation or request blocks suspension until idle', async () => {
        const h = harness()
        h.setVisibility('hidden')
        h.setGenerating(true)
        h.guard.reconcile()
        expect(h.timers.size).toBe(0)

        h.setGenerating(false)
        h.setLiveRequests(true)
        h.guard.reconcile()
        expect(h.timers.size).toBe(0)

        h.setLiveRequests(false)
        h.guard.reconcile()
        expect(h.timers.size).toBe(1)
        await h.fireTimers()
        expect(h.guard.isSuspended()).toBe(true)
    })

    test('fullscreen frame fails open and keeps sandboxes running', async () => {
        const h = harness()
        h.setVisibility('hidden')
        h.setFullscreen(true)
        h.guard.reconcile()
        expect(h.timers.size).toBe(0)
        await h.fireTimers()
        expect(h.events).toEqual([])
        expect(h.getInstances()).toBe(13)
    })

    test('becoming visible while unload is settling restores immediately', async () => {
        const h = harness()
        h.blockSuspend()
        h.setVisibility('hidden')
        h.guard.reconcile()

        const pending = [...h.timers.values()]
        h.timers.clear()
        pending[0].callback()
        await Promise.resolve()
        h.setVisibility('visible')
        h.guard.reconcile()
        h.releaseSuspend()
        await h.guard.whenSettled()

        expect(h.guard.isSuspended()).toBe(false)
        expect(h.getInstances()).toBe(13)
        expect(h.events).toEqual(['suspended:13', 'resumed:13'])
    })

    test('a request that starts while suspended restores plugins even while hidden', async () => {
        const h = harness()
        h.setVisibility('hidden')
        h.guard.reconcile()
        await h.fireTimers()
        expect(h.guard.isSuspended()).toBe(true)
        expect(h.getInstances()).toBe(0)

        h.setLiveRequests(true)
        h.guard.reconcile()
        await h.guard.whenSettled()
        expect(h.guard.isSuspended()).toBe(false)
        expect(h.getInstances()).toBe(13)
        expect(h.events).toEqual(['suspended:13', 'resumed:13'])
    })

    test('non-Android Firefox runtime never schedules or suspends', async () => {
        const h = harness(false)
        h.setVisibility('hidden')
        h.guard.reconcile()
        expect(h.timers.size).toBe(0)
        await h.fireTimers()
        expect(h.events).toEqual([])
        expect(h.getInstances()).toBe(13)
    })

    test('work lease restores a suspended runtime and blocks resuspend until release', async () => {
        const h = harness()
        h.setVisibility('hidden')
        h.guard.reconcile()
        await h.fireTimers()
        expect(h.guard.isSuspended()).toBe(true)
        expect(h.getInstances()).toBe(0)

        const release = await h.guard.acquireWork()
        expect(h.guard.isSuspended()).toBe(false)
        expect(h.getInstances()).toBe(13)
        h.guard.reconcile()
        expect(h.timers.size).toBe(0)

        release()
        expect(h.timers.size).toBe(1)
    })

    test('work lease arriving during suspension waits through restore', async () => {
        const h = harness()
        h.blockSuspend()
        h.setVisibility('hidden')
        h.guard.reconcile()

        const pending = [...h.timers.values()]
        h.timers.clear()
        pending[0].callback()
        await Promise.resolve()

        const leasePromise = h.guard.acquireWork()
        h.releaseSuspend()
        const release = await leasePromise

        expect(h.guard.isSuspended()).toBe(false)
        expect(h.getInstances()).toBe(13)
        expect(h.events).toEqual(['suspended:13', 'resumed:13'])
        release()
        expect(h.timers.size).toBe(1)
    })

    test('external plugin reload while hidden converges back to suspension', async () => {
        const h = harness()
        h.setVisibility('hidden')
        h.guard.reconcile()
        await h.fireTimers()
        expect(h.guard.isSuspended()).toBe(true)
        expect(h.getInstances()).toBe(0)

        h.setInstances(13)
        h.guard.reconcile()
        expect(h.timers.size).toBe(1)
        await h.fireTimers()
        expect(h.getInstances()).toBe(0)
    })
})
