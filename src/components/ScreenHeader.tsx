import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { House } from 'lucide-react-native'

import { useRealtimeStatus } from '../state/realtimeStatus'
import { ConnectionDot } from './ConnectionDot'
import { colors, radius, typography } from '../design/tokens'

/** App-wide header: brand mark, product name, live connection indicator. */
export function ScreenHeader({ flatName }: { flatName?: string }) {
  const status = useRealtimeStatus((s) => s.status)

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 }}>
      <LinearGradient
        colors={['#7CF2C4', '#2BD4BF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 38,
          height: 38,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#2BD4BF',
          shadowOpacity: 0.4,
          shadowRadius: 14,
          elevation: 6,
        }}
      >
        <House size={20} color="#06251F" strokeWidth={1.8} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textFaint, fontFamily: typography.bodySemi, fontSize: 9, letterSpacing: 2 }}>
          YOUR SHARED FLAT
        </Text>
        <Text numberOfLines={1} style={{ color: colors.text, fontFamily: typography.display, fontSize: 16.5, marginTop: 1 }}>
          {flatName ?? 'Flatmate finances'}
        </Text>
      </View>
      <ConnectionDot status={status} />
    </View>
  )
}
