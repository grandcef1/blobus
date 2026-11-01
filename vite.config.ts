import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- Плагин Tailwind v4
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // <-- Алиас для удобных импортов
    },
  },
});