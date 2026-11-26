import { describe, expect, it, vi } from 'vitest'
import {
    hydrateAllBotPresets,
    hydrateBotPresetAtIndex,
    isBotPresetHydrationTransitionActive,
    isBotPresetStub,
} from './botPresetHydration'

function stub(id: string, name = id) {
    return { id, name, folderId: 'folder-old', _presetStub: true }
}

function full(id: string, name = id) {
    return {
        id,
        name,
        folderId: 'folder-full',
        mainPrompt: `prompt-${id}`,
        regex: [{ id: `regex-${id}` }],
    }
}

describe('bot preset hydration', () => {
    it('does not fetch an already-full preset', async () => {
        const presets = [full('a')]
        const fetcher = vi.fn(async () => full('a'))

        const result = await hydrateBotPresetAtIndex(presets, 0, fetcher)

        expect(result).toBe(presets[0])
        expect(fetcher).not.toHaveBeenCalled()
        expect(isBotPresetHydrationTransitionActive()).toBe(false)
    })

    it('hydrates a stub, preserves metadata edits, and suppresses dirty tracking through the apply tick', async () => {
        const presets = [stub('a', 'A renamed')]
        presets[0].folderId = null as any

        let stateDuringFetch = false
        let stateDuringTick = false
        const fetcher = vi.fn(async () => {
            stateDuringFetch = isBotPresetHydrationTransitionActive()
            return full('a', 'A server')
        })
        const waitForTick = vi.fn(async () => {
            stateDuringTick = isBotPresetHydrationTransitionActive()
        })

        const result = await hydrateBotPresetAtIndex(presets, 0, fetcher, waitForTick)

        expect(stateDuringFetch).toBe(true)
        expect(stateDuringTick).toBe(true)
        expect(isBotPresetHydrationTransitionActive()).toBe(false)
        expect(isBotPresetStub(result)).toBe(false)
        expect(result?.mainPrompt).toBe('prompt-a')
        expect(result?.regex).toEqual([{ id: 'regex-a' }])
        expect(result?.name).toBe('A renamed')
        expect(result?.folderId).toBeNull()
        expect(presets[0]).toBe(result)
    })

    it('resolves the slot by stable id after an index reorder during fetch', async () => {
        const presets = [stub('a'), stub('b')]
        let release!: (value: any) => void
        const pending = new Promise<any>(resolve => { release = resolve })

        const hydration = hydrateBotPresetAtIndex(presets, 0, () => pending, async () => {})
        presets.reverse()
        release(full('a'))

        const result = await hydration

        expect(result?.id).toBe('a')
        expect(isBotPresetStub(presets[0])).toBe(true)
        expect(presets[1].id).toBe('a')
        expect(isBotPresetStub(presets[1])).toBe(false)
    })

    it('deduplicates concurrent hydration of the same preset id', async () => {
        const presets = [stub('a')]
        let release!: (value: any) => void
        const pending = new Promise<any>(resolve => { release = resolve })
        const fetcher = vi.fn(() => pending)

        const first = hydrateBotPresetAtIndex(presets, 0, fetcher, async () => {})
        const second = hydrateBotPresetAtIndex(presets, 0, fetcher, async () => {})
        release(full('a'))

        const [a, b] = await Promise.all([first, second])

        expect(fetcher).toHaveBeenCalledTimes(1)
        expect(a?.id).toBe('a')
        expect(b?.id).toBe('a')
    })

    it('hydrates every stub for explicit full-data operations', async () => {
        const presets: any[] = [full('a'), stub('b'), stub('c')]
        const fetcher = vi.fn(async (id: string) => full(id))

        await hydrateAllBotPresets(presets, fetcher, async () => {})

        expect(fetcher.mock.calls.map(call => call[0])).toEqual(['b', 'c'])
        expect(presets.every(preset => !isBotPresetStub(preset))).toBe(true)
        expect(presets[1].mainPrompt).toBe('prompt-b')
        expect(presets[2].mainPrompt).toBe('prompt-c')
    })

    it('fails closed on missing or mismatched server data', async () => {
        const missing = [stub('a')]
        await expect(
            hydrateBotPresetAtIndex(missing, 0, async () => null, async () => {})
        ).resolves.toBeNull()
        expect(isBotPresetStub(missing[0])).toBe(true)

        const mismatch = [stub('a')]
        await expect(
            hydrateBotPresetAtIndex(mismatch, 0, async () => full('b'), async () => {})
        ).rejects.toThrow(/preset id mismatch/i)
        expect(isBotPresetStub(mismatch[0])).toBe(true)
        expect(isBotPresetHydrationTransitionActive()).toBe(false)
    })
})
