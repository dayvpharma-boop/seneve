import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Le site est servi par GitHub Pages sous /seneve/.
// Pour un nom de domaine propre, lancer la construction avec SENEVE_BASE=/
export default defineConfig({
  cacheDir: './.vite-cache',
  base: process.env.SENEVE_BASE ?? '/seneve/',
  plugins: [react(), tailwindcss()],
  resolve: { preserveSymlinks: true, alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
});
