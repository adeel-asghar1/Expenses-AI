/** Original UI sounds (synthesized in-house). All calls are fire-and-forget and never throw. */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio'
import { useSettings } from '../state/settings'

const sources = {
  save: require('../../assets/sounds/save.wav'),
  notify: require('../../assets/sounds/notify.wav'),
  error: require('../../assets/sounds/error.wav'),
  tap: require('../../assets/sounds/tap.wav'),
} as const

export type SoundKind = keyof typeof sources

const players: Partial<Record<SoundKind, AudioPlayer>> = {}

function playerFor(kind: SoundKind): AudioPlayer | null {
  try {
    if (!players[kind]) players[kind] = createAudioPlayer(sources[kind])
    return players[kind] ?? null
  } catch (error) {
    console.warn('[sounds] could not create player for', kind, error)
    return null
  }
}

export function playSound(kind: SoundKind): void {
  const state = useSettings.getState()
  if (!state.soundsEnabled) return
  if (!state.sounds[kind]) return
  const player = playerFor(kind)
  if (!player) return
  try {
    player.seekTo(0)
    player.play()
  } catch (error) {
    console.warn('[sounds] play failed', error)
  }
}
