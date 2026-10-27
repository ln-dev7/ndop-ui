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
    // Style-heavy JSDOM role queries take seconds even in isolation. Serialize
    // files rather than relaxing the normal timeout under parallel CPU pressure.
    maxWorkers: 1,
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{ui,lib,examples,blocks,testing}/**/*.spec.ts'],
    setupFiles: ['test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../coverage/registry',
      provider: 'v8' as const,
    },
  },
}));
