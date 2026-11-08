import { defineConfig } from 'vite';
import federation from '@originjs/vite-plugin-federation';

const SHELL_ORIGIN = new URL(process.env.VITE_SHELL_ORIGIN || 'http://localhost:3000').origin;
const securityHeaders = {
  'Content-Security-Policy': `frame-ancestors ${SHELL_ORIGIN}`,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

export default defineConfig({
  server: {
    port: 3005,
    strictPort: true,
    headers: securityHeaders,
    proxy: {
      '/api': {
        target: 'http://localhost:8085',
        changeOrigin: true
      }
    }
  },
  preview: {
    headers: securityHeaders
  },
  plugins: [
    federation({
      name: 'communication_portal',
      filename: 'remoteEntry.js',
      exposes: {
        './CommunicationApp': './src/portal-app.js',
        './CommunicationStyles': './src/workspace.css'
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
