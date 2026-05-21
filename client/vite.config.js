import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['SmartNutri-logo.png'],
      manifest: {
        name: 'SmartNutri AI',
        short_name: 'SmartNutri',
        description: 'Clinical Nutrition Logging & Tracking Platform',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'SmartNutri-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'SmartNutri-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000 // Increase limit to 5MB to handle larger vendors safely
      }
    })
  ],
  resolve: {
    alias: {
      '@config': path.resolve(__dirname, '../env_config.js'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@mui')) {
              return 'vendor_mui';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor_charts';
            }
            if (id.includes('quill') || id.includes('react-quill')) {
              return 'vendor_editor';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
