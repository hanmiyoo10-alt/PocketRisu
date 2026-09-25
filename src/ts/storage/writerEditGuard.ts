export type WriterLockState =
    | 'active'
    | 'fresh'
    | 'free'
    | 'stale'
    | 'unknown'
    | string

export type WriterEditGuardResolveOptions = {
    supportsServerLock: boolean
    getWriterLockState: () => Promise<WriterLockState>
}

export class WriterEditGuard {
    private peerConflict = false
    private stale = false
    private revision = 0

    markPeerActivity() {
        if (this.stale) return
        this.peerConflict = true
        this.revision += 1
    }

    markSessionDeactivated() {
        this.peerConflict = true
        this.stale = true
        this.revision += 1
    }

    isBlocked() {
        return this.peerConflict || this.stale
    }

    isStale() {
        return this.stale
    }

    async resolve(options: WriterEditGuardResolveOptions): Promise<boolean> {
        if (this.stale) return false
        if (!this.peerConflict) return true
        if (!options.supportsServerLock) return false

        const revision = this.revision
        let state: WriterLockState = 'unknown'
        try {
            state = await options.getWriterLockState()
        } catch {
            state = 'unknown'
        }

        if (state === 'stale') {
            this.markSessionDeactivated()
            return false
        }

        if (this.revision !== revision) return false
        this.peerConflict = false
        return true
    }
}
