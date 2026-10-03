export const DEFAULT_CHAT_LOAD_INITIAL_PAGES = 30
export const DEFAULT_CHAT_LOAD_ADDITIONAL_PAGES = 15
export const DEFAULT_CHAT_SCROLL_RESTORE_MAX_PAGES = 200

export type ChatScrollRestorePlan = {
    shouldRestore: boolean
    neededLoadPages: number
    targetLoadPages: number
}

export function getChatScrollRestorePlan(
    messageCount: number,
    snapshotIndex: number,
    currentLoadPages: number,
    maxAutoRestorePages = DEFAULT_CHAT_SCROLL_RESTORE_MAX_PAGES,
): ChatScrollRestorePlan {
    const current = currentLoadPages === Infinity
        ? Infinity
        : normalizeChatLoadPages(currentLoadPages, DEFAULT_CHAT_LOAD_INITIAL_PAGES)
    const maxAuto = normalizeChatLoadPages(
        maxAutoRestorePages,
        DEFAULT_CHAT_SCROLL_RESTORE_MAX_PAGES,
    )

    if (
        !Number.isInteger(messageCount) ||
        messageCount < 1 ||
        !Number.isInteger(snapshotIndex) ||
        snapshotIndex < 0 ||
        snapshotIndex >= messageCount
    ) {
        return {
            shouldRestore: false,
            neededLoadPages: 0,
            targetLoadPages: current,
        }
    }

    const neededLoadPages = Math.max(0, messageCount - snapshotIndex + 5)
    const restoreLimit = current === Infinity
        ? Infinity
        : Math.max(current, maxAuto)
    const shouldRestore = neededLoadPages <= restoreLimit

    return {
        shouldRestore,
        neededLoadPages,
        targetLoadPages: shouldRestore
            ? Math.max(current, neededLoadPages)
            : current,
    }
}

export function normalizeChatLoadPages(value: unknown, fallback: number): number {
    const fallbackValue = Number.isFinite(fallback) && fallback >= 1
        ? Math.floor(fallback)
        : 1
    const numberValue = typeof value === 'number' ? value : Number(value)

    if (!Number.isFinite(numberValue) || numberValue < 1) {
        return fallbackValue
    }

    return Math.floor(numberValue)
}

export function getInitialChatLoadPages(db: { chatLoadInitialPages?: number }): number {
    return normalizeChatLoadPages(db.chatLoadInitialPages, DEFAULT_CHAT_LOAD_INITIAL_PAGES)
}

export function getAdditionalChatLoadPages(db: { chatLoadAdditionalPages?: number }): number {
    return normalizeChatLoadPages(db.chatLoadAdditionalPages, DEFAULT_CHAT_LOAD_ADDITIONAL_PAGES)
}
