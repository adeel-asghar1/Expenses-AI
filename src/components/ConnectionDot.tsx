import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence } from 'react-native-reanimated'
import { colors, typography } from '../design/tokens'
import type { RealtimeStatus } from '../hooks/useRealtime'

const STATUS: Record<RealtimeStatus, { color: string; label: string; pulse: boolean }> = {
  live: { color: colors.good, label: 'Live', pulse: true },
  connecting: { color: colors.amber, label: 'Connecting', pulse: true },
  reconnecting: { color: colors.amber, label: 'Reconnecting', pulse: true },
  offline: { color: colors.coral, label: 'Offline', pulse: false },
  idle: { color: colors.textFaint, label: 'Idle', pulse: false },
}

/** Tiny status dot + label shown in the header. */
export function ConnectionDot({ status, showLabel = true }: { status: RealtimeStatus; showLabel?: boolean }) {
  const meta = STATUS[status]
  const opacity = useSharedValue(1)

  useEffect(() => {
    if (meta.pulse) {
      opacity.value = withRepeat(
        withSequence(withTiming(0.25, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        true,
      )
    } else {
      opacity.value = withTiming(1, { duration: 200 })
    }
  }, [meta.pulse, opacity])

  const animatedDot = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Server status: ${meta.label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.lineSoft,
        backgroundColor: 'rgba(255,255,255,0.04)',
      }}
    >
      <Animated.View
        style={[
          { width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color },
          animatedDot,
        ]}
      />
      {showLabel ? (
        <Text style={{ color: colors.textMuted, fontFamily: typography.bodyMedium, fontSize: 11 }}>
          {meta.label}
        </Text>
      ) : null}
    </View>
  )
}
