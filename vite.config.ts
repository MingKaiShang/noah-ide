import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env': '{}',
    global: 'globalThis',
  },
  build: {
    target: 'esnext',
  },
  server: {
    port: 1420,
    strictPort: true,
  },
})
