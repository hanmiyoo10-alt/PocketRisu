// Notification sound registry + playback.
//
// A stored sound value is either a bundled preset id (a key of `bundledSounds`)
// or an uploaded asset path ("assets/<hash>.mp3"). An empty value falls back to
// the default sound. Resolution and playback are centralized here so the chat
// and translator call sites stay one-liners.

import { getFileSrc } from './globalApi.svelte'

import sendSound from '../etc/send.mp3'
import announce from '../etc/sounds/announce.mp3'
import bell from '../etc/sounds/bell.mp3'
import bells from '../etc/sounds/bells.mp3'
import blip from '../etc/sounds/blip.mp3'
import confirm from '../etc/sounds/confirm.mp3'
import correct from '../etc/sounds/correct.mp3'
import digital from '../etc/sounds/digital.mp3'
import doorbell from '../etc/sounds/doorbell.mp3'
import flute from '../etc/sounds/flute.mp3'
import marimba from '../etc/sounds/marimba.mp3'
import ping from '../etc/sounds/ping.mp3'
import pop from '../etc/sounds/pop.mp3'
import positive from '../etc/sounds/positive.mp3'
import reveal from '../etc/sounds/reveal.mp3'

/** Bundled preset id -> built (hashed) asset URL. `default` is the legacy sound. */
export const bundledSounds: Record<string, string> = {
    default: sendSound,
    bell,
    bells,
    blip,
    confirm,
    correct,
    digital,
    doorbell,
    flute,
    marimba,
    ping,
    pop,
    positive,
    reveal,
    announce,
}

/** Preset ids in display order (default first). */
export const bundledSoundIds = Object.keys(bundledSounds)

/** Resolve a stored sound value to a URL playable by `new Audio()`. */
export async function resolveSoundUrl(value: string | undefined): Promise<string> {
    if (!value) {
        return bundledSounds.default
    }
    if (value.startsWith('assets/')) {
        const url = await getFileSrc(value)
        return url || bundledSounds.default
    }
    return bundledSounds[value] ?? bundledSounds.default
}

function resolveVolume(volume?: number): number {
    const raw = volume ?? 100
    return Math.min(1, Math.max(0, raw / 100))
}

let notificationAudio: HTMLAudioElement | null = null
let notificationPlayId = 0

function releaseNotificationAudio(audio: HTMLAudioElement) {
    audio.onended = null
    audio.onerror = null

    try {
        audio.pause()
    } catch {}

    try {
        audio.removeAttribute('src')
        audio.load()
    } catch {}

    if (notificationAudio === audio) {
        notificationAudio = null
    }
}

/** Fire-and-forget notification sound (message/translation complete). */
export async function playNotificationSound(value: string | undefined, volume?: number) {
    const playId = ++notificationPlayId

    try {
        const url = await resolveSoundUrl(value)

        // A newer completion sound superseded this request while URL resolution
        // was still in flight.
        if (playId !== notificationPlayId) {
            return
        }

        // Keep the automatic completion channel bounded to one live element.
        if (notificationAudio) {
            releaseNotificationAudio(notificationAudio)
        }

        const audio = new Audio(url)
        audio.volume = resolveVolume(volume)
        notificationAudio = audio

        const cleanup = () => {
            releaseNotificationAudio(audio)
        }

        audio.onended = cleanup
        audio.onerror = cleanup

        audio.play().catch(cleanup)
    } catch {
        // Release any element created by this current playback attempt.
        if (playId === notificationPlayId && notificationAudio) {
            releaseNotificationAudio(notificationAudio)
        }
    }
}

// Single preview channel so picking sounds rapidly never overlaps.
let previewAudio: HTMLAudioElement | null = null

/** Preview a sound in the picker UI; stops any in-flight preview first. */
export async function playSoundPreview(value: string | undefined, volume?: number) {
    try {
        const url = await resolveSoundUrl(value)
        if (previewAudio) {
            previewAudio.pause()
            previewAudio = null
        }
        const audio = new Audio(url)
        audio.volume = resolveVolume(volume)
        previewAudio = audio
        audio.play().catch(() => {})
    } catch {
        // ignore
    }
}
