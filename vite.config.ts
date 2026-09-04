import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'COLL Attendance',
        short_name: 'COLL',
        description: 'COLL Attendance & Member Management System',
        theme_color: '#0f2747',
        background_color: '#f4f7fb',
        display: 'standalone',
        start_url: '/',
        icons: []
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787'
    }
  }
});
