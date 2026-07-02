import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Use the library source directly so edits hot-reload without a build.
    alias: { '@narimangardi/draggable-grid': resolve(__dirname, '../src/index.ts') },
  },
});
