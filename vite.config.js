import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    // ApexCharts tek başına ~950 kB; yalnızca grafik içeren sayfalarda yüklenir
    chunkSizeWarningLimit: 1100,
  },
})
