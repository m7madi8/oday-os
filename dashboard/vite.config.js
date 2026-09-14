import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { odaySyncPlugin } from './server/odaySyncPlugin.js';

export default defineConfig({
  plugins: [react(), odaySyncPlugin()],
  server: {
    port: 5173,
    host: true,
    strictPort: true,
  },
});
