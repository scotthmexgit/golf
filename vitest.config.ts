import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/games/**/*.test.ts', 'src/bridge/**/*.test.ts'],
    environment: 'node',
    typecheck: {
      enabled: false,
    },
  },
})
