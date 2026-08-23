'use strict';

const { collectPluginStorageSubchildTouches } = require('./patch-hash-cache.cjs');

function decodePointerSegment(segment) {
    return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function collectPatchTopLevelKeys(patch) {
    const keys = new Set();
    let touchesRoot = false;

    for (const op of Array.isArray(patch) ? patch : []) {
        for (const field of ['path', 'from']) {
            const pointer = op?.[field];
            if (typeof pointer !== 'string') continue;
            if (pointer === '') {
                touchesRoot = true;
                continue;
            }
            if (!pointer.startsWith('/')) {
                touchesRoot = true;
                continue;
            }
            const nextSlash = pointer.indexOf('/', 1);
            const rawSegment = nextSlash === -1
                ? pointer.slice(1)
                : pointer.slice(1, nextSlash);
            keys.add(decodePointerSegment(rawSegment));
        }
    }

    return { keys, touchesRoot };
}

function collectPluginStorageChildKeys(patch) {
    const keys = new Set();
    let touchesStorageRoot = false;
    let referencesStorage = false;

    for (const op of Array.isArray(patch) ? patch : []) {
        for (const field of ['path', 'from']) {
            const pointer = op?.[field];
            if (typeof pointer !== 'string' || !pointer.startsWith('/') || pointer === '') continue;

            const segments = pointer.slice(1).split('/').map(decodePointerSegment);
            if (segments[0] !== 'pluginCustomStorage') continue;

            referencesStorage = true;
            if (segments.length === 1) {
                touchesStorageRoot = true;
                continue;
            }
            keys.add(segments[1]);
        }
    }

    return { keys, touchesStorageRoot, referencesStorage };
}

function isPlainPatchRoot(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneDirectChildForDeepPatch(child, touch) {
    if (!isPlainPatchRoot(child) || !touch || touch.touchesChildRoot || touch.subchildren.size === 0) {
        return structuredClone(child);
    }

    const snapshot = { ...child };
    for (const subchildKey of touch.subchildren) {
        if (Object.prototype.hasOwnProperty.call(child, subchildKey)) {
            Object.defineProperty(snapshot, subchildKey, {
                value: structuredClone(child[subchildKey]),
                enumerable: true,
                configurable: true,
                writable: true,
            });
        }
    }
    return snapshot;
}

function clonePluginStorageForPatch(storage, patch) {
    if (!isPlainPatchRoot(storage)) {
        return structuredClone(storage);
    }

    const { keys, touchesStorageRoot, referencesStorage } = collectPluginStorageChildKeys(patch);
    if (touchesStorageRoot || !referencesStorage) {
        return structuredClone(storage);
    }

    const deepTouches = collectPluginStorageSubchildTouches(patch);
    const snapshot = { ...storage };
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(storage, key)) {
            const value = cloneDirectChildForDeepPatch(storage[key], deepTouches.children.get(key));
            Object.defineProperty(snapshot, key, {
                value,
                enumerable: true,
                configurable: true,
                writable: true,
            });
        }
    }
    return snapshot;
}

function clonePatchSnapshot(database, patch) {
    if (!isPlainPatchRoot(database)) {
        return structuredClone(database);
    }

    const { keys, touchesRoot } = collectPatchTopLevelKeys(patch);
    if (touchesRoot) {
        return structuredClone(database);
    }

    const snapshot = { ...database };
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(database, key)) {
            const value = key === 'pluginCustomStorage'
                ? clonePluginStorageForPatch(database[key], patch)
                : structuredClone(database[key]);
            Object.defineProperty(snapshot, key, {
                value,
                enumerable: true,
                configurable: true,
                writable: true,
            });
        }
    }
    return snapshot;
}

module.exports = {
    clonePatchSnapshot,
    clonePluginStorageForPatch,
    cloneDirectChildForDeepPatch,
    collectPatchTopLevelKeys,
    collectPluginStorageChildKeys,
};
