import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Il sito è il Pannello di Matteo (public/index.html, preparato da scripts/prepara-pannello.mjs).
// Vite compila solo il "ponte" (login, sincronizzazione, schede aggiuntive) in assets/lemo-bridge.js + .css
export default defineConfig({
  plugins: [react()],
  base: process.env.GH_PAGES ? '/lemo-linkedin/' : '/',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    lib: { entry: 'src/bridge/index.jsx', name: 'LemoBridge', formats: ['iife'], fileName: () => 'assets/lemo-bridge.js', cssFileName: 'assets/lemo-bridge' },
    copyPublicDir: true,
    emptyOutDir: true,
    chunkSizeWarningLimit: 5000,
  },
});
