import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa'

const manifest: Partial<ManifestOptions> = {
  theme_color: '#071724',
  background_color: '#071724',
  icons: [
    {
      purpose: 'maskable',
      sizes: '512x512',
      src: 'icon512_maskable.png',
      type: 'image/png',
    },
    {
      purpose: 'any',
      sizes: '512x512',
      src: 'icon512_rounded.png',
      type: 'image/png',
    },
  ],
  screenshots: [
    {
      src: '/screenshots/desktop.png',
      type: 'image/png',
      sizes: '1919x967',
      form_factor: 'wide',
    },
    {
      src: '/screenshots/mobile.png',
      type: 'image/png',
      sizes: '454x814',
      form_factor: 'narrow',
    },
  ],
  orientation: 'portrait',
  display: 'standalone',
  lang: 'ru-RU',
  name: 'Банковский PWA прототип',
  short_name: 'BankPWA',
  description:
    'Рабочий PWA-прототип мобильного банкинга для дипломного сценария перевода крупной суммы.',
}

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{html,css,js,ico,png,svg}'],
      },
      manifest,
    }),
  ],
})
