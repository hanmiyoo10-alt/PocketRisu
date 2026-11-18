import { describe, expect, test } from 'vitest'
import { buildV3RuntimeTelemetrySnapshot } from './v3RuntimeTelemetry'
import type { SandboxHostDiagnosticSnapshot } from './factory'

function host(overrides: Partial<SandboxHostDiagnosticSnapshot> = {}): SandboxHostDiagnosticSnapshot {
    return {
        iframeConnected: true,
        remoteInstances: 0,
        abortControllers: 0,
        callbackWrappers: 0,
        pendingCallbacks: 0,
        activeStreams: 0,
        terminated: false,
        ...overrides,
    }
}

describe('buildV3RuntimeTelemetrySnapshot', () => {
    test('aggregates only bounded runtime counts and bytes', () => {
        const snapshot = buildV3RuntimeTelemetrySnapshot('visibility:hidden', 'hidden', [
            { scriptChars: 100, host: host({ remoteInstances: 2, pendingCallbacks: 3, activeStreams: 1 }) },
            { scriptChars: 250, host: host({ iframeConnected: false, abortControllers: 4, callbackWrappers: 5 }) },
        ])

        expect(snapshot).toEqual({
            version: 1,
            event: 'visibility:hidden',
            visibility: 'hidden',
            instanceCount: 2,
            iframeCount: 1,
            aggregateScriptChars: 350,
            remoteInstances: 2,
            pendingCallbacks: 3,
            abortControllers: 4,
            callbackWrappers: 5,
            activeStreams: 1,
        })
    })

    test('contains no plugin identity or source fields', () => {
        const encoded = JSON.stringify(buildV3RuntimeTelemetrySnapshot('load-complete', 'visible', [
            { scriptChars: 42, host: host() },
        ]))
        expect(encoded).not.toMatch(/plugin|name|scriptText|storage|prompt|chat/i)
    })
})
