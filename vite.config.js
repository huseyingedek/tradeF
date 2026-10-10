import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // jsxImportSource: tüm JSX metinleri src/i18n/jsx-runtime.js üzerinden otomatik çevrilir
  plugins: [react({ jsxImportSource: '/src/i18n' })],
  build: {
    // ApexCharts tek başına ~950 kB; yalnızca grafik içeren sayfalarda yüklenir
    chunkSizeWarningLimit: 1100,
  },
})
