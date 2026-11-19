import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { fileURLToPath, URL } from 'url'
import { basename, isAbsolute, relative, sep } from 'node:path'
import { definitionsRoot, documentAssetsRoot, isDocumentAssetFile, syncEvidenceCatalog } from './scripts/evidence-catalog.mjs'

const isInside = (directory: string, path: string) => {
  const child = relative(directory, path)
  return child !== '' && child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child)
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'evidence-template-catalog',
      buildStart() { syncEvidenceCatalog() },
      configureServer(server) {
        server.watcher.add(documentAssetsRoot)
        server.watcher.on('all', (_event, path) => {
          const templateChanged = isInside(definitionsRoot, path) && /^(definition\.json|Layout\.tsx|Layout\.module\.css)$/.test(basename(path))
          const assetChanged = isInside(documentAssetsRoot, path) && isDocumentAssetFile(basename(path))
          if (!templateChanged && !assetChanged) return
          try { syncEvidenceCatalog() } catch (error) { server.config.logger.error(String(error)) }
        });
      },
    },
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
