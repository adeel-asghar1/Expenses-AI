import { Tabs } from 'expo-router/js-tabs'
import { TabBar } from '../../components/TabBar'
import { colors } from '../../design/tokens'

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg0 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ask AI' }} />
      <Tabs.Screen name="balances" options={{ title: 'Balances' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  )
}
