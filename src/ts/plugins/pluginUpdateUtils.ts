export type VersionCompareResult = -1 | 0 | 1

type ParsedSemver = {
    core: number[]
    prerelease: string[] | null
}

const SEMVER_LIKE = /^v?(\d+(?:\.\d+)*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z.-]+)?$/

const parseSemverLike = (version: string): ParsedSemver | null => {
    const match = version.trim().match(SEMVER_LIKE)
    if (!match) {
        return null
    }

    return {
        core: match[1].split('.').map((part) => Number(part)),
        prerelease: match[2] ? match[2].split('.') : null,
    }
}

const compareNumericParts = (a: number[], b: number[]): VersionCompareResult => {
    const len = Math.max(a.length, b.length)
    for (let i = 0; i < len; i++) {
        const left = a[i] ?? 0
        const right = b[i] ?? 0
        if (left > right) return 1
        if (left < right) return -1
    }
    return 0
}

const comparePrerelease = (a: string[] | null, b: string[] | null): VersionCompareResult => {
    if (a === null && b === null) return 0
    if (a === null) return 1
    if (b === null) return -1

    const len = Math.max(a.length, b.length)
    for (let i = 0; i < len; i++) {
        const left = a[i]
        const right = b[i]

        if (left === undefined) return -1
        if (right === undefined) return 1
        if (left === right) continue

        const leftNumeric = /^\d+$/.test(left)
        const rightNumeric = /^\d+$/.test(right)

        if (leftNumeric && rightNumeric) {
            const leftNumber = Number(left)
            const rightNumber = Number(right)
            if (leftNumber > rightNumber) return 1
            if (leftNumber < rightNumber) return -1
            continue
        }

        if (leftNumeric !== rightNumeric) {
            return leftNumeric ? -1 : 1
        }

        return left > right ? 1 : -1
    }

    return 0
}

const compareLegacyDotNumericVersions = (v1: string, v2: string): VersionCompareResult => {
    const v1parts = v1.split('.').map(Number)
    const v2parts = v2.split('.').map(Number)
    const len = Math.max(v1parts.length, v2parts.length)

    for (let i = 0; i < len; i++) {
        const part1 = v1parts[i] || 0
        const part2 = v2parts[i] || 0
        if (part1 > part2) return 1
        if (part1 < part2) return -1
    }

    return 0
}

export const comparePluginVersions = (v1: string, v2: string): VersionCompareResult => {
    const parsed1 = parseSemverLike(v1)
    const parsed2 = parseSemverLike(v2)

    if (!parsed1 || !parsed2) {
        return compareLegacyDotNumericVersions(v1, v2)
    }

    const coreResult = compareNumericParts(parsed1.core, parsed2.core)
    if (coreResult !== 0) {
        return coreResult
    }

    return comparePrerelease(parsed1.prerelease, parsed2.prerelease)
}

export const buildPluginUpdateURL = (updateURL: string, nonce = Date.now()): string => {
    const url = new URL(updateURL)
    url.searchParams.set('_risu_update', String(nonce))
    return url.toString()
}

export const getPluginUpdateFetchAttempts = (metadataOnly: boolean): RequestInit[] => {
    const strict: RequestInit = {
        method: 'GET',
        cache: 'no-store',
    }

    if (metadataOnly) {
        strict.headers = {
            'Range': 'bytes=0-512',
        }
    }

    const noStoreWithoutRange: RequestInit = {
        method: 'GET',
        cache: 'no-store',
    }

    const plainGet: RequestInit = {
        method: 'GET',
    }

    return metadataOnly
        ? [strict, noStoreWithoutRange, plainGet]
        : [noStoreWithoutRange, plainGet]
}
