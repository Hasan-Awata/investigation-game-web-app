import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { fileURLToPath, URL } from 'url'
import { relative, sep } from 'node:path'
import { definitionsRoot, syncEvidenceCatalog } from './scripts/evidence-catalog.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'evidence-template-catalog',
      buildStart() { syncEvidenceCatalog() },
      configureServer(server) {
        server.watcher.on('all', (_event, path) => {
          const template = relative(definitionsRoot, path);
          if (!template || template.startsWith(`..${sep}`) || !/[/\\](definition\.json|Layout\.tsx|Layout\.module\.css)$/.test(template)) return;
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
