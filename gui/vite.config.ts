import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isProduction = command === 'build';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        'core': resolve(__dirname, '../core'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: false, // Changed to false to preserve TypeScript output
      sourcemap: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          entryFileNames: 'bundle.js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
        },
      },
    },
    server: {
      open: false,
      port: 5173,
      strictPort: true,
      host: 'localhost',
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['./src/**/*.{test,spec}.{ts,tsx}'],
    },
  };
});
