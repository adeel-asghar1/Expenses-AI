import { Pressable, Text, View, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import type { ReactNode } from 'react'
import { colors, gradients, radius, typography, glowShadow } from '../design/tokens'
import { haptic } from '../lib/haptics'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/** Primary CTA: mint gradient pill with press-spring and glow. */
export function GradientButton({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  compact = false,
}: {
  label: string
  onPress: () => void
  icon?: ReactNode
  loading?: boolean
  disabled?: boolean
  compact?: boolean
}) {
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const isDisabled = disabled || loading

  return (
    <AnimatedPressable
      onPress={() => {
        if (isDisabled) return
        haptic.medium()
        onPress()
      }}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 300 })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 })
      }}
      disabled={isDisabled}
      style={[animatedStyle, isDisabled ? { opacity: 0.55 } : glowShadow, { borderRadius: radius.pill }]}
    >
      <LinearGradient
        colors={[...gradients.mintButton] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: radius.pill,
          paddingVertical: compact ? 11 : 15,
          paddingHorizontal: compact ? 18 : 22,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#06251F" size="small" />
        ) : (
          <>
            <Text
              style={{
                color: '#06251F',
                fontFamily: typography.bodySemi,
                fontSize: compact ? 13 : 15,
              }}
            >
              {label}
            </Text>
            {icon ? <View>{icon}</View> : null}
          </>
        )}
      </LinearGradient>
    </AnimatedPressable>
  )
}
