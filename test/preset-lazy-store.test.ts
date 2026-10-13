import { describe, expect, it } from 'vitest'
import presetLazyPkg from '../server/node/preset-lazy-store.cjs'

const {
    createPresetLazyStore,
    isPresetStub,
} = presetLazyPkg as {
    createPresetLazyStore: () => {
        resetFromDb: (db: any) => void
        clear: () => void
        stripForClient: (db: any) => any
        hydrateForDisk: (db: any) => any
        getFullPreset: (id: string) => any | null
    }
    isPresetStub: (preset: any) => boolean
}

function fullPreset(id: string, name: string, extra: Record<string, any> = {}) {
    return {
        id,
        name,
        mainPrompt: `prompt-${id}`,
        temperature: id.length,
        regex: [{ id: `regex-${id}`, pattern: id }],
        ...extra,
    }
}

describe('preset lazy store', () => {
    it('keeps the active preset full and strips inactive presets to metadata stubs', () => {
        const store = createPresetLazyStore()
        const db = {
            botPresetsId: 1,
            botPresets: [
                fullPreset('a', 'A', { image: 'img-a', folderId: 'f1' }),
                fullPreset('b', 'B', { image: 'img-b', folderId: 'f2' }),
                fullPreset('c', 'C'),
            ],
        }

        store.resetFromDb(db)
        const client = store.stripForClient(db)

        expect(isPresetStub(client.botPresets[0])).toBe(true)
        expect(client.botPresets[0]).toEqual({
            id: 'a',
            name: 'A',
            image: 'img-a',
            folderId: 'f1',
            _presetStub: true,
        })
        expect(isPresetStub(client.botPresets[1])).toBe(false)
        expect(client.botPresets[1].mainPrompt).toBe('prompt-b')
        expect(isPresetStub(client.botPresets[2])).toBe(true)

        expect(db.botPresets[0].mainPrompt).toBe('prompt-a')
        expect(db.botPresets[2].mainPrompt).toBe('prompt-c')
    })

    it('fails closed to the full array when the active index is invalid', () => {
        const store = createPresetLazyStore()
        const db = {
            botPresetsId: 99,
            botPresets: [fullPreset('a', 'A'), fullPreset('b', 'B')],
        }

        store.resetFromDb(db)
        const client = store.stripForClient(db)

        expect(isPresetStub(client.botPresets[0])).toBe(false)
        expect(isPresetStub(client.botPresets[1])).toBe(false)
        expect(client.botPresets[0].mainPrompt).toBe('prompt-a')
        expect(client.botPresets[1].mainPrompt).toBe('prompt-b')
    })

    it('fails closed to the full array when preset ids are missing or duplicated', () => {
        for (const presets of [
            [fullPreset('a', 'A'), { ...fullPreset('b', 'B'), id: '' }],
            [fullPreset('dup', 'A'), fullPreset('dup', 'B')],
        ]) {
            const store = createPresetLazyStore()
            const db = { botPresetsId: 0, botPresets: presets }
            store.resetFromDb(db)
            const client = store.stripForClient(db)
            expect(client.botPresets.every((preset: any) => !isPresetStub(preset))).toBe(true)
        }
    })

    it('hydrates stubs from the authoritative store while preserving metadata edits', () => {
        const store = createPresetLazyStore()
        const original = {
            botPresetsId: 0,
            botPresets: [
                fullPreset('a', 'A'),
                fullPreset('b', 'B', { image: 'old-image', folderId: 'old-folder' }),
            ],
        }
        store.resetFromDb(original)

        const client = store.stripForClient(original)
        client.botPresets[1] = {
            ...client.botPresets[1],
            name: 'B renamed',
            image: null,
            folderId: null,
        }

        const full = store.hydrateForDisk(client)
        expect(full.botPresets[1].mainPrompt).toBe('prompt-b')
        expect(full.botPresets[1].regex).toEqual([{ id: 'regex-b', pattern: 'b' }])
        expect(full.botPresets[1].name).toBe('B renamed')
        expect(full.botPresets[1].image).toBeNull()
        expect(full.botPresets[1].folderId).toBeNull()
        expect(full.botPresets[1]._presetStub).toBeUndefined()
    })

    it('fails closed when a stub has no authoritative full preset', () => {
        const store = createPresetLazyStore()
        store.resetFromDb({
            botPresetsId: 0,
            botPresets: [fullPreset('a', 'A')],
        })

        expect(() => store.hydrateForDisk({
            botPresetsId: 0,
            botPresets: [
                fullPreset('a', 'A'),
                { id: 'missing', name: 'Missing', _presetStub: true },
            ],
        })).toThrow(/missing authoritative preset/i)
    })

    it('reassembles by stable id across reorder, delete, and full additions', () => {
        const store = createPresetLazyStore()
        const original = {
            botPresetsId: 0,
            botPresets: [
                fullPreset('a', 'A'),
                fullPreset('b', 'B'),
                fullPreset('c', 'C'),
            ],
        }
        store.resetFromDb(original)
        const client = store.stripForClient(original)

        client.botPresets = [
            client.botPresets[2],
            fullPreset('d', 'D'),
            client.botPresets[0],
        ]
        client.botPresetsId = 1

        const full = store.hydrateForDisk(client)
        expect(full.botPresets.map((p: any) => p.id)).toEqual(['c', 'd', 'a'])
        expect(full.botPresets[0].mainPrompt).toBe('prompt-c')
        expect(full.botPresets[1].mainPrompt).toBe('prompt-d')
        expect(full.botPresets[2].mainPrompt).toBe('prompt-a')
        expect(full.botPresets.find((p: any) => p.id === 'b')).toBeUndefined()
    })

    it('returns a detached full preset for on-demand hydration', () => {
        const store = createPresetLazyStore()
        const db = {
            botPresetsId: 0,
            botPresets: [fullPreset('a', 'A'), fullPreset('b', 'B')],
        }
        store.resetFromDb(db)

        const fetched = store.getFullPreset('b')
        expect(fetched?.mainPrompt).toBe('prompt-b')
        fetched.name = 'mutated client copy'

        expect(store.getFullPreset('b')?.name).toBe('B')
        expect(store.getFullPreset('missing')).toBeNull()
    })
})
