/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../node_modules/.vite/registry',
  plugins: [angular(), nxViteTsPaths()],
  test: {
    name: 'registry',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{ui,lib,examples,testing}/**/*.spec.ts'],
    setupFiles: ['test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../coverage/registry',
      provider: 'v8' as const,
    },
  },
}));
