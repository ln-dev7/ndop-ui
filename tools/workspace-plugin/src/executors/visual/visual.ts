import { spawn, type SpawnOptions } from 'node:child_process';
import { createConnection } from 'node:net';
import { logger, type PromiseExecutor } from '@nx/devkit';
import type { VisualExecutorSchema } from './schema';

/** The image ADR-0021 pins, matching the installed `@playwright/test`. */
const DEFAULT_IMAGE = 'mcr.microsoft.com/playwright:v1.63.0-noble';

/**
 * Runs the visual regression tests (ADR-0021). Screenshots depend on the
 * browser build, fonts and rendering, so the browser runs as a Playwright
 * server in Playwright's Docker image while the tests and the app under
 * test run on the host; the browser reaches the host's localhost through
 * Playwright's exposed network. The same pixels come out on a laptop and
 * in CI, and `update` rewrites the committed baselines.
 *
 * @param options - Config, update mode, image and port.
 * @param context - Nx executor context.
 * @returns Whether the screenshots matched (or were written).
 *
 * @example
 * ```json
 * "visual": {
 *   "executor": "@ndop/workspace-plugin:visual",
 *   "options": { "config": "apps/harness-e2e/playwright.visual.config.mts" },
 *   "configurations": { "update": { "update": true } }
 * }
 * ```
 */
const visual: PromiseExecutor<VisualExecutorSchema> = async (
  options,
  context,
) => {
  const port = options.port ?? 3333;
  const image = options.image ?? DEFAULT_IMAGE;
  const name = `ndop-visual-${process.pid}`;
  const server = await exec('docker', dockerArgs(image, port, name), {
    cwd: context.root,
  });
  if (server !== 0) {
    logger.error(`Couldn't start ${image}. Is Docker running?`);
    return { success: false };
  }
  try {
    await waitForPort(port, 120_000);
    const code = await exec(
      'pnpm',
      ['exec', 'playwright', 'test', ...playwrightArgs(options)],
      {
        cwd: context.root,
        stdio: 'inherit',
        env: { ...process.env, ...connectEnv(port) },
      },
    );
    return { success: code === 0 };
  } finally {
    await exec('docker', ['stop', name], { cwd: context.root });
  }
};

/**
 * The `docker run` arguments that start a detached Playwright server, as
 * Playwright's Docker guide runs it, on the image's own `pwuser`.
 *
 * @param image - The Playwright image.
 * @param port - Host and container port.
 * @param name - Container name, so it can be stopped.
 * @returns Arguments after `docker`.
 */
export function dockerArgs(
  image: string,
  port: number,
  name: string,
): string[] {
  const version = image.match(/:v(\d+\.\d+\.\d+)/)?.[1];
  if (!version) {
    throw new Error(`Can't read the Playwright version from ${image}.`);
  }
  return [
    'run',
    '--detach',
    '--rm',
    '--init',
    '--name',
    name,
    '--publish',
    `${port}:${port}`,
    '--workdir',
    '/home/pwuser',
    '--user',
    'pwuser',
    image,
    '/bin/sh',
    '-c',
    `npx -y playwright@${version} run-server --port ${port} --host 0.0.0.0`,
  ];
}

/**
 * The `playwright test` arguments.
 *
 * @param options - Executor options.
 * @returns Arguments after `playwright test`.
 */
export function playwrightArgs(options: VisualExecutorSchema): string[] {
  return [
    '--config',
    options.config,
    ...(options.update ? ['--update-snapshots'] : []),
  ];
}

/**
 * Environment that points Playwright Test at the remote browser and lets
 * it reach the host's localhost.
 *
 * @param port - Host port of the browser server.
 * @returns Variables Playwright Test reads.
 */
export function connectEnv(port: number): Record<string, string> {
  return {
    PW_TEST_CONNECT_WS_ENDPOINT: `ws://127.0.0.1:${port}/`,
    PW_TEST_CONNECT_EXPOSE_NETWORK: '<loopback>',
  };
}

/**
 * Runs a command to completion.
 *
 * @param command - Executable.
 * @param args - Arguments.
 * @param options - Spawn options.
 * @returns Its exit code.
 */
function exec(
  command: string,
  args: string[],
  options: SpawnOptions,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', ...options });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
}

/**
 * Waits until something listens on a local port; the server in the
 * container may first download Playwright's npm package.
 *
 * @param port - The port.
 * @param timeout - Milliseconds to wait.
 * @returns Resolves once it accepts a connection.
 * @throws When it doesn't within the timeout.
 */
async function waitForPort(port: number, timeout: number): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const open = await new Promise<boolean>((resolve) => {
      const socket = createConnection({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.end();
        resolve(true);
      });
      socket.once('error', () => resolve(false));
    });
    if (open) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Nothing listened on port ${port} within ${timeout} ms.`);
}

export default visual;
