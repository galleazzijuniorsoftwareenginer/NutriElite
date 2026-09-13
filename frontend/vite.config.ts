import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/app/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/register': 'http://127.0.0.1:8000',
      '/login': 'http://127.0.0.1:8000',
      '/me': 'http://127.0.0.1:8000',
      '/plan': 'http://127.0.0.1:8000',
      '/plans': 'http://127.0.0.1:8000',
      '/patients': 'http://127.0.0.1:8000',
      '/consultations': 'http://127.0.0.1:8000',
      '/profile': 'http://127.0.0.1:8000',
      '/food-groups': 'http://127.0.0.1:8000',
      '/templates': 'http://127.0.0.1:8000',
      '/stripe': 'http://127.0.0.1:8000',
      '/forgot-password': 'http://127.0.0.1:8000',
      '/reset-password': 'http://127.0.0.1:8000',
      '/appointments': 'http://127.0.0.1:8000',
      '/recipes': 'http://127.0.0.1:8000',
      '/shopping-list': 'http://127.0.0.1:8000',
      '/classrooms': 'http://127.0.0.1:8000',
      '/pathology-templates': 'http://127.0.0.1:8000',
      '/plan-preferences': 'http://127.0.0.1:8000',
      '/reference': 'http://127.0.0.1:8000',
      '/public': 'http://127.0.0.1:8000',
      '/change-password': 'http://127.0.0.1:8000',
      '/account': 'http://127.0.0.1:8000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}))
