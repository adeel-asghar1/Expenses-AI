import { Text, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { colors, typography, spacing } from '../design/tokens'

/** Designed empty state — icon in a halo, title, helper text. */
export function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: 10 }}>
      <View
        style={{
          width: 64, height: 64, borderRadius: 32,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.mintSoft, borderColor: colors.mintLine, borderWidth: 1,
        }}
      >
        <Icon size={28} color={colors.mint} strokeWidth={1.5} />
      </View>
      <Text style={{ color: colors.text, fontFamily: typography.bodySemi, fontSize: 15, textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: colors.textMuted, fontFamily: typography.body, fontSize: 12.5, textAlign: 'center', lineHeight: 18 }}>{body}</Text>
    </View>
  )
}
