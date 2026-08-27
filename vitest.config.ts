import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@dr-debug/controller': path.resolve(__dirname, 'packages/controller/src/index.ts'),
      '@dr-debug/llms': path.resolve(__dirname, 'packages/llms/src/index.ts'),
      '@dr-debug/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@dr-debug/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
      '@dr-debug/extension': path.resolve(__dirname, 'packages/extension/src/index.ts'),
      'dr-debug': path.resolve(__dirname, 'packages/dr-debug/src/index.ts')
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['packages/*/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})
