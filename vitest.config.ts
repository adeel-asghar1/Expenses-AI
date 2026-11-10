import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      // Unit tests cover pure logic; Expo modules are stubbed.
      'expo-crypto': fileURLToPath(new URL('./tests/stubs/expo-crypto.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
