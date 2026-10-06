//
// Automatic log capture for the client.
//
// Monkey-patches console.error / console.warn and registers window error
// handlers so every error or warning — including those from libraries that
// never hit the explicit notify* / alert* APIs — is persisted to logs.db.
// This is a deliberate observability pattern, matching what Sentry, Bugsnag,
// LogRocket, and DataDog Browser Logs do. See .agent/notes/toast-alert-revamp.md
// for design rationale.
//
// console.log is intentionally NOT patched: it carries too much debug-only
// noise (library progress reports, initialization breadcrumbs).
//
import { addLog, type LogLevel } from './log'

// Snapshot of the native console methods, captured at module eval time before
// installConsolePatch() runs. Exported so callers that want to print to
// devtools without triggering the log capture (e.g. alert.ts alertError,
// which persists its own addLog entry with a semantic source tag) can
// bypass the monkey-patch.
export const nativeConsoleError = console.error.bind(console)
export const nativeConsoleWarn = console.warn.bind(console)

let installed = false
let inLog = false

function formatArg(arg: unknown): string {
    if (arg instanceof Error) return arg.stack || arg.message || String(arg)
    if (arg === null || arg === undefined) return String(arg)
    if (typeof arg === 'string') return arg
    try { return JSON.stringify(arg) } catch { return String(arg) }
}

function buildEntry(args: unknown[]): { message: string; description?: string } {
    if (args.length === 0) return { message: '' }
    if (args.length === 1) {
        const a = args[0]
        if (a instanceof Error) return { message: a.message || String(a), description: a.stack }
        return { message: formatArg(a) }
    }
    const [first, ...rest] = args
    return { message: formatArg(first), description: rest.map(formatArg).join(' ') }
}

function patch(level: LogLevel, orig: (...a: unknown[]) => void): (...a: unknown[]) => void {
    return (...args: unknown[]) => {
        if (!inLog) {
            inLog = true
            try {
                const { message, description } = buildEntry(args)
                addLog({ level, message, description, source: 'console' })
            } catch { /* never crash callers */ }
            finally { inLog = false }
        }
        orig.apply(console, args)
    }
}

function installConsolePatch() {
    console.error = patch('error', nativeConsoleError)
    console.warn = patch('warning', nativeConsoleWarn)
}

function installGlobalHandlers() {
    if (typeof window === 'undefined') return

    window.addEventListener('error', (ev) => {
        const err = ev.error instanceof Error ? ev.error : null
        addLog({
            level: 'error',
            message: ev.message || 'uncaught error',
            description: err?.stack ?? (ev.filename ? `at ${ev.filename}:${ev.lineno ?? '?'}:${ev.colno ?? '?'}` : undefined),
            source: 'uncaught',
        })
    })

    window.addEventListener('unhandledrejection', (ev) => {
        const reason = ev.reason
        const err = reason instanceof Error ? reason : null
        addLog({
            level: 'error',
            message: err?.message || String(reason),
            description: err?.stack,
            source: 'promise',
        })
    })
}

export function installLogCapture() {
    if (installed) return
    installed = true
    installConsolePatch()
    installGlobalHandlers()
}

const LIFECYCLE_TRACE_KEY = 'risu-lifecycle-trace-v2'
const LIFECYCLE_TRACE_MAX = 24
const LIFECYCLE_MIRROR_MAX = 12
const lifecycleBootId =
    (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID().slice(0, 8)
        : Date.now().toString(36)

type LifecycleTraceEntry = {
    t: number
    bootId: string
    event: string
    visibility: DocumentVisibilityState
    persisted?: boolean
    navType: string
    writerSessionId: string | null
    wasDiscarded: boolean | null
    timeOrigin: number
    readyState: DocumentReadyState
    historyLength: number
}

let lifecycleMirrorTimer: ReturnType<typeof setTimeout> | null = null

function getLifecycleNavigationType(): string {
    try {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
        return nav?.type ?? 'unknown'
    } catch {
        return 'unknown'
    }
}

function getLifecycleWriterSessionId(): string | null {
    try {
        return sessionStorage.getItem('risu-writer-session-id')?.slice(0, 8) ?? null
    } catch {
        return null
    }
}

function getLifecycleWasDiscarded(): boolean | null {
    try {
        const value = (document as Document & { wasDiscarded?: boolean }).wasDiscarded
        return typeof value === 'boolean' ? value : null
    } catch {
        return null
    }
}

function readLifecycleTrace(): LifecycleTraceEntry[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(LIFECYCLE_TRACE_KEY) ?? '[]')
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function mirrorLifecycleTrace() {
    if (document.visibilityState !== 'visible') return
    if (lifecycleMirrorTimer) clearTimeout(lifecycleMirrorTimer)
    lifecycleMirrorTimer = setTimeout(() => {
        lifecycleMirrorTimer = null
        const entries = readLifecycleTrace().slice(-LIFECYCLE_MIRROR_MAX)
        if (entries.length === 0) return
        addLog({
            level: 'info',
            message: 'Lifecycle trace snapshot',
            description: JSON.stringify(entries),
            source: 'lifecycle',
        })
    }, 2_000)
}

function recordLifecycleEvent(event: string, persisted?: boolean) {
    if (typeof window === 'undefined') return

    const entry: LifecycleTraceEntry = {
        t: Date.now(),
        bootId: lifecycleBootId,
        event,
        visibility: document.visibilityState,
        persisted,
        navType: getLifecycleNavigationType(),
        writerSessionId: getLifecycleWriterSessionId(),
        wasDiscarded: getLifecycleWasDiscarded(),
        timeOrigin: Math.round(performance.timeOrigin),
        readyState: document.readyState,
        historyLength: history.length,
    }

    try {
        const entries = readLifecycleTrace()
        entries.push(entry)
        localStorage.setItem(
            LIFECYCLE_TRACE_KEY,
            JSON.stringify(entries.slice(-LIFECYCLE_TRACE_MAX)),
        )
    } catch {
        // Diagnostic only. Never affect startup.
    }

    addLog({
        level: 'info',
        message: 'Lifecycle event',
        description: JSON.stringify(entry),
        source: 'lifecycle-probe',
    })

    mirrorLifecycleTrace()
}

function installLifecycleTrace() {
    if (typeof window === 'undefined') return

    recordLifecycleEvent('boot')

    document.addEventListener('visibilitychange', () => {
        recordLifecycleEvent(`visibility:${document.visibilityState}`)
    })

    window.addEventListener('pagehide', (event) => {
        recordLifecycleEvent('pagehide', event.persisted)
    })

    window.addEventListener('pageshow', (event) => {
        recordLifecycleEvent('pageshow', event.persisted)
    })
}

installLogCapture()
installLifecycleTrace()
