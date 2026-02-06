import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@panoplia/core', '@panoplia/mpc', '@panoplia/social-recovery'],
  },
});
