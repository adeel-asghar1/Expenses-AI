import { Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Avatar } from './Avatar'
import { colors, typography, spacing } from '../design/tokens'
import { formatMoney, formatSignedMoney } from '../lib/money'

/** One flatmate's position: paid / consumed / net, mint when receiving, coral when owing. */
export function BalanceRow({
  name,
  net,
  paid,
  consumed,
  currency,
  index = 0,
  highlight = false,
}: {
  name: string
  net: string
  paid: string
  consumed: string
  currency: string
  index?: number
  highlight?: boolean
}) {
  const netNumber = Number(net)
  const tone = netNumber > 0.004 ? colors.good : netNumber < -0.004 ? colors.coral : colors.textMuted

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).duration(320)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 12,
        paddingHorizontal: highlight ? 12 : 0,
        borderRadius: highlight ? 14 : 0,
        backgroundColor: highlight ? colors.mintSoft : 'transparent',
      }}
    >
      <Avatar name={name} size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontFamily: typography.bodySemi, fontSize: 14.5 }}>
          {name}
        </Text>
        <Text style={{ color: colors.textFaint, fontFamily: typography.body, fontSize: 11.5, marginTop: 2 }}>
          paid {formatMoney(paid, currency)} · consumed {formatMoney(consumed, currency)}
        </Text>
      </View>
      <Text
        style={{
          color: tone,
          fontFamily: typography.display,
          fontSize: 16,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatSignedMoney(net, currency)}
      </Text>
    </Animated.View>
  )
}
