import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { Sparkles } from 'lucide-react-native'
import { colors, typography } from '../design/tokens'

function Ring({ index }: { index: number }) {
  const scale = useSharedValue(0.6)
  const opacity = useSharedValue(0.7)

  useEffect(() => {
    scale.value = withDelay(
      index * 500,
      withRepeat(withTiming(1.6, { duration: 2100, easing: Easing.out(Easing.quad) }), -1, false),
    )
    opacity.value = withDelay(
      index * 500,
      withRepeat(withTiming(0, { duration: 2100, easing: Easing.out(Easing.quad) }), -1, false),
    )
  }, [index, opacity, scale])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 96,
          height: 96,
          borderRadius: 48,
          borderWidth: 1.5,
          borderColor: colors.mint,
        },
        style,
      ]}
    />
  )
}

/** The "Ollama is thinking" animation: expanding rings over a glowing core. */
export function AiOrb({ label = 'Reading your expense…' }: { label?: string }) {
  const breathe = useSharedValue(1)

  useEffect(() => {
    breathe.value = withRepeat(withTiming(1.08, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, true)
  }, [breathe])

  const core = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }))

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 26 }}
    >
      <View style={{ width: 170, height: 150, alignItems: 'center', justifyContent: 'center' }}>
        <Ring index={0} />
        <Ring index={1} />
        <Ring index={2} />
        <Animated.View
          style={[
            {
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: colors.mintSoft,
              borderColor: colors.mintLine,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: colors.mintStrong,
              shadowOpacity: 0.6,
              shadowRadius: 26,
              elevation: 8,
            },
            core,
          ]}
        >
          <Sparkles size={34} color={colors.mint} strokeWidth={1.6} />
        </Animated.View>
      </View>
      <Text style={{ color: colors.mint, fontFamily: typography.bodySemi, fontSize: 14, marginTop: 2 }}>{label}</Text>
      <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 11.5, marginTop: 4 }}>
        Running locally on your laptop · nothing leaves the network
      </Text>
    </View>
  )
}
