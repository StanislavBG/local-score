import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Built into bilko.run/projects/local-score/ as a static-path host.
// Analytics POST to /api/analytics/event — same origin (bilko.run) so no CORS.
export default defineConfig({
  base: '/projects/local-score/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
    chunkSizeWarningLimit: 8000, // web-llm is ~6MB; expected.
  },
});
