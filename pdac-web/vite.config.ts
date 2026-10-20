import { defineConfig } from 'vite';

// Static, offline build: relative asset paths so dist/ can be served from any
// folder (vite preview, python -m http.server, nginx) with the network unplugged.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    // Keep fonts and images as real files in dist/assets (no huge inline data URIs).
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2500,
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
