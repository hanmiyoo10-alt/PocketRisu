import { describe, expect, it } from 'vitest'
import {
    DEFAULT_CHAT_LOAD_ADDITIONAL_PAGES,
    DEFAULT_CHAT_LOAD_INITIAL_PAGES,
    DEFAULT_CHAT_SCROLL_RESTORE_MAX_PAGES,
    getAdditionalChatLoadPages,
    getChatScrollRestorePlan,
    getInitialChatLoadPages,
    normalizeChatLoadPages,
} from './chatLoadPages'

describe('normalizeChatLoadPages', () => {
    it('keeps positive finite counts as integers', () => {
        expect(normalizeChatLoadPages(42, DEFAULT_CHAT_LOAD_INITIAL_PAGES)).toBe(42)
        expect(normalizeChatLoadPages(7.9, DEFAULT_CHAT_LOAD_INITIAL_PAGES)).toBe(7)
    })

    it('falls back for invalid counts', () => {
        expect(normalizeChatLoadPages(0, DEFAULT_CHAT_LOAD_INITIAL_PAGES)).toBe(DEFAULT_CHAT_LOAD_INITIAL_PAGES)
        expect(normalizeChatLoadPages(-1, DEFAULT_CHAT_LOAD_INITIAL_PAGES)).toBe(DEFAULT_CHAT_LOAD_INITIAL_PAGES)
        expect(normalizeChatLoadPages(Infinity, DEFAULT_CHAT_LOAD_INITIAL_PAGES)).toBe(DEFAULT_CHAT_LOAD_INITIAL_PAGES)
        expect(normalizeChatLoadPages(Number.NaN, DEFAULT_CHAT_LOAD_INITIAL_PAGES)).toBe(DEFAULT_CHAT_LOAD_INITIAL_PAGES)
        expect(normalizeChatLoadPages('', DEFAULT_CHAT_LOAD_INITIAL_PAGES)).toBe(DEFAULT_CHAT_LOAD_INITIAL_PAGES)
    })

    it('uses built-in defaults for chat load settings', () => {
        expect(getInitialChatLoadPages({})).toBe(DEFAULT_CHAT_LOAD_INITIAL_PAGES)
        expect(getInitialChatLoadPages({ chatLoadInitialPages: 12 })).toBe(12)
        expect(getAdditionalChatLoadPages({})).toBe(DEFAULT_CHAT_LOAD_ADDITIONAL_PAGES)
        expect(getAdditionalChatLoadPages({ chatLoadAdditionalPages: 8 })).toBe(8)
    })
})

describe('getChatScrollRestorePlan', () => {
    it('skips a deep saved position that would expand a long chat to thousands of mounts', () => {
        expect(getChatScrollRestorePlan(3712, 307, 30)).toEqual({
            shouldRestore: false,
            neededLoadPages: 3410,
            targetLoadPages: 30,
        })
    })

    it('restores a nearby saved position within the automatic render budget', () => {
        expect(getChatScrollRestorePlan(3712, 3600, 30)).toEqual({
            shouldRestore: true,
            neededLoadPages: 117,
            targetLoadPages: 117,
        })
    })

    it('never shrinks a range that is already rendered', () => {
        expect(getChatScrollRestorePlan(3712, 3400, 500)).toEqual({
            shouldRestore: true,
            neededLoadPages: 317,
            targetLoadPages: 500,
        })
    })

    it('uses the documented automatic restore budget by default', () => {
        expect(DEFAULT_CHAT_SCROLL_RESTORE_MAX_PAGES).toBe(200)
    })
})
