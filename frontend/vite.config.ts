import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy: point the playground at your Playground BFF without CORS pain.
// Start the BFF on :8080 and set "BFF base URL" to "/bff" on the Connect page.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/bff': { target: 'http://localhost:8080', changeOrigin: true, ws: true, rewrite: (p) => p.replace(/^\/bff/, '') },
    },
  },
});
