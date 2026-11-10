import { Text, View } from 'react-native'
import type { ReactNode } from 'react'
import { colors, typography } from '../design/tokens'

/** Eyebrow caps + optional trailing control — the section header used across screens. */
export function SectionHeader({ eyebrow, title, right }: { eyebrow: string; title?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
      <View style={{ flexShrink: 1 }}>
        <Text
          style={{
            color: colors.textFaint,
            fontFamily: typography.bodySemi,
            fontSize: 10.5,
            letterSpacing: 1.6,
          }}
        >
          {eyebrow.toUpperCase()}
        </Text>
        {title ? (
          <Text style={{ color: colors.text, fontFamily: typography.display, fontSize: 19, marginTop: 2 }}>
            {title}
          </Text>
        ) : null}
      </View>
      {right ? <View style={{ marginLeft: 12 }}>{right}</View> : null}
    </View>
  )
}
