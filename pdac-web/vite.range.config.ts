import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Separate build for the Module 5 LAN game clients (range/client/*), output to
// range-dist/. Kept apart from the deck build (vite.config.ts): the deck's dist/
// holds answer keys and must never be mixed with what participants' phones load.
const root = fileURLToPath(new URL('./range/client', import.meta.url));
const outDir = fileURLToPath(new URL('./range-dist', import.meta.url));

export default defineConfig({
  root,
  base: './',
  build: {
    outDir,
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0, // keep fonts/images as real files, served offline
    rollupOptions: {
      input: {
        play: fileURLToPath(new URL('./range/client/play.html', import.meta.url)),
        wc: fileURLToPath(new URL('./range/client/wc.html', import.meta.url)),
      },
    },
  },
});
