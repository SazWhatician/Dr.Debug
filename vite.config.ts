import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'playground',
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
  server: {
    port: 5173,
    open: false
  }
})
