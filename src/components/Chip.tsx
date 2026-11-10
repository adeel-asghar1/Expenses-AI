import { Pressable, Text, View } from 'react-native'
import { colors, radius, typography } from '../design/tokens'
import { haptic } from '../lib/haptics'

/** Selectable pill chip (participants, filters, identities). */
export function Chip({
  label,
  selected,
  onPress,
  disabled = false,
  tone = 'mint',
}: {
  label: string
  selected: boolean
  onPress: () => void
  disabled?: boolean
  tone?: 'mint' | 'surface'
}) {
  const activeBg = tone === 'mint' ? colors.mintSoft : colors.surfaceRaised
  return (
    <Pressable
      onPress={() => {
        if (disabled) return
        haptic.selection()
        onPress()
      }}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: pressed && !disabled ? 0.75 : 1 })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: selected ? colors.mintLine : colors.line,
          backgroundColor: selected ? activeBg : colors.surfaceAlt,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: selected ? colors.mint : colors.textMuted,
            fontFamily: typography.bodySemi,
            fontSize: 13,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  )
}
