import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: false  // <--- ESTO ELIMINA EL ERROR
  },
})