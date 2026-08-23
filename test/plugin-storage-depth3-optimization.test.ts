import { describe, expect, it } from 'vitest'
import patchHashPkg from '../server/node/patch-hash-cache.cjs'
import selectiveClonePkg from '../server/node/patch-selective-clone.cjs'
import utilsPkg from '../server/node/utils.cjs'
import jsonPatchPkg from 'fast-json-patch'

const { createPatchHashCache, collectPluginStorageSubchildTouches } = patchHashPkg as any
const { clonePatchSnapshot, clonePluginStorageForPatch } = selectiveClonePkg as any
const { calculateHash } = utilsPkg as { calculateHash: (value: any) => number }
const { applyPatch } = jsonPatchPkg

function apply(base: any, patch: any[]) {
    const snapshot = clonePatchSnapshot(base, patch)
    applyPatch(snapshot, patch, true)
    return snapshot
}

describe('pluginCustomStorage depth-3 optimization', () => {
    it('keeps the incremental hash equal to the full reference across repeated deep edits', () => {
        const cache = createPatchHashCache(calculateHash)
        let db: any = {
            pluginCustomStorage: {
                hugeChild: {
                    alpha: { nested: { n: 1 } },
                    beta: { nested: { n: 2 } },
                    gamma: { nested: { n: 3 } },
                },
            },
            other: { stable: true },
        }
        expect(cache.hash(db)).toBe(calculateHash(db))

        const patches = [
            [{ op: 'replace', path: '/pluginCustomStorage/hugeChild/alpha/nested/n', value: 11 }],
            [{ op: 'replace', path: '/pluginCustomStorage/hugeChild/beta/nested/n', value: 22 }],
            [{ op: 'add', path: '/pluginCustomStorage/hugeChild/delta', value: { n: 4 } }],
            [{ op: 'remove', path: '/pluginCustomStorage/hugeChild/gamma' }],
        ]

        for (const patch of patches) {
            const next = apply(db, patch)
            expect(cache.update(db, next, patch)).toBe(calculateHash(next))
            expect(cache.hash(next)).toBe(calculateHash(next))
            db = next
        }
    })

    it('lazily builds a subchild state once and does not rehash an untouched huge subchild later', () => {
        const hugeUntouched = { items: Array.from({ length: 800 }, (_, i) => ({ i, text: `huge-${i}` })) }
        let db: any = {
            pluginCustomStorage: {
                hugeChild: {
                    hugeUntouched,
                    touchedA: { n: 1 },
                    touchedB: { n: 2 },
                },
            },
        }
        let hugeCalls = 0
        const countingHash = (value: any) => {
            if (value === hugeUntouched) hugeCalls++
            return calculateHash(value)
        }
        const cache = createPatchHashCache(countingHash)
        expect(cache.hash(db)).toBe(calculateHash(db))
        expect(hugeCalls).toBe(0)

        const firstPatch = [{ op: 'replace', path: '/pluginCustomStorage/hugeChild/touchedA/n', value: 10 }]
        let next = apply(db, firstPatch)
        expect(cache.update(db, next, firstPatch)).toBe(calculateHash(next))
        expect(hugeCalls).toBe(1)
        db = next

        const secondPatch = [{ op: 'replace', path: '/pluginCustomStorage/hugeChild/touchedB/n', value: 20 }]
        next = apply(db, secondPatch)
        expect(cache.update(db, next, secondPatch)).toBe(calculateHash(next))
        expect(hugeCalls).toBe(1)
    })

    it('clones only touched subchildren inside a plain-object direct child', () => {
        const storage = {
            hugeChild: {
                alpha: { nested: { n: 1 } },
                beta: { nested: { n: 2 } },
                untouched: { large: Array.from({ length: 300 }, (_, i) => i) },
            },
            otherChild: { stable: true },
        }
        const patch = [
            { op: 'replace', path: '/pluginCustomStorage/hugeChild/alpha/nested/n', value: 9 },
            { op: 'copy', from: '/pluginCustomStorage/hugeChild/beta', path: '/pluginCustomStorage/hugeChild/copied' },
        ]
        const cloned = clonePluginStorageForPatch(storage, patch)

        expect(cloned).not.toBe(storage)
        expect(cloned.hugeChild).not.toBe(storage.hugeChild)
        expect(cloned.hugeChild.alpha).not.toBe(storage.hugeChild.alpha)
        expect(cloned.hugeChild.beta).not.toBe(storage.hugeChild.beta)
        expect(cloned.hugeChild.untouched).toBe(storage.hugeChild.untouched)
        expect(cloned.otherChild).toBe(storage.otherChild)
    })

    it('clones multiple touched subchildren and tracks both path and from across direct children', () => {
        const storage = {
            left: { a: { n: 1 }, keep: { n: 2 } },
            right: { b: { n: 3 }, keep: { n: 4 } },
        }
        const patch = [
            { op: 'move', from: '/pluginCustomStorage/left/a', path: '/pluginCustomStorage/right/a' },
            { op: 'replace', path: '/pluginCustomStorage/right/b/n', value: 30 },
        ]
        const cloned = clonePluginStorageForPatch(storage, patch)

        expect(cloned.left).not.toBe(storage.left)
        expect(cloned.right).not.toBe(storage.right)
        expect(cloned.left.a).not.toBe(storage.left.a)
        expect(cloned.right.b).not.toBe(storage.right.b)
        expect(cloned.left.keep).toBe(storage.left.keep)
        expect(cloned.right.keep).toBe(storage.right.keep)
    })

    it('preserves the original database when a later deep operation fails', () => {
        const db = {
            pluginCustomStorage: {
                hugeChild: {
                    alpha: { n: 1 },
                    untouched: { n: 2 },
                },
            },
        }
        const before = structuredClone(db)
        const patch = [
            { op: 'replace', path: '/pluginCustomStorage/hugeChild/alpha/n', value: 5 },
            { op: 'remove', path: '/pluginCustomStorage/hugeChild/alpha/missing' },
        ]
        const snapshot = clonePatchSnapshot(db, patch)
        expect(() => applyPatch(snapshot, patch, true)).toThrow()
        expect(db).toEqual(before)
    })

    it('falls back to a full direct-child clone when that child root is touched', () => {
        const storage = {
            hugeChild: {
                alpha: { n: 1 },
                beta: { n: 2 },
            },
        }
        const cloned = clonePluginStorageForPatch(storage, [
            { op: 'replace', path: '/pluginCustomStorage/hugeChild', value: { replaced: true } },
        ])
        expect(cloned.hugeChild).not.toBe(storage.hugeChild)
        expect(cloned.hugeChild.alpha).not.toBe(storage.hugeChild.alpha)
        expect(cloned.hugeChild.beta).not.toBe(storage.hugeChild.beta)
    })

    it('falls back for array direct children instead of sharing nested values', () => {
        const storage = {
            arrayChild: [{ n: 1 }, { n: 2 }],
        }
        const cloned = clonePluginStorageForPatch(storage, [
            { op: 'replace', path: '/pluginCustomStorage/arrayChild/0/n', value: 3 },
        ])
        expect(cloned.arrayChild).not.toBe(storage.arrayChild)
        expect(cloned.arrayChild[0]).not.toBe(storage.arrayChild[0])
        expect(cloned.arrayChild[1]).not.toBe(storage.arrayChild[1])
    })

    it('decodes escaped child/subchild keys and identifies direct-child root fallback', () => {
        const deep = collectPluginStorageSubchildTouches([
            { op: 'move', from: '/pluginCustomStorage/a~1b/x~0y/n', path: '/pluginCustomStorage/a~1b/plain/n' },
        ])
        const child = deep.children.get('a/b')
        expect(child.touchesChildRoot).toBe(false)
        expect([...child.subchildren].sort()).toEqual(['plain', 'x~y'].sort())

        const root = collectPluginStorageSubchildTouches([
            { op: 'replace', path: '/pluginCustomStorage/a~1b', value: {} },
        ])
        expect(root.children.get('a/b').touchesChildRoot).toBe(true)
    })
})
