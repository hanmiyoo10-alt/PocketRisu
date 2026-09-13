type WakeLockSentinelLike = {
    release(): Promise<void>;
    addEventListener(type: "release", listener: EventListener, options?: AddEventListenerOptions | boolean): void;
};

type WakeLockNavigator = Navigator & {
    wakeLock?: {
        request(type: "screen"): Promise<WakeLockSentinelLike>;
    };
};

const noop = () => {};

/**
 * Keep the display awake while the PocketRisu document is visible.
 *
 * Screen Wake Lock is intentionally best-effort: unsupported browsers,
 * permission/power-policy rejection, and automatic browser release must not
 * make the rest of the app fail. A later visibility change or user action
 * retries acquisition when no lock is currently held.
 */
export function installScreenWakeLock(): () => void {
    const wakeLockApi = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLockApi) {
        return noop;
    }

    let sentinel: WakeLockSentinelLike | null = null;
    let requestInFlight: Promise<void> | null = null;
    let disposed = false;

    const releaseCurrent = () => {
        const current = sentinel;
        sentinel = null;
        if (current) {
            void current.release().catch(() => {});
        }
    };

    const request = () => {
        if (
            disposed ||
            document.visibilityState !== "visible" ||
            sentinel ||
            requestInFlight
        ) {
            return;
        }

        requestInFlight = wakeLockApi.request("screen")
            .then((next) => {
                if (disposed) {
                    void next.release().catch(() => {});
                    return;
                }

                sentinel = next;
                next.addEventListener("release", () => {
                    if (sentinel === next) {
                        sentinel = null;
                    }
                }, { once: true });
            })
            .catch(() => {
                // Best-effort only. Browser/power policy may reject the request.
            })
            .finally(() => {
                requestInFlight = null;
            });
    };

    const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            request();
        }
        else {
            releaseCurrent();
        }
    };

    const retryOnUserInteraction = () => {
        request();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("pointerdown", retryOnUserInteraction, { passive: true });
    document.addEventListener("keydown", retryOnUserInteraction);

    request();

    return () => {
        disposed = true;
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        document.removeEventListener("pointerdown", retryOnUserInteraction);
        document.removeEventListener("keydown", retryOnUserInteraction);
        releaseCurrent();
    };
}
