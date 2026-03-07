import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Socket.io needs its own proxy entry
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,  // ← CRITICAL: proxy WebSocket connections
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
