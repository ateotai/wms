import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Ensure Vite serves index.html from project root
  root: '.',
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    strictPort: true,
    open: false,
  },
  preview: {
    port: 5175,
    host: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
