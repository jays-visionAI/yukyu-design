import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      // @forgedb/client 의 package.json exports 가 존재하지 않는
      // ./dist/index.esm.js 를 가리키는 문제를 우회한다.
      '@forgedb/client': fileURLToPath(
        new URL('./node_modules/@forgedb/client/dist/index.mjs', import.meta.url)
      ),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});