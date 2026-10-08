import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The Spring Boot backend serves the REST API on 8080.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
