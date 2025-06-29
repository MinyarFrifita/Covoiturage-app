import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy toutes les requêtes /api et /auth vers le backend
      '/api': {
        target: 'http://localhost:8000', // URL de ton backend FastAPI
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Supprime /api du chemin
        secure: false,
      },
      '/auth': {
        target: 'http://localhost:8000', // Même backend
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, ''), // Supprime /auth du chemin
        secure: false,
      },
    },
  },
  // Ajout pour inclure les assets (images, etc.)
  assetsInclude: ['**/*.jpg', '**/*.png', '**/*.jpeg'],
});
