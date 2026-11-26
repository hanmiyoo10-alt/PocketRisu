import { forageStorage } from '../globalApi.svelte'
import { DBState } from '../stores.svelte'
import { hydrateAllBotPresets, hydrateBotPresetAtIndex } from './botPresetHydration'

export async function ensureBotPresetHydrated(index: number): Promise<any | null> {
    const presets = DBState.db?.botPresets
    if (!Array.isArray(presets) || index < 0 || index >= presets.length) return null

    await forageStorage.Init()
    return hydrateBotPresetAtIndex(
        presets,
        index,
        (id) => forageStorage.realStorage.fetchBotPresetContent(id),
    )
}


export async function ensureAllBotPresetsHydrated(): Promise<void> {
    const presets = DBState.db?.botPresets
    if (!Array.isArray(presets)) return

    await forageStorage.Init()
    await hydrateAllBotPresets(
        presets,
        (id) => forageStorage.realStorage.fetchBotPresetContent(id),
    )
}
