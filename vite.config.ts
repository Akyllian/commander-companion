import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

/** `BASE_PATH=/repo-name/` for hosts that serve the app from a subfolder (e.g. GitHub Pages). */
function basePath(value: string | undefined): string {
  const trimmed = (value ?? '').trim().replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}/` : '/'
}

export default defineConfig(({ mode }) => {
  const base = basePath(loadEnv(mode, '.', '').BASE_PATH)

  return {
    base,
    // Shown in Altro → Informazioni (R1).
    define: { APP_VERSION: JSON.stringify(pkg.version) },
    plugins: [
      react(),
      VitePWA({
        // The new service worker waits for an explicit user confirmation (D-005):
        // an update must never reload the page in the middle of a game.
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon-180.png'],
        manifest: {
          id: base,
          name: 'Commander Companion',
          short_name: 'Commander',
          description: 'Life counter accessibile per partite Commander.',
          lang: 'it',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'any',
          background_color: '#010101',
          theme_color: '#071312',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: 'icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
          navigateFallback: `${base}index.html`,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      globals: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/pwa/register.ts', 'src/**/*.d.ts'],
        reporter: ['text', 'html'],
        thresholds: {
          // Scoring rules, persistence and history are the reliability core.
          'src/game/**': { lines: 100, branches: 100, functions: 100, statements: 100 },
          'src/settings/**': { lines: 100, branches: 100, functions: 100, statements: 100 },
          // Match presentation and the transient surface model (R2, D-039).
          'src/match/**': { lines: 100, branches: 100, functions: 100, statements: 100 },
          'src/shell/hubGeometry.ts': { lines: 100, branches: 100, functions: 100, statements: 100 },
          // Network, cache and contrast maths for commander art (D-026); canvas glue and hooks excluded.
          'src/media/{scryfall,artAnalysis,artStore,commanderArt,randomArt}.ts': { lines: 100, branches: 100, functions: 100, statements: 100 },
        },
      },
    },
  }
})
