import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { ReactNode } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, gradients } from '../design/tokens'

/** Scaffold every screen: gradient background + soft mint aura behind the header. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={[...gradients.screen] as [string, string]} style={{ flex: 1 }}>
      <View pointerEvents="none" style={{
        position: 'absolute', top: -140, left: -90, width: 340, height: 340, borderRadius: 999,
        backgroundColor: 'rgba(43,212,191,0.07)',
      }} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  )
}
