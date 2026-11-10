import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated'
import { ArrowDownUp, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react-native'

import { useToast } from '../state/toast'
import { colors, radius, spacing, typography } from '../design/tokens'

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
  sync: ArrowDownUp,
} as const

const ACCENT = {
  info: colors.mint,
  success: colors.good,
  error: colors.coral,
  sync: colors.mint,
} as const

/** Global toast: slides from the top, auto-dismisses, optional "View" action. */
export function ToastHost() {
  const toast = useToast((s) => s.toast)
  const dismiss = useToast((s) => s.dismiss)
  const insets = useSafeAreaInsets()
  const router = useRouter()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => dismiss(), toast.kind === 'error' ? 5500 : 4200)
    return () => clearTimeout(timer)
  }, [toast?.id, dismiss]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast) return null
  const Icon = ICONS[toast.kind]
  const accent = ACCENT[toast.kind]

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 1000 }}>
      <Animated.View
        entering={FadeInUp.duration(260)}
        exiting={FadeOutUp.duration(200)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          backgroundColor: 'rgba(23,23,48,0.96)',
          borderColor: accent,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <Icon size={20} color={accent} strokeWidth={1.8} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontFamily: typography.bodySemi, fontSize: 13 }}>{toast.title}</Text>
          {toast.body ? (
            <Text numberOfLines={2} style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 12, marginTop: 2 }}>
              {toast.body}
            </Text>
          ) : null}
        </View>
        {toast.actionLabel && toast.actionTo ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              dismiss()
              router.push(toast.actionTo as never)
            }}
          >
            <Text style={{ color: colors.mint, fontFamily: typography.bodySemi, fontSize: 13 }}>{toast.actionLabel}</Text>
          </Pressable>
        ) : null}
        <Pressable hitSlop={10} onPress={dismiss} accessibilityLabel="Dismiss notification">
          <X size={18} color={colors.textFaint} strokeWidth={2} />
        </Pressable>
      </Animated.View>
    </View>
  )
}
