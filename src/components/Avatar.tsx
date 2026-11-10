import { LinearGradient } from 'expo-linear-gradient'
import { Text, View } from 'react-native'
import { avatarGradient, colors, typography } from '../design/tokens'

/** Gradient initials avatar; deterministic palette per name. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const [from, to] = avatarGradient(name || '?')
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase()
  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text
          style={{
            color: 'rgba(255,255,255,0.94)',
            fontFamily: typography.displayBold,
            fontSize: size * 0.42,
            lineHeight: size * 0.5,
          }}
        >
          {initial}
        </Text>
      </View>
    </LinearGradient>
  )
}
