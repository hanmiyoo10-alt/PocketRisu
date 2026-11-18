export const V3_BACKGROUND_SUSPEND_DELAY_MS = 5_000

export type V3BackgroundGuardEvent = 'suspended' | 'resumed'

export interface V3BackgroundGuardDeps {
    isAndroidFirefox: boolean
    getVisibility: () => string
    isGenerating: () => boolean
    hasLiveRequests: () => boolean
    hasFullscreenFrame: () => boolean
    getInstanceCount: () => number
    suspend: () => Promise<void>
    resume: () => Promise<void>
    onEvent?: (event: V3BackgroundGuardEvent, instanceCount: number) => void
    onError?: (error: unknown) => void
}

export interface V3BackgroundGuardScheduler {
    setTimeout: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>
    clearTimeout: (timer: ReturnType<typeof setTimeout>) => void
}

const defaultScheduler: V3BackgroundGuardScheduler = {
    setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
    clearTimeout: (timer) => clearTimeout(timer),
}

export function createV3BackgroundGuard(
    deps: V3BackgroundGuardDeps,
    scheduler: V3BackgroundGuardScheduler = defaultScheduler,
    delayMs = V3_BACKGROUND_SUSPEND_DELAY_MS,
) {
    let timer: ReturnType<typeof setTimeout> | null = null
    let suspended = false
    let disposed = false
    let transition: Promise<void> = Promise.resolve()

    const hasActiveWork = () => deps.isGenerating() || deps.hasLiveRequests()

    const canSuspendNow = () => (
        deps.isAndroidFirefox
        && deps.getVisibility() === 'hidden'
        && !hasActiveWork()
        && !deps.hasFullscreenFrame()
        && deps.getInstanceCount() > 0
    )

    const cancelTimer = () => {
        if (timer === null) return
        scheduler.clearTimeout(timer)
        timer = null
    }

    const reportError = (error: unknown) => {
        deps.onError?.(error)
    }

    const performResume = async () => {
        if (!suspended) return
        await deps.resume()
        suspended = false
        deps.onEvent?.('resumed', deps.getInstanceCount())
    }

    const performSuspend = async () => {
        if (disposed || !canSuspendNow()) return
        const before = deps.getInstanceCount()
        await deps.suspend()
        suspended = true
        deps.onEvent?.('suspended', before)

        // Visibility or request state may change while unload callbacks settle.
        // Restore immediately rather than leaving an active/foreground page with
        // its plugin runtime torn down.
        if (deps.getVisibility() !== 'hidden' || hasActiveWork()) {
            await performResume()
        }
    }

    const enqueue = (task: () => Promise<void>) => {
        const next = transition.then(task, task)
        transition = next.catch(reportError)
        return next
    }

    const scheduleSuspend = () => {
        if (timer !== null || disposed) return
        timer = scheduler.setTimeout(() => {
            timer = null
            void enqueue(performSuspend)
        }, delayMs)
    }

    const reconcile = () => {
        if (disposed || !deps.isAndroidFirefox) {
            cancelTimer()
            return
        }

        if (deps.getVisibility() !== 'hidden') {
            cancelTimer()
            if (suspended) {
                // Another normal plugin reload may already have restored the
                // instances while this guard still remembers suspension.
                if (deps.getInstanceCount() > 0) suspended = false
                else void enqueue(performResume)
            }
            return
        }

        if (hasActiveWork()) {
            cancelTimer()
            if (suspended) {
                if (deps.getInstanceCount() > 0) suspended = false
                else void enqueue(performResume)
            }
            return
        }

        if (deps.hasFullscreenFrame()) {
            cancelTimer()
            return
        }

        if (suspended && deps.getInstanceCount() === 0) return
        scheduleSuspend()
    }

    const dispose = () => {
        disposed = true
        cancelTimer()
    }

    return {
        reconcile,
        dispose,
        isSuspended: () => suspended,
        whenSettled: () => transition,
    }
}
