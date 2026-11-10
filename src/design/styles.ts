/** Shared layout style objects (inputs, labels, rows). */
import type { ViewStyle, TextStyle } from 'react-native'
import { colors, radius, spacing, typography } from './tokens'

export const inputStyle: ViewStyle & TextStyle = {
  backgroundColor: colors.surfaceAlt,
  borderColor: colors.line,
  borderWidth: 1,
  borderRadius: radius.md,
  paddingHorizontal: spacing.md,
  paddingVertical: 12,
  color: colors.text,
  fontFamily: typography.body,
  fontSize: 15,
  minHeight: 46,
}

export const inputOnDark: TextStyle = { color: colors.text }

export const fieldLabel: TextStyle = {
  color: colors.textFaint,
  fontFamily: typography.bodySemi,
  fontSize: 10.5,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  marginBottom: 6,
}

export const rowBetween: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
}

export const hairline: ViewStyle = {
  height: 1,
  backgroundColor: colors.lineSoft,
}
