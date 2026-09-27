import { defineConfig } from 'vite';
import federation from '@originjs/vite-plugin-federation';

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
  },
  plugins: [
    federation({
      name: 'communication_portal',
      filename: 'remoteEntry.js',
      exposes: {
        './CommunicationApp': './src/app.js',
        './CommunicationStyles': './src/style.css'
      },
      shared: []
    })
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  }
});
