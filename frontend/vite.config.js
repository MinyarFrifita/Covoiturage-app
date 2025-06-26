import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy toutes les requêtes /api vers le backend
      '/api': {
        target: 'http://localhost:8000',  // URL de votre backend FastAPI
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false
      },
      // Proxy spécifique pour les endpoints d'authentification
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
