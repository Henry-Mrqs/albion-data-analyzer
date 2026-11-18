import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { catalogVersion } from './src/lib/catalogVersion.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_CATALOG_V': JSON.stringify(
      catalogVersion(fileURLToPath(new URL('./public/data/catalog.json', import.meta.url)))
    )
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
