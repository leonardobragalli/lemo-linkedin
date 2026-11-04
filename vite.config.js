import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Su GitHub Pages il sito vive in /lemo-linkedin/
export default defineConfig({ plugins: [react()], base: process.env.GH_PAGES ? '/lemo-linkedin/' : '/' });
