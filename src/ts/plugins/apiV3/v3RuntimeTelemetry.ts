import type { SandboxHostDiagnosticSnapshot } from './factory'

export type V3RuntimeTelemetryInput = {
    scriptChars: number
    host: SandboxHostDiagnosticSnapshot
}

export type V3RuntimeTelemetrySnapshot = {
    version: 1
    sequence: number
    event: string
    visibility: string
    instanceCount: number
    iframeCount: number
    aggregateScriptChars: number
    remoteInstances: number
    pendingCallbacks: number
    abortControllers: number
    callbackWrappers: number
    activeStreams: number
}

export function v3RuntimeTelemetryLogMessage(sequence: number, event: string): string {
    return `V3 runtime lifecycle snapshot #${sequence}: ${event}`
}

export function buildV3RuntimeTelemetrySnapshot(
    sequence: number,
    event: string,
    visibility: string,
    instances: V3RuntimeTelemetryInput[],
): V3RuntimeTelemetrySnapshot {
    const total = (key: keyof SandboxHostDiagnosticSnapshot) =>
        instances.reduce((sum, instance) => sum + Number(instance.host[key] || 0), 0)

    return {
        version: 1,
        sequence,
        event,
        visibility,
        instanceCount: instances.length,
        iframeCount: instances.filter(instance => instance.host.iframeConnected).length,
        aggregateScriptChars: instances.reduce((sum, instance) => sum + Math.max(0, instance.scriptChars || 0), 0),
        remoteInstances: total('remoteInstances'),
        pendingCallbacks: total('pendingCallbacks'),
        abortControllers: total('abortControllers'),
        callbackWrappers: total('callbackWrappers'),
        activeStreams: total('activeStreams'),
    }
}
