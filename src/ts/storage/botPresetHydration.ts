import { tick } from 'svelte'

export type BotPresetStub = {
    id: string
    name?: string
    image?: unknown
    folderId?: unknown
    _presetStub: true
    [key: string]: unknown
}

type FetchPreset = (id: string) => Promise<any | null>
type WaitForTick = () => Promise<void>

const hydrationPromises = new Map<string, Promise<any | null>>()
let hydrationTransitionCount = 0

export function isBotPresetStub(preset: any): preset is BotPresetStub {
    return !!preset
        && typeof preset === 'object'
        && preset._presetStub === true
        && typeof preset.id === 'string'
        && preset.id.length > 0
}

export function isBotPresetHydrationTransitionActive(): boolean {
    return hydrationTransitionCount > 0
}

function mergeStubMetadata(fullPreset: any, stub: BotPresetStub): any {
    const merged = structuredClone(fullPreset)
    if ('name' in stub) merged.name = stub.name
    if ('image' in stub) merged.image = stub.image
    if ('folderId' in stub) merged.folderId = stub.folderId
    delete merged._presetStub
    return merged
}

async function hydratePresetById(
    presets: any[],
    presetId: string,
    fetchPreset: FetchPreset,
    waitForTick: WaitForTick,
): Promise<any | null> {
    const existingPromise = hydrationPromises.get(presetId)
    if (existingPromise) return existingPromise

    const promise = (async () => {
        hydrationTransitionCount++
        try {
            const fullPreset = await fetchPreset(presetId)
            if (!fullPreset) return null
            if (fullPreset.id !== presetId) {
                throw new Error(`Preset ID mismatch: requested=${presetId} received=${fullPreset.id ?? '<missing>'}`)
            }

            // The array may have been reordered while the request was in flight.
            // Resolve the target again by stable id immediately before applying.
            const currentIndex = presets.findIndex(preset => preset?.id === presetId)
            if (currentIndex < 0) return null

            const current = presets[currentIndex]
            if (!isBotPresetStub(current)) {
                return current
            }

            const hydrated = mergeStubMetadata(fullPreset, current)
            presets[currentIndex] = hydrated

            // Svelte's save effect observes the array replacement on its next
            // reactive turn. Keep the transition flag raised through that tick
            // so hydration is never classified as a user preset edit.
            await waitForTick()
            return hydrated
        } finally {
            hydrationTransitionCount--
            hydrationPromises.delete(presetId)
        }
    })()

    hydrationPromises.set(presetId, promise)
    return promise
}

export async function hydrateBotPresetAtIndex(
    presets: any[],
    index: number,
    fetchPreset: FetchPreset,
    waitForTick: WaitForTick = tick,
): Promise<any | null> {
    const preset = presets?.[index]
    if (!preset) return null
    if (!isBotPresetStub(preset)) return preset
    return hydratePresetById(presets, preset.id, fetchPreset, waitForTick)
}


export async function hydrateAllBotPresets(
    presets: any[],
    fetchPreset: FetchPreset,
    waitForTick: WaitForTick = tick,
): Promise<any[]> {
    const ids = presets
        .map(preset => preset?.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)

    for (const presetId of ids) {
        const currentIndex = presets.findIndex(preset => preset?.id === presetId)
        if (currentIndex < 0) continue
        const hydrated = await hydrateBotPresetAtIndex(
            presets,
            currentIndex,
            fetchPreset,
            waitForTick,
        )
        if (!hydrated) {
            throw new Error('Failed to hydrate prompt preset ' + presetId)
        }
    }

    const remainingStub = presets.find(isBotPresetStub)
    if (remainingStub) {
        throw new Error('Failed to hydrate prompt preset ' + remainingStub.id)
    }
    return presets
}
