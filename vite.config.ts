import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Viagem da Galera',
        short_name: 'Viagem',
        description: 'Links, roteiro, mapa, gastos divididos, checklist e enquetes da viagem.',
        lang: 'pt-BR',
        theme_color: '#1A7FB0',
        background_color: '#F5FAFC',
        display: 'standalone',
        start_url: '/',
        // Android: "Compartilhar → Viagem" a partir do Instagram, TikTok, Maps...
        share_target: { action: '/ideias/nova', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } },
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
            handler: 'CacheFirst',
            options: { cacheName: 'mapa', expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          }
        ]
      }
    })
  ],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] }
})
