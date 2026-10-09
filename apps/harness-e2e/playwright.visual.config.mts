import { defineConfig, devices } from '@playwright/test';
import { workspaceRoot } from '@nx/devkit';

/**
 * Visual regression (ADR-0021): every registry example and block in light,
 * dark and RTL, in Chromium only. The `visual` target runs the browser in
 * Playwright's Docker image, so screenshots render the same on every
 * machine; tests and the harness run on the host, which the browser
 * reaches through Playwright's exposed loopback network.
 */
export default defineConfig({
  testDir: './src/visual',
  // No platform in the name: the browser is always the same Linux image,
  // whatever runs the tests.
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  outputDir: '../../dist/.playwright/apps/harness-e2e/visual-output',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  reporter: [['list']],
  expect: {
    toHaveScreenshot: { maxDiffPixels: 0, animations: 'disabled' },
  },
  use: {
    baseURL: 'http://localhost:4300',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'pnpm exec nx run harness:serve',
    url: 'http://localhost:4300',
    reuseExistingServer: true,
    cwd: workspaceRoot,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium' }],
});
