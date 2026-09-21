import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const isDesktop = process.env.ODAY_DESKTOP === '1';

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, dirname, '');
  const laravel = env.VITE_ODAY_LARAVEL || 'http://127.0.0.1:8000';
  const plugins = [react()];

  if (isDesktop) {
    const electron = (await import('vite-plugin-electron/simple')).default;
    plugins.push(
      electron({
        main: {
          entry: path.join(dirname, 'electron/main.ts'),
          vite: {
            build: {
              rollupOptions: {
                external: ['electron', 'electron-updater'],
              },
            },
          },
        },
        preload: {
          input: path.join(dirname, 'electron/preload.ts'),
          vite: {
            build: {
              rollupOptions: {
                output: {
                  format: 'cjs',
                  entryFileNames: 'preload.js',
                  inlineDynamicImports: true,
                },
              },
            },
          },
        },
      }),
    );
  }

  return {
    plugins,
    test: {
      environment: 'happy-dom',
      setupFiles: ['./src/test/setup.js'],
      include: ['src/**/*.test.{js,jsx}'],
    },
    base: isDesktop && command === 'build' ? './' : '/',
    server: {
      port: 5173,
      host: true,
      strictPort: true,
      watch: {
        ignored: ['**/release/**', '**/dist/**', '**/dist-electron/**'],
      },
      proxy: {
        '/api': {
          target: laravel,
          changeOrigin: true,
        },
      },
    },
  };
});
