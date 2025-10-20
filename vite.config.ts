import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // UI components
        ui: resolve(__dirname, 'src/ui/index.html'),
        overlay: resolve(__dirname, 'src/ui/overlay.html'),
        
        // Background script
        background: resolve(__dirname, 'src/background/serviceWorker.ts'),
        
        // Content script
        content: resolve(__dirname, 'src/content/contentScript.ts'),
        
        // Handlers (individual files, no index)
        // handlers: resolve(__dirname, 'src/handlers/index.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'ui') return 'ui/index.js'
          if (chunkInfo.name === 'overlay') return 'ui/overlay.js'
          if (chunkInfo.name === 'background') return 'background/serviceWorker.js'
          if (chunkInfo.name === 'content') return 'content/contentScript.js'
          // if (chunkInfo.name === 'handlers') return 'handlers/[name].js'
          return '[name].js'
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    target: 'es2020',
    minify: false,
    sourcemap: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@background': resolve(__dirname, 'src/background'),
      '@content': resolve(__dirname, 'src/content'),
      '@handlers': resolve(__dirname, 'src/handlers'),
      '@common': resolve(__dirname, 'src/common'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})
