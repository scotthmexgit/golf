import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    include: [
      'src/games/**/*.test.ts',
      'src/bridge/**/*.test.ts',
      'src/lib/**/*.test.ts',
      'src/store/**/*.test.ts',
    ],
    environment: 'node',
    typecheck: {
      enabled: false,
    },
  },
})
