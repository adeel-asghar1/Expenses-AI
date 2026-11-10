import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import { useFonts } from 'expo-font'
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter'
import { setAudioModeAsync } from 'expo-audio'

// Soft UI sounds should play even when the iPhone is on silent.
setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {})

import { useSettings } from '../state/settings'
import { bindApiBaseUrl } from '../api/client'
import { useActiveGroup } from '../hooks/useGroupData'
import { useRealtime } from '../hooks/useRealtime'
import { ToastHost } from '../components/Toast'

// Bind the API base URL provider before any screen can fire a request.
bindApiBaseUrl(() => useSettings.getState().apiUrl)

// Foreground notifications: show them as banners (we still prefer in-app toasts for foreground).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

SplashScreen.preventAutoHideAsync().catch(() => {})

/** Live bridge: one WS connection for the active flat, active on every screen. */
function RealtimeBridge() {
  const { group } = useActiveGroup()
  useRealtime(group?.id ?? null)
  return null
}

export default function RootLayout() {
  const [settingsHydrated, setSettingsHydrated] = useState(
    useSettings.persist.hasHydrated(),
  )
  const [fontsLoaded] = useFonts({
    'Fraunces-SemiBold': Fraunces_600SemiBold,
    'Fraunces-Bold': Fraunces_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
  })

  useEffect(() => {
    return useSettings.persist.onFinishHydration(() => setSettingsHydrated(true))
  }, [])

  const ready = fontsLoaded && settingsHydrated

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {})
  }, [ready])

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 10_000, refetchOnReconnect: true },
        },
      }),
  )

  if (!ready) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <View style={{ flex: 1, backgroundColor: '#0B0C1A' }}>
            <StatusBar style="light" />
            <RealtimeBridge />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0B0C1A' },
                animation: 'fade_from_bottom',
              }}
            />
            <ToastHost />
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
