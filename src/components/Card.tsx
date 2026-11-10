import { View } from 'react-native'
import type { ReactNode } from 'react'
import { colors, radius, spacing, cardShadow } from '../design/tokens'

export function Card({ children, style, raised = false }: { children: ReactNode; style?: object; raised?: boolean }) {
  return (
    <View
      style={[
        {
          backgroundColor: raised ? colors.surfaceRaised : colors.surface,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        raised ? cardShadow : null,
        style,
      ]}
    >
      {children}
    </View>
  )
}
