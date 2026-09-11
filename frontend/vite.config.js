import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['breeder-carbon-identify.ngrok-free.dev'],
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      // Proxy Socket.IO connections so the backend handles them at port 3000.
      // The browser connects to window.location.origin (port 5173); Vite forwards
      // the HTTP upgrade to the Express/Socket.IO server at port 3000.
      '/socket.io': { target: 'http://127.0.0.1:3000', changeOrigin: true, ws: true },
    },
  },
})

