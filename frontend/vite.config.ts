import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  cacheDir: 'C:/Users/HP/launchcast_work/frontend/.vite_cache',
  server: {
    port: 3000,
    host: true,
  },
});
