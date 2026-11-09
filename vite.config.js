import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // eslint-disable-next-line no-undef
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
})
