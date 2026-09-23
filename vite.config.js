import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Recreate __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const edition = process.env.VITE_EDITION === 'consumer' ? 'consumer' : 'byok'

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for extension
  define: {
    'import.meta.env.VITE_EDITION': JSON.stringify(edition),
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      }
    },
    outDir: process.env.SPELLPATH_OUT_DIR || 'dist-byok',
    emptyOutDir: true
  }
})
