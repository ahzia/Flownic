import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inline-registry-chunks',
      generateBundle(options, bundle) {
        // Inline HandlerRegistry, TaskRegistry, and utility chunks into content script
        const chunksToInline: { key: string, name: string, code: string }[] = []
        
        // Find registry chunks
        const registryChunks = ['HandlerRegistry', 'TaskRegistry']
        registryChunks.forEach(registryName => {
          const chunkKey = Object.keys(bundle).find(key =>
            key.includes(registryName) && bundle[key].type === 'chunk'
          )
          if (chunkKey) {
            chunksToInline.push({
              key: chunkKey,
              name: registryName,
              code: (bundle[chunkKey] as any).code
            })
          }
        })
        
        // Find utility chunks used by handlers (kb, storage, etc.)
        const utilityChunks = ['kb', 'storage']
        utilityChunks.forEach(utilName => {
          const chunkKey = Object.keys(bundle).find(key =>
            (key.includes(utilName) || key.includes('utils')) && 
            bundle[key].type === 'chunk'
          )
          if (chunkKey && !chunksToInline.find(c => c.key === chunkKey)) {
            chunksToInline.push({
              key: chunkKey,
              name: utilName,
              code: (bundle[chunkKey] as any).code
            })
          }
        })

        if (chunksToInline.length === 0) return

        // Process each entry point (playground, content script, etc.)
        Object.keys(bundle).forEach(bundleKey => {
          const bundleItem = bundle[bundleKey]
          if (bundleItem.type !== 'chunk') return

          // For content script, inline ALL utility chunks
          const isContentScript = bundleKey.includes('contentScript')
          
          // Check if this bundle imports any registry chunks OR is content script with utility chunks
          const needsInlining = isContentScript || chunksToInline.some(chunk => 
            bundleItem.imports?.includes(chunk.key)
          )

          if (needsInlining) {
            chunksToInline.forEach(chunk => {
              // For content script, inline all utility chunks (not just imported ones)
              // For other bundles, only inline if actually imported
              const shouldInline = isContentScript || bundleItem.imports?.includes(chunk.key)
              
              if (shouldInline) {
                // Clean chunk code: remove exports and imports
                let cleanedCode = chunk.code
                cleanedCode = cleanedCode.replace(/export\s*\{[^}]*\}\s*;?\s*/g, '')
                cleanedCode = cleanedCode.replace(/export\s+class\s+/g, 'class ')
                cleanedCode = cleanedCode.replace(/export\s+default\s+/g, '')
                cleanedCode = cleanedCode.replace(/export\s+(const|let|var|function|async\s+function|class|interface|type|enum)\s+/g, '$1 ')
                // Remove all imports from the chunk being inlined
                cleanedCode = cleanedCode.replace(/import\s+.*?from\s+["'][^"']*["'];?\s*/g, '')

                // Inline at the beginning
                bundleItem.code = cleanedCode + '\n' + bundleItem.code

                // Remove ALL import statements that reference this chunk file
                // This is critical to avoid duplicate declarations
                const chunkFileName = chunk.key.split('/').pop().replace(/\.js$/, '')
                
                // Escape special regex characters in chunkFileName and chunk.key
                const escapedChunkFileName = chunkFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const escapedChunkKey = chunk.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const escapedChunkName = chunk.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                
                // More comprehensive patterns to catch all import variations
                const importPatterns = [
                  // Match: import { ... } from "../chunks/kb-xxx.js" or "chunks/kb-xxx.js"
                  new RegExp(`import\\s+\\{[^}]*\\}\\s+from\\s*["'][^"']*${escapedChunkFileName}[^"']*["'][\\s;]*`, 'g'),
                  // Match: import * as ... from "..."
                  new RegExp(`import\\s+\\*\\s+as\\s+\\w+\\s+from\\s*["'][^"']*${escapedChunkFileName}[^"']*["'][\\s;]*`, 'g'),
                  // Match: import default from "..."
                  new RegExp(`import\\s+\\w+\\s+from\\s*["'][^"']*${escapedChunkFileName}[^"']*["'][\\s;]*`, 'g'),
                  // Match: import { g as getKBEntries } from "..." (with any whitespace)
                  new RegExp(`import\\s+\\{[^}]*\\}\\s+from\\s*["'][^"']*${escapedChunkFileName}[^"']*["'][\\s;]*`, 'g'),
                  // Match any import from this exact chunk file path
                  new RegExp(`import[^"']*from\\s*["'][^"']*${escapedChunkKey}[^"']*["'][\\s;]*`, 'g'),
                  // Match by chunk name patterns in the path
                  new RegExp(`import[^"']*from\\s*["'][^"']*${escapedChunkName}[^"']*["'][\\s;]*`, 'gi'),
                  // Generic pattern: any line starting with import that mentions this chunk
                  new RegExp(`^import[^\\n]*${escapedChunkFileName}[^\\n]*[\\n]?`, 'gm')
                ]
                
                // Apply all patterns multiple times to catch nested/non-standard formats
                for (let i = 0; i < 3; i++) {
                  importPatterns.forEach(pattern => {
                    bundleItem.code = bundleItem.code.replace(pattern, '')
                  })
                }

                // Remove from imports array
                if (bundleItem.imports) {
                  bundleItem.imports = bundleItem.imports.filter((imp: string) => imp !== chunk.key)
                }

                console.log(`✅ Inlined ${chunk.name} into ${bundleKey}`)
              }
            })
          }
        })

        // Delete registry chunk files
        chunksToInline.forEach(chunk => {
          delete bundle[chunk.key]
        })

        // Ensure content script is properly formatted as IIFE with no ES module syntax
        const contentScriptKey = Object.keys(bundle).find(key =>
          key.includes('contentScript.js') && bundle[key].type === 'chunk'
        )
        if (contentScriptKey) {
          const contentChunk = bundle[contentScriptKey] as any
          let code = contentChunk.code
          
          // Only remove top-level import/export statements that weren't properly bundled
          // Be careful not to remove code that's already been inlined
          // Match imports at the start of lines (not inside function bodies)
          code = code.replace(/^import\s+(?:(?:\{[^}]*\}|\*|[\w]+)\s+from\s+)?["'][^"']*["'];?\s*/gm, '')
          code = code.replace(/^import\s+["'][^"']*["'];?\s*/gm, '')
          
          // Remove top-level export statements (but keep the actual code)
          code = code.replace(/^export\s*\{[^}]*\}\s*;?\s*/gm, '')
          code = code.replace(/^export\s+default\s+/gm, '')
          code = code.replace(/^export\s+(const|let|var|function|async\s+function|class|interface|type|enum)\s+/gm, '$1 ')
          
          // Wrap in IIFE to create a module-scoped execution context
          // This prevents polluting global scope and ensures no ES module syntax
          if (!code.match(/^\(function\(\)|^!function\(\)/)) {
            code = `(function() {\n'use strict';\n${code}\n})();`
          }
          
          contentChunk.code = code
          console.log('✅ Content script formatted as IIFE - removed ES module syntax while preserving inlined code')
        }
      }
    },
    {
      name: 'fix-playground-html-paths',
      generateBundle(options, bundle) {
        // Fix relative paths in playground.html for Chrome extension
        Object.keys(bundle).forEach(key => {
          // Check if this is the playground HTML file
          if (key.includes('playground.html') || key === 'src/ui/playground.html') {
            const htmlAsset = bundle[key]
            if (htmlAsset && htmlAsset.type === 'asset' && typeof htmlAsset.source === 'string') {
              // Fix paths: /ui/ -> ../../ui/, /chunks/ -> ../../chunks/, /assets/ -> ../../assets/
              // HTML is at dist/src/ui/playground.html, so we need to go up two levels
              htmlAsset.source = htmlAsset.source
                .replace(/src="\/ui\//g, 'src="../../ui/')
                .replace(/href="\/chunks\//g, 'href="../../chunks/')
                .replace(/href="\/assets\//g, 'href="../../assets/')
              console.log('✅ Fixed paths in playground.html')
            }
          }
        })
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
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        format: 'es', // Default format - will be overridden for content script in plugin
        manualChunks: (id) => {
          // NEVER create separate chunks for HandlerRegistry or TaskRegistry
          if (id.includes('HandlerRegistry') || id.includes('TaskRegistry')) {
            return null
          }
          
          // Keep all content script modules together - no separate chunks
          if (id.includes('content/') || id.includes('contentScript') || id.includes('ContentScriptMain')) {
            return null
          }
          
          // Inline all dependencies used by content script to avoid dynamic imports
          if (id.includes('@core/') || id.includes('@handlers/') || id.includes('@tasks/') || 
              id.includes('@utils/') || id.includes('@common/') || id.includes('@context/')) {
            // Check if imported by content script - inline everything
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
