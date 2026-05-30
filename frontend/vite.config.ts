import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const bffProxyTarget = process.env.VITE_BFF_PROXY_TARGET || 'http://localhost:5200'
const frontendPort = Number(process.env.FRONTEND_PORT || 5173)
const strictPort = process.env.FRONTEND_STRICT_PORT !== 'false'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@features': path.resolve(__dirname, './src/features'),
      '@components': path.resolve(__dirname, './src/shared/components'),
      '@hooks': path.resolve(__dirname, './src/shared/hooks'),
      '@services': path.resolve(__dirname, './src/shared/services'),
    },
  },
  server: {
    port: frontendPort,
    strictPort,
    proxy: {
      '/api': {
        target: bffProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
