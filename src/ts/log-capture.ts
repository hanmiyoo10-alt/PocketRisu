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


const LIFECYCLE_TRACE_KEY = 'risu-lifecycle-trace-v1'
const LIFECYCLE_TRACE_MAX = 80
const LIFECYCLE_MIRROR_DELAY_MS = 12_000
// server/node/logs.cjs caps each description at 10 KiB. Keep a safety margin so
// lifecycle mirror rows stay valid JSON instead of being byte-truncated.
const LIFECYCLE_MIRROR_MAX_BYTES = 8 * 1024
const lifecycleBootId =
    (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID().slice(0, 8)
        : Date.now().toString(36)

let lifecycleMirrorTimer: ReturnType<typeof setTimeout> | null = null

function getWriterSessionId(): string | null {
    try {
        return sessionStorage.getItem('risu-writer-session-id')?.slice(0, 8) ?? null
    } catch {
        return null
    }
}

function getNavigationType(): string {
    try {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
        return nav?.type ?? 'unknown'
    } catch {
        return 'unknown'
    }
}

function getDocumentWasDiscarded(): boolean | null {
    try {
        const value = (document as any).wasDiscarded
        return typeof value === 'boolean' ? value : null
    } catch {
        return null
    }
}

function isNoV3DiagnosticDocument(): boolean {
    try {
        return new URLSearchParams(window.location.search).get('risuDiagNoV3') === '1'
    } catch {
        return false
    }
}

function recordLifecycleForegroundCheckpoint() {
    addLog({
        level: 'info',
        message: 'Lifecycle foreground checkpoint',
        description: JSON.stringify({
            bootId: lifecycleBootId,
            navType: getNavigationType(),
            writerSessionId: getWriterSessionId(),
            wasDiscarded: getDocumentWasDiscarded(),
            timeOrigin: Math.round(performance.timeOrigin),
            diagNoV3: isNoV3DiagnosticDocument(),
            iframeCount: document.getElementsByTagName('iframe').length,
        }),
        source: 'lifecycle-probe',
    })
}

function readLifecycleTrace(): unknown[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(LIFECYCLE_TRACE_KEY) ?? '[]')
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function utf8ByteLength(value: string): number {
    try {
        return new TextEncoder().encode(value).byteLength
    } catch {
        return value.length
    }
}

function selectLifecycleMirrorEntries(): unknown[] {
    const source = readLifecycleTrace()
    const selected: unknown[] = []

    for (let i = source.length - 1; i >= 0; i--) {
        const candidate = [source[i], ...selected]
        const serialized = JSON.stringify(candidate)

        if (utf8ByteLength(serialized) > LIFECYCLE_MIRROR_MAX_BYTES) {
            break
        }

        selected.unshift(source[i])
    }

    return selected
}

function scheduleLifecycleMirror() {
    if (document.visibilityState !== 'visible') return
    if (lifecycleMirrorTimer) clearTimeout(lifecycleMirrorTimer)

    lifecycleMirrorTimer = setTimeout(() => {
        lifecycleMirrorTimer = null
        const entries = selectLifecycleMirrorEntries()
        if (entries.length === 0) return

        addLog({
            level: 'info',
            message: 'Lifecycle trace snapshot',
            description: JSON.stringify(entries),
            source: 'lifecycle',
        })
    }, LIFECYCLE_MIRROR_DELAY_MS)
}

export type RenderWindowDiagnostic = {
    phase: 'hidden' | 'visible' | 'pagehide'
    loadPages: number | 'infinity'
    messageCount: number
    mountedMessageCount: number
    initialLoadPages: number
    chatReady: boolean
    restoringChatScroll: boolean
    scrollingToMessage: boolean
    screenshotInProgress: boolean
    folded: boolean
}

export type PagePressureDiagnostic = {
    phase: 'sample' | 'hidden-cache' | 'pagehide-cache'
    sampleAgeMs: number
    characterCount: number
    chatCount: number
    hydratedChatCount: number
    placeholderChatCount: number
    loadedMessageCount: number
    messagesWithPromptInfo: number
    messagesWithPromptText: number
    promptTextBlockCount: number
    currentChatMessageCount: number
    currentChatDataCodeUnits: number
    currentChatSwipeCodeUnits: number
    currentChatPromptTextBlocks: number
    currentChatPromptTextCodeUnits: number
    domElementCount: number
    imageCount: number
    decodedImageBytesEstimate: number
    canvasCount: number
    canvasBytesEstimate: number
    iframeCount: number
    sandboxedIframeCount: number
    srcdocIframeCount: number
    hiddenInlineIframeCount: number
    wakeLockIframeCount: number
    iframeSrcdocCodeUnits: number
    iframeSrcdocMinCodeUnits: number
    iframeSrcdocMedianCodeUnits: number
    iframeSrcdocMaxCodeUnits: number
    enabledPluginCount: number
    enabledV2PluginCount: number
    enabledV3PluginCount: number
    keepSessionAliveMode: 'off' | 'pip' | 'sound' | 'unknown'
    audioCount: number
    videoCount: number
    performanceMemorySupported: boolean
    usedJSHeapSize?: number
    totalJSHeapSize?: number
    jsHeapSizeLimit?: number
    deviceMemoryGiB?: number
}

function appendLifecycleTrace(
    event: string,
    persisted?: boolean,
    renderWindow?: RenderWindowDiagnostic,
    pagePressure?: PagePressureDiagnostic,
) {
    try {
        const entries = readLifecycleTrace()
        entries.push({
            t: Date.now(),
            bootId: lifecycleBootId,
            event,
            visibility: document.visibilityState,
            persisted,
            navType: getNavigationType(),
            writerSessionId: getWriterSessionId(),
            wasDiscarded: getDocumentWasDiscarded(),
            timeOrigin: Math.round(performance.timeOrigin),
            ...(renderWindow ? { renderWindow } : {}),
            ...(pagePressure ? { pagePressure } : {}),
        })

        localStorage.setItem(
            LIFECYCLE_TRACE_KEY,
            JSON.stringify(entries.slice(-LIFECYCLE_TRACE_MAX)),
        )
    } catch {
        // Diagnostic only: lifecycle tracing must never affect app startup.
    }

    scheduleLifecycleMirror()
}

export function recordRenderWindowDiagnostic(detail: RenderWindowDiagnostic) {
    appendLifecycleTrace('render-window:' + detail.phase, undefined, detail)
}

export function recordPagePressureDiagnostic(detail: PagePressureDiagnostic) {
    appendLifecycleTrace('page-pressure:' + detail.phase, undefined, undefined, detail)
}

function installLifecycleTrace() {
    if (typeof window === 'undefined') return

    appendLifecycleTrace('boot')

    document.addEventListener('visibilitychange', () => {
        appendLifecycleTrace(`visibility:${document.visibilityState}`)
        if (document.visibilityState === 'visible') {
            recordLifecycleForegroundCheckpoint()
        }
    })

    window.addEventListener('pagehide', (event) => {
        appendLifecycleTrace('pagehide', event.persisted)
    })

    window.addEventListener('pageshow', (event) => {
        appendLifecycleTrace('pageshow', event.persisted)
    })
}

installLifecycleTrace()

installLogCapture()
