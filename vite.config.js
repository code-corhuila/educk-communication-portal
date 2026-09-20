import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3005,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8085',
        changeOrigin: true
      }
    }
  }
});
