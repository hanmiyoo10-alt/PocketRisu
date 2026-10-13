import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../alert', () => ({
    alertInput: vi.fn(),
    waitAlert: vi.fn(),
    notifyError: vi.fn(),
}))

vi.mock('./risuSave', () => ({
    decodeRisuSave: vi.fn(async () => ({ id: 'preset/1', name: 'Preset', mainPrompt: 'hello' })),
    encodeRisuSaveLegacy: vi.fn(),
}))

vi.mock('./database.svelte', () => ({
    normalizeChat: (chat: any) => chat,
}))

const { NodeStorage } = await import('./nodeStorage')

function setUpStorage(fetchMock: ReturnType<typeof vi.fn>) {
    ;(NodeStorage as any).sessionInitialized = true
    ;(NodeStorage as any).sessionPending = null
    const storage = new NodeStorage(fetchMock as any, { baseDelayMs: 0, delay: vi.fn(async () => {}), random: () => 1 })
    storage.authChecked = true
    vi.spyOn(storage, 'createAuth').mockResolvedValue('token')
    return storage
}

function octetResponse() {
    return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
    })
}

describe('NodeStorage preset lazy hydration', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    test('fetches and decodes a full preset by stable id', async () => {
        const fetchMock = vi.fn().mockResolvedValue(octetResponse())
        const storage = setUpStorage(fetchMock)

        await expect(storage.fetchBotPresetContent('preset/1')).resolves.toMatchObject({
            id: 'preset/1',
            name: 'Preset',
            mainPrompt: 'hello',
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(String(fetchMock.mock.calls[0][0])).toBe('/api/preset-content/preset%2F1')
    })

    test('returns null when the preset is absent', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
        const storage = setUpStorage(fetchMock)

        await expect(storage.fetchBotPresetContent('missing')).resolves.toBeNull()
    })

    test('surfaces non-404 failures', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }))
        const storage = setUpStorage(fetchMock)

        await expect(storage.fetchBotPresetContent('preset-1')).rejects.toThrow(/fetchBotPresetContent error: 500/)
    })
})
