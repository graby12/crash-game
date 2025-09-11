import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // 👈 ensures Vercel uses dist/
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // local dev backend
        changeOrigin: true,
      },
    },
  },
});
