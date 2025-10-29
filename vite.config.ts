import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inline-registry-chunks',
      generateBundle(options, bundle) {
        // Inline HandlerRegistry and TaskRegistry chunks into ALL entry points that import them
        const registryChunks = ['HandlerRegistry', 'TaskRegistry']
        
        // Find all chunks containing registries
        const chunksToInline: { key: string, name: string, code: string }[] = []
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

        if (chunksToInline.length === 0) return

        // Process each entry point (playground, content script, etc.)
        Object.keys(bundle).forEach(bundleKey => {
          const bundleItem = bundle[bundleKey]
          if (bundleItem.type !== 'chunk') return

          // Check if this bundle imports any registry chunks
          const needsInlining = chunksToInline.some(chunk => 
            bundleItem.imports?.includes(chunk.key)
          )

          if (needsInlining) {
            chunksToInline.forEach(chunk => {
              if (bundleItem.imports?.includes(chunk.key)) {
                // Clean chunk code: remove exports and imports
                let cleanedCode = chunk.code
                cleanedCode = cleanedCode.replace(/export\s*\{[^}]*\}\s*;?\s*/g, '')
                cleanedCode = cleanedCode.replace(/export\s+class\s+/g, 'class ')
                cleanedCode = cleanedCode.replace(/export\s+default\s+/g, '')
                cleanedCode = cleanedCode.replace(/export\s+(const|let|var|function|async\s+function|class|interface|type|enum)\s+/g, '$1 ')
                // Only remove imports from registry chunks themselves, not all imports
                cleanedCode = cleanedCode.replace(/import\s+.*?from\s+["'][^"']*["'];\s*/g, '')

                // Inline at the beginning
                bundleItem.code = cleanedCode + '\n' + bundleItem.code

                // Remove ONLY the specific import statement for this registry chunk
                // Use more precise patterns to avoid removing other imports
                const importPatterns = [
                  // Match: import { TaskRegistry, ... } from "...HandlerRegistry..."
                  new RegExp(`import\\s*\\{[^}]*\\b${chunk.name}\\b[^}]*\\}\\s*from\\s*["'][^"']*${chunk.name}[^"']*["'];?\\s*`, 'g'),
                  // Match: import HandlerRegistry from "...HandlerRegistry..."
                  new RegExp(`import\\s+\\b${chunk.name}\\b\\s+from\\s*["'][^"']*${chunk.name}[^"']*["'];?\\s*`, 'g'),
                  // Match: import { ... HandlerRegistry ... } from "..."
                  new RegExp(`import\\s*\\{[^}]*\\b${chunk.name}\\b[^}]*\\}\\s*from\\s*["'][^"']*["'];?\\s*`, 'g')
                ]
                importPatterns.forEach(pattern => {
                  bundleItem.code = bundleItem.code.replace(pattern, '')
                })

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

        // Wrap content script in IIFE if needed
        const contentScriptKey = Object.keys(bundle).find(key =>
          key.includes('contentScript.js') && bundle[key].type === 'chunk'
        )
        if (contentScriptKey) {
          const contentChunk = bundle[contentScriptKey] as any
          if (!contentChunk.code.startsWith('(function')) {
            contentChunk.code = `(function() {\n${contentChunk.code}\n})();`
          }
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
        chunkFileNames: (chunkInfo) => {
          return 'chunks/[name]-[hash].js'
        },
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id) => {
          // NEVER create separate chunks for HandlerRegistry or TaskRegistry
          // They must be inlined into their consuming entry points
          if (id.includes('HandlerRegistry') || id.includes('TaskRegistry')) {
            return null // Always inline, no separate chunks
          }
          
          // Keep all content script modules together
          if (id.includes('content/') || id.includes('contentScript') || id.includes('ContentScriptMain')) {
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
