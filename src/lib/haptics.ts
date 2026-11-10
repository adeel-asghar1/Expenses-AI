/** Haptics wrapper honoring the user's preference. Never throws. */
import * as Haptics from 'expo-haptics'
import { useSettings } from '../state/settings'

export const hapticsEnabled = () => useSettings.getState().hapticsEnabled

export const haptic = {
  success: () => {
    if (!hapticsEnabled()) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  },
  warning: () => {
    if (!hapticsEnabled()) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
  },
  error: () => {
    if (!hapticsEnabled()) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
  },
  light: () => {
    if (!hapticsEnabled()) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  },
  medium: () => {
    if (!hapticsEnabled()) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
  },
  selection: () => {
    if (!hapticsEnabled()) return
    Haptics.selectionAsync().catch(() => {})
  },
}
