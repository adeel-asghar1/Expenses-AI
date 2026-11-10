/** Client-only preferences, persisted to AsyncStorage. Server data lives in TanStack Query. */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

const DEFAULT_API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.168.226.205:8000').replace(/\/+$/, '')

export type SoundKind = 'save' | 'notify' | 'error' | 'tap'

type SettingsState = {
  /** Base URL of the laptop-hosted FastAPI backend, editable in Settings. */
  apiUrl: string
  /** Flatmate this phone acts as, per group. */
  identities: Record<number, number>
  /** Currently selected flat; null until the first successful load resolves it. */
  selectedGroupId: number | null
  /** Last time this device committed a mutation — used to suppress echo notifications. */
  lastMutationAt: number
  soundsEnabled: boolean
  hapticsEnabled: boolean
  animationsEnabled: boolean
  notificationsEnabled: boolean
  sounds: Record<SoundKind, boolean>

  setApiUrl: (url: string) => void
  setIdentity: (groupId: number, userId: number) => void
  setSelectedGroupId: (groupId: number | null) => void
  markMutation: () => void
  setSoundsEnabled: (v: boolean) => void
  setHapticsEnabled: (v: boolean) => void
  setAnimationsEnabled: (v: boolean) => void
  setNotificationsEnabled: (v: boolean) => void
  setSound: (kind: SoundKind, v: boolean) => void
}

export const normalizeApiUrl = (url: string): string => url.trim().replace(/\/+$/, '')

/** Guard rails so nobody can paste "localhost" and brick the phone build. */
export const apiUrlProblem = (url: string): string | null => {
  const clean = normalizeApiUrl(url)
  if (!clean) return 'Enter the laptop server address.'
  if (!/^https?:\/\//i.test(clean)) return 'Start with http:// (or https://). Example: http://10.168.226.205:8000'
  try {
    const host = new URL(clean).hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return "A phone can't reach 'localhost' — that means this phone itself. Use the laptop's LAN IP, e.g. http://10.168.226.205:8000"
    }
  } catch {
    return 'That address does not look valid. Example: http://10.168.226.205:8000'
  }
  return null
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      apiUrl: DEFAULT_API_URL,
      identities: {},
      selectedGroupId: null,
      lastMutationAt: 0,
      soundsEnabled: true,
      hapticsEnabled: true,
      animationsEnabled: true,
      notificationsEnabled: true,
      sounds: { save: true, notify: true, error: true, tap: false },

      setApiUrl: (url) => set({ apiUrl: normalizeApiUrl(url) }),
      setIdentity: (groupId, userId) =>
        set((s) => ({ identities: { ...s.identities, [groupId]: userId } })),
      setSelectedGroupId: (groupId) => set({ selectedGroupId: groupId }),
      markMutation: () => set({ lastMutationAt: Date.now() }),
      setSoundsEnabled: (soundsEnabled) => set({ soundsEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setSound: (kind, v) => set((s) => ({ sounds: { ...s.sounds, [kind]: v } })),
    }),
    {
      name: 'flat-expenses-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        apiUrl: s.apiUrl,
        identities: s.identities,
        selectedGroupId: s.selectedGroupId,
        soundsEnabled: s.soundsEnabled,
        hapticsEnabled: s.hapticsEnabled,
        animationsEnabled: s.animationsEnabled,
        notificationsEnabled: s.notificationsEnabled,
        sounds: s.sounds,
      }),
    },
  ),
)

export const useIdentityFor = (groupId: number | null | undefined) =>
  useSettings((s) => (groupId == null ? undefined : s.identities[groupId]))
