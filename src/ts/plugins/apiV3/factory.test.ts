import { afterEach, describe, expect, test, vi } from 'vitest'
import { SandboxHost } from './factory'

// collectTransferables() checks `instanceof ImageBitmap`, which happy-dom lacks.
if (typeof ImageBitmap === 'undefined') vi.stubGlobal('ImageBitmap', class {})

// A host whose iframe is a stub: callbacks from the plugin come back as
// wrappers that post INVOKE_CALLBACK and wait for CALLBACK_RETURN, which a
// stub never sends — the state of a plugin that was unloaded mid-call.
function hostWithCallback() {
    const host = new SandboxHost({})
    const postMessage = vi.fn()
    ;(host as any).iframe = { contentWindow: { postMessage }, remove: vi.fn() }
    const [callback] = (host as any).deserializeArgs([{ __type: 'CALLBACK_REF', id: 'cb1' }])
    return { host, callback: callback as (...args: any[]) => Promise<unknown>, postMessage }
}

const unhandled: unknown[] = []
const onUnhandled = (reason: unknown) => { unhandled.push(reason) }

afterEach(() => {
    process.off('unhandledRejection', onUnhandled)
    unhandled.length = 0
})

describe('SandboxHost.terminate', () => {
    test('rejects a callback still waiting on the iframe', async () => {
        const { host, callback, postMessage } = hostWithCallback()
        const call = callback('x')
        expect(postMessage).toHaveBeenCalledTimes(1)

        host.terminate()

        await expect(call).rejects.toThrow('Sandbox terminated')
    })

    test('fails a callback called after termination without posting it', async () => {
        const { host, callback, postMessage } = hostWithCallback()
        host.terminate()

        await expect(callback('x')).rejects.toThrow('Sandbox terminated')
        expect(postMessage).not.toHaveBeenCalled()
    })

    test('a call nobody awaits does not become an unhandled rejection', async () => {
        process.on('unhandledRejection', onUnhandled)
        const { host, callback } = hostWithCallback()

        callback('pending at terminate')
        host.terminate()
        callback('after terminate')
        await new Promise((r) => setTimeout(r, 10))

        expect(unhandled).toEqual([])
    })
})


describe('SandboxHost plugin readiness', () => {
    test('waits until the iframe reports PLUGIN_READY', async () => {
        const host = new SandboxHost({})
        const iframe = document.createElement('iframe')
        document.body.appendChild(iframe)
        host.run(iframe, '')

        let settled = false
        const ready = host.waitUntilReady().then(() => { settled = true })
        await Promise.resolve()
        expect(settled).toBe(false)

        window.dispatchEvent(new MessageEvent('message', {
            source: iframe.contentWindow,
            data: { type: 'PLUGIN_READY' },
        }))
        await ready
        expect(settled).toBe(true)
        host.terminate()
    })

    test('rejects readiness when the sandbox terminates first', async () => {
        const host = new SandboxHost({})
        const iframe = document.createElement('iframe')
        document.body.appendChild(iframe)
        host.run(iframe, '')
        const ready = host.waitUntilReady()

        host.terminate()

        await expect(ready).rejects.toThrow('Sandbox terminated before plugin initialization completed')
    })
})
