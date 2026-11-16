import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Client bundle for the braws.app landing (public/assets/landing/app.js + app.css). build.mjs writes the 27 static
// pages around it, rendered at build time with the SSR build of the same components (.ssr/entry-server.js).
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  publicDir: false,
  build: isSsrBuild
    ? { outDir: '.ssr', emptyOutDir: true, rollupOptions: { input: 'src/entry-server.tsx', output: { entryFileNames: 'entry-server.js' } } }
    : {
        outDir: '../public/assets/landing',
        emptyOutDir: true,
        assetsDir: '',
        sourcemap: false,
        modulePreload: { polyfill: false },
        cssCodeSplit: false,
        rollupOptions: {
          input: 'src/main.tsx',
          output: { entryFileNames: 'app.js', assetFileNames: 'app[extname]', chunkFileNames: '[name].js' },
        },
      },
}));
