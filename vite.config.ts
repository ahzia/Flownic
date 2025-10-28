import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inline-content-script-deps',
      generateBundle(options, bundle) {
        // Find content script and HandlerRegistry chunks
        const contentScriptKey = Object.keys(bundle).find(key => 
          key.includes('contentScript.js') && bundle[key].type === 'chunk'
        )
        const handlerRegistryKey = Object.keys(bundle).find(key => 
          key.includes('HandlerRegistry') && bundle[key].type === 'chunk'
        )
        
        if (contentScriptKey && handlerRegistryKey) {
          const contentChunk = bundle[contentScriptKey] as any
          const handlerChunk = bundle[handlerRegistryKey] as any
          
          // If content script imports HandlerRegistry, inline it
          if (contentChunk.imports?.includes(handlerRegistryKey)) {
            // Clean HandlerRegistry code: remove export statements
            let handlerCode = handlerChunk.code
            // Remove export declarations like "export { HandlerRegistry };"
            handlerCode = handlerCode.replace(/export\s*\{[^}]*HandlerRegistry[^}]*\}\s*;?\s*/g, '')
            // Remove "export class HandlerRegistry" and replace with just "class HandlerRegistry"
            handlerCode = handlerCode.replace(/export\s+class\s+HandlerRegistry/g, 'class HandlerRegistry')
            // Remove "export default" statements
            handlerCode = handlerCode.replace(/export\s+default\s+/g, '')
            
            // Merge HandlerRegistry code into content script
            contentChunk.code = handlerCode + '\n' + contentChunk.code
            // Remove the import statement from content script
            contentChunk.code = contentChunk.code.replace(
              /import\s*\{[^}]*HandlerRegistry[^}]*\}\s*from\s*["'][^"']*["'];\s*/g,
              ''
            )
            // Remove HandlerRegistry from imports
            contentChunk.imports = contentChunk.imports.filter((imp: string) => imp !== handlerRegistryKey)
            // Delete the HandlerRegistry chunk
            delete bundle[handlerRegistryKey]
            
            console.log('✅ Inlined HandlerRegistry into content script (removed exports)')
          }
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // UI components
        ui: resolve(__dirname, 'src/ui/index.html'),
        overlay: resolve(__dirname, 'src/ui/overlay.html'),
        playground: resolve(__dirname, 'src/ui/playground.html'),
        
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
          if (chunkInfo.name === 'playground') return 'ui/playground.js'
          if (chunkInfo.name === 'background') return 'background/serviceWorker.js'
          if (chunkInfo.name === 'content') return 'content/contentScript.js'
          return '[name].js'
        },
        chunkFileNames: (chunkInfo) => {
          // Content script chunks should also use IIFE format
          if (chunkInfo.name?.includes('HandlerRegistry') || chunkInfo.name?.includes('TaskRegistry')) {
            // Check if this chunk is used by content script
            // Since we can't easily determine this here, we'll need to handle format in manualChunks
          }
          return 'chunks/[name]-[hash].js'
        },
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id) => {
          // Always bundle HandlerRegistry and TaskRegistry with content script (no separate chunks)
          // This prevents ES module syntax issues
          if (id.includes('HandlerRegistry') && id.includes('src/core')) {
            return null // Bundle with content script
          }
          
          if (id.includes('TaskRegistry') && id.includes('src/core')) {
            return null // Bundle with content script
          }
          
          // Keep all content script modules together
          if (id.includes('content/') || 
              id.includes('contentScript') || 
              id.includes('ContentScriptMain')) {
            return null
          }
        }
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
      '@core': resolve(__dirname, 'src/core'),
      '@tasks': resolve(__dirname, 'src/tasks'),
      '@context': resolve(__dirname, 'src/context'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})
