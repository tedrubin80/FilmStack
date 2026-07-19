import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: process.env.VITE_HOST || 'localhost',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
