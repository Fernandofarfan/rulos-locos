
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'
import vercelConfig from '../vercel.json'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  envDir: '../',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // La registración la maneja ReloadPrompt via useRegisterSW (virtual:pwa-register/react).
      // Evitamos 'auto' para no registrar el SW dos veces.
      injectRegister: null,
      includeAssets: ['icons/icon-192.svg', 'icons/icon-512.svg', 'icons/icon-maskable.svg', 'push-sw.js'],
      manifest: {
        name: 'Rulos Locos',
        short_name: 'RulosLocos',
        description: 'Dashboard Financiero Argentino',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'icons/icon-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Importa los handlers de push/notificationclick en el SW generado
        importScripts: ['/push-sw.js'],
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff2}'],
        cleanupOutdatedCaches: true,
      }
    }),
    // Bundle analyzer: npm run build:analyze
    mode === 'analyze' && visualizer({
      open: true,
      filename: 'dist/bundle-report.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          if (/node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/.test(id)) return 'chartjs';
          if (/node_modules[\\/]lightweight-charts[\\/]/.test(id)) return 'lightweight-charts';
          if (/node_modules[\\/]@sentry[\\/]/.test(id)) return 'sentry';
          if (/node_modules[\\/]html2canvas[\\/]/.test(id)) return 'html2canvas';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    exclude: ['node_modules', 'e2e'],
  },
  preview: {
    headers: {
      'Content-Security-Policy': vercelConfig.headers[0].headers.find(header => header.key === 'Content-Security-Policy')!.value,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        timeout: 20000,
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        timeout: 20000,
      },
    },
  },
}))
