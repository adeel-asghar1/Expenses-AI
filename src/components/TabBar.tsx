import { Pressable, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { Sparkles, Scale, ReceiptText, Settings } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'

import { colors, radius, typography } from '../design/tokens'
import { haptic } from '../lib/haptics'

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Ask AI', icon: Sparkles },
  balances: { label: 'Balances', icon: Scale },
  activity: { label: 'Activity', icon: ReceiptText },
  settings: { label: 'Settings', icon: Settings },
}

/** Fixed, frosted bottom navigation with a glowing mint active pill. */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <BlurView
      intensity={55}
      tint="dark"
      style={{
        borderTopColor: colors.lineSoft,
        borderTopWidth: 1,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 10,
        paddingHorizontal: 10,
      }}
    >
      <View style={{ flexDirection: 'row', backgroundColor: 'transparent' }}>
        {state.routes.map((route, index) => {
          const meta = TABS[route.name]
          if (!meta) return null
          const focused = state.index === index
          const Icon = meta.icon

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
              android_ripple={{ color: 'rgba(255,255,255,0.08)', borderless: true }}
              onPress={() => {
                haptic.selection()
                navigateToTab(route.key)
              }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4 }}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  backgroundColor: focused ? colors.mintSoft : 'transparent',
                  borderWidth: focused ? 1 : 0,
                  borderColor: colors.mintLine,
                }}
              >
                <Icon
                  size={20}
                  color={focused ? colors.mint : colors.textFaint}
                  strokeWidth={focused ? 2 : 1.6}
                />
              </View>
              <Text
                style={{
                  color: focused ? colors.mint : colors.textFaint,
                  fontFamily: focused ? typography.bodySemi : typography.body,
                  fontSize: 10.5,
                }}
              >
                {meta.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </BlurView>
  )
}
