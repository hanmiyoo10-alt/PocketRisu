import { describe, expect, test } from 'vitest'
import { buildV3RuntimeTelemetrySnapshot, v3RuntimeTelemetryLogMessage } from './v3RuntimeTelemetry'
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
        const snapshot = buildV3RuntimeTelemetrySnapshot(7, 'visibility:hidden', 'hidden', [
            { scriptChars: 100, host: host({ remoteInstances: 2, pendingCallbacks: 3, activeStreams: 1 }) },
            { scriptChars: 250, host: host({ iframeConnected: false, abortControllers: 4, callbackWrappers: 5 }) },
        ])

        expect(snapshot).toEqual({
            version: 1,
            sequence: 7,
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


    test('uses a unique dedupe key for every lifecycle snapshot', () => {
        expect(v3RuntimeTelemetryLogMessage(1, 'visibility:hidden')).not.toBe(
            v3RuntimeTelemetryLogMessage(2, 'visibility:hidden'),
        )
        expect(v3RuntimeTelemetryLogMessage(2, 'visibility:hidden')).not.toBe(
            v3RuntimeTelemetryLogMessage(3, 'visibility:visible'),
        )
    })

    test('contains no plugin identity or source fields', () => {
        const encoded = JSON.stringify(buildV3RuntimeTelemetrySnapshot(1, 'load-complete', 'visible', [
            { scriptChars: 42, host: host() },
        ]))
        expect(encoded).not.toMatch(/plugin|name|scriptText|storage|prompt|chat/i)
    })
})
