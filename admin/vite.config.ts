import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** 手动分包：react / react-dom / router 一份，recharts 一份，其余进业务 chunk */
function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) {
    return undefined
  }
  if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) {
    return 'recharts'
  }
  if (
    id.includes('/react/') ||
    id.includes('/react-dom/') ||
    id.includes('/react-is/') ||
    id.includes('/scheduler/') ||
    id.includes('/react-router') ||
    id.includes('/react-router-dom/')
  ) {
    return 'react-vendor'
  }
  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    port: 5101,
    strictPort: true,
  },
})
