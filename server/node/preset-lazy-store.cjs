'use strict'

const PRESET_STUB_FLAG = '_presetStub'
const PRESET_METADATA_FIELDS = ['id', 'name', 'image', 'folderId']

function cloneValue(value) {
    return structuredClone(value)
}

function isPresetStub(preset) {
    return !!preset && typeof preset === 'object' && preset[PRESET_STUB_FLAG] === true
}

function presetToStub(preset) {
    if (!preset || typeof preset !== 'object') return preset
    if (isPresetStub(preset)) return preset
    if (!preset.id) return preset

    const stub = {
        id: preset.id,
        name: preset.name ?? '',
        [PRESET_STUB_FLAG]: true,
    }

    for (const field of PRESET_METADATA_FIELDS) {
        if (field === 'id' || field === 'name') continue
        if (field in preset) stub[field] = preset[field]
    }

    return stub
}

function mergePresetStubWithFull(stub, fullPreset) {
    if (!isPresetStub(stub)) return stub
    if (!fullPreset || typeof fullPreset !== 'object') {
        throw new Error(`missing authoritative preset for stub id=${stub?.id ?? '<missing>'}`)
    }

    const merged = cloneValue(fullPreset)
    for (const field of PRESET_METADATA_FIELDS) {
        if (field in stub) merged[field] = stub[field]
    }
    delete merged[PRESET_STUB_FLAG]
    return merged
}

function createPresetLazyStore() {
    let fullById = new Map()
    let safeToStrip = false

    function resetFromDb(db) {
        const next = new Map()
        const presets = Array.isArray(db?.botPresets) ? db.botPresets : []
        const activeIndex = Number.isInteger(db?.botPresetsId) ? db.botPresetsId : -1
        let safe = presets.length === 0 || (activeIndex >= 0 && activeIndex < presets.length)

        for (const preset of presets) {
            if (
                !preset
                || typeof preset !== 'object'
                || typeof preset.id !== 'string'
                || preset.id.length === 0
                || isPresetStub(preset)
                || next.has(preset.id)
            ) {
                safe = false
                continue
            }
            next.set(preset.id, cloneValue(preset))
        }

        fullById = next
        safeToStrip = safe && next.size === presets.length
    }

    function clear() {
        fullById = new Map()
        safeToStrip = false
    }

    function stripForClient(db) {
        if (!db || typeof db !== 'object' || !Array.isArray(db.botPresets)) return db
        if (!safeToStrip) return db

        const activeIndex = db.botPresetsId
        const stripped = { ...db }
        stripped.botPresets = db.botPresets.map((preset, index) => {
            if (index === activeIndex) return preset
            return presetToStub(preset)
        })
        return stripped
    }

    function hydrateForDisk(db) {
        if (!db || typeof db !== 'object' || !Array.isArray(db.botPresets)) return db
        if (!db.botPresets.some(isPresetStub)) return db
        if (!safeToStrip) {
            throw new Error('preset lazy store is not authoritative for stub hydration')
        }

        const full = { ...db }
        full.botPresets = db.botPresets.map((preset) => {
            if (!isPresetStub(preset)) return preset
            const id = preset?.id
            const authoritative = id ? fullById.get(id) : null
            return mergePresetStubWithFull(preset, authoritative)
        })
        return full
    }

    function getFullPreset(id) {
        if (!id) return null
        const preset = fullById.get(id)
        return preset ? cloneValue(preset) : null
    }

    return {
        resetFromDb,
        clear,
        stripForClient,
        hydrateForDisk,
        getFullPreset,
    }
}

module.exports = {
    PRESET_STUB_FLAG,
    PRESET_METADATA_FIELDS,
    isPresetStub,
    presetToStub,
    mergePresetStubWithFull,
    createPresetLazyStore,
}
