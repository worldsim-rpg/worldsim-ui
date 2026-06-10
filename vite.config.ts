import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Spike server (server/): holds the Anthropic key, streams /api/turn.
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
