import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {preferencesCss} from './scripts/preferences-css';

// Le site est servi par GitHub Pages sous /seneve/.
// Pour un nom de domaine propre, lancer la construction avec SENEVE_BASE=/
export default defineConfig({
  cacheDir: './.vite-cache',
  base: process.env.SENEVE_BASE ?? '/seneve/',
  plugins: [react(), tailwindcss()],
  css: {postcss:{plugins:[preferencesCss()]}},
  // Liste des fichiers construits : le service hors connexion s'en sert pour garder les pages chargées à la demande.
  build: { manifest: 'asset-manifest.json' },
  resolve: { preserveSymlinks: true, alias: { '@': path.resolve(fileURLToPath(new URL('.', import.meta.url)), './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
});
