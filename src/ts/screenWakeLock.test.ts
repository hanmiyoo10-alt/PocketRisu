/* @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { installScreenWakeLock } from "./screenWakeLock";

function setVisibilityState(state: DocumentVisibilityState) {
    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: state,
    });
}

function setWakeLockApi(value: unknown) {
    Object.defineProperty(navigator, "wakeLock", {
        configurable: true,
        value,
    });
}

function createSentinel() {
    const events = new EventTarget();
    return {
        addEventListener: events.addEventListener.bind(events),
        release: vi.fn(async () => {
            events.dispatchEvent(new Event("release"));
        }),
    };
}

async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

afterEach(() => {
    setWakeLockApi(undefined);
    setVisibilityState("visible");
});

describe("installScreenWakeLock", () => {
    it("requests a screen wake lock while the document is visible", async () => {
        setVisibilityState("visible");
        const sentinel = createSentinel();
        const request = vi.fn(async () => sentinel);
        setWakeLockApi({ request });

        const dispose = installScreenWakeLock();
        await flushPromises();

        expect(request).toHaveBeenCalledTimes(1);
        expect(request).toHaveBeenCalledWith("screen");

        dispose();
        await flushPromises();
        expect(sentinel.release).toHaveBeenCalledTimes(1);
    });

    it("releases while hidden and reacquires when visible again", async () => {
        setVisibilityState("visible");
        const first = createSentinel();
        const second = createSentinel();
        const request = vi.fn()
            .mockResolvedValueOnce(first)
            .mockResolvedValueOnce(second);
        setWakeLockApi({ request });

        const dispose = installScreenWakeLock();
        await flushPromises();

        setVisibilityState("hidden");
        document.dispatchEvent(new Event("visibilitychange"));
        await flushPromises();
        expect(first.release).toHaveBeenCalledTimes(1);

        setVisibilityState("visible");
        document.dispatchEvent(new Event("visibilitychange"));
        await flushPromises();
        expect(request).toHaveBeenCalledTimes(2);

        dispose();
    });

    it("retries after a rejected request on later user interaction", async () => {
        setVisibilityState("visible");
        const sentinel = createSentinel();
        const request = vi.fn()
            .mockRejectedValueOnce(new Error("denied"))
            .mockResolvedValueOnce(sentinel);
        setWakeLockApi({ request });

        const dispose = installScreenWakeLock();
        await flushPromises();
        expect(request).toHaveBeenCalledTimes(1);

        document.dispatchEvent(new Event("pointerdown"));
        await flushPromises();
        expect(request).toHaveBeenCalledTimes(2);

        dispose();
    });

    it("is a no-op when the browser does not expose Screen Wake Lock", () => {
        setWakeLockApi(undefined);
        expect(() => installScreenWakeLock()()).not.toThrow();
    });
});
