import { cp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  addDevCommand,
  changedPaths,
  execCommand,
  hashTree,
  lastJsonObject,
  run,
} from '../registry-e2e/scenario';
import type { VerifyOutput } from './score';

/** The fixture app every prompt starts from (ADR-0019). */
export interface Fixture {
  /** Folder of the template app. */
  template: string;
  /** Hashes of its files, to tell what a prompt changed. */
  hashes: Map<string, string>;
  /** Path of the MCP config that runs the app's own Ndop MCP server. */
  mcpConfig: string;
}

/** Options of {@link prepareFixture}. */
export interface FixtureOptions {
  /** Folder to create it in. */
  workDir: string;
  /** Environment pointing at the local registries. */
  env: NodeJS.ProcessEnv;
  /** Version the `@ndop/*` packages were published under. */
  version: string;
  /** URL template of the served Ndop registry. */
  registryUrl: string;
  /** Angular CLI version for `ng new`. */
  angular: string;
  /** Log file. */
  log: string;
}

/**
 * Builds the fixture app once per run: `ng new` with pnpm (Angular,
 * zoneless, Tailwind), then `ndop init --agent claude-code --mcp --verify`,
 * whose agent files describe the MCP server the agent is given, with the
 * Ndop CLI and MCP server as dev dependencies. The root component's
 * template is just `<router-outlet />`, as in a real app. The npm packages items
 * need are installed up front, so prompts, which share `node_modules`,
 * never change it. The MCP config runs the app's own server against the
 * local registry.
 *
 * @param options - Where, against which packages, and the log.
 * @returns The fixture.
 */
export async function prepareFixture(
  options: FixtureOptions,
): Promise<Fixture> {
  await rm(options.workDir, { recursive: true, force: true });
  await mkdir(options.workDir, { recursive: true });
  const template = join(options.workDir, 'template');
  const at = { cwd: template, env: options.env, log: options.log };
  await run(
    [
      'npx',
      [
        '--yes',
        `@angular/cli@${options.angular}`,
        'new',
        'app',
        '--directory=template',
        '--style=tailwind',
        '--zoneless',
        '--ssr=false',
        '--package-manager=pnpm',
        '--skip-git',
        '--defaults',
      ],
    ],
    { ...at, cwd: options.workDir },
  );
  await run(
    execCommand('pnpm', `@ndop/cli@${options.version}`, [
      'init',
      '--yes',
      '--agent',
      'claude-code',
      '--mcp',
      '--verify',
    ]),
    at,
  );
  // ng new's welcome page says it "can be replaced"; a real app has. Left
  // in, verify would check Angular's placeholder whenever an agent touches
  // the root component.
  await writeFile(join(template, 'src/app/app.html'), '<router-outlet />\n');
  for (const spec of [
    `@ndop/cli@${options.version}`,
    `@ndop/mcp@${options.version}`,
  ]) {
    await run(addDevCommand('pnpm', spec), at);
  }
  const major = options.angular.split('.')[0];
  await run(
    [
      'pnpm',
      [
        'add',
        `@ndop/primitives@${options.version}`,
        `@angular/cdk@^${major}.0.0`,
        '--config.strict-dep-builds=false',
      ],
    ],
    at,
  );
  const mcpConfig = join(options.workDir, 'mcp.json');
  await writeFile(
    mcpConfig,
    `${JSON.stringify(
      {
        mcpServers: {
          ndop: {
            type: 'stdio',
            command: process.execPath,
            args: [join(template, 'node_modules/@ndop/mcp/main.js')],
            env: { NDOP_REGISTRY: options.registryUrl },
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  return { template, hashes: await hashTree(template), mcpConfig };
}

/**
 * A fresh copy of the fixture for one prompt: every file but
 * `node_modules`, which is linked to the template's.
 *
 * @param fixture - The fixture.
 * @param dest - Folder for the copy.
 */
export async function copyFixture(
  fixture: Fixture,
  dest: string,
): Promise<void> {
  await rm(dest, { recursive: true, force: true });
  await cp(fixture.template, dest, {
    recursive: true,
    filter: (source) =>
      !source.startsWith(join(fixture.template, 'node_modules')) &&
      !source.startsWith(join(fixture.template, '.angular')),
  });
  await symlink(
    join(fixture.template, 'node_modules'),
    join(dest, 'node_modules'),
  );
}

/**
 * What a prompt changed in its copy, compared with the template.
 *
 * @param fixture - The fixture.
 * @param copy - The prompt's copy.
 * @returns Added, changed and removed paths.
 */
export async function changedFiles(
  fixture: Fixture,
  copy: string,
): Promise<string[]> {
  return changedPaths(fixture.hashes, await hashTree(copy));
}

/**
 * The lockfile's installed items and the files `ndop add` wrote.
 *
 * @param copy - The prompt's copy.
 * @returns Item names and file paths.
 */
export async function lockedFiles(
  copy: string,
): Promise<{ installed: Set<string>; files: Set<string> }> {
  const lock = JSON.parse(
    await readFile(join(copy, 'ndop.lock.json'), 'utf-8'),
  ) as {
    items: Record<string, { name: string; files: { path: string }[] }>;
  };
  const items = Object.values(lock.items);
  return {
    installed: new Set(items.map((item) => item.name)),
    files: new Set(
      items.flatMap((item) => item.files.map((file) => file.path)),
    ),
  };
}

/**
 * Runs `ndop verify --json` on files in a prompt's copy, with the app's own
 * CLI.
 *
 * @param copy - The prompt's copy.
 * @param files - Project-relative `.ts` files.
 * @param env - Environment pointing at the local registries.
 * @param log - Log file.
 * @returns Verify's result, or `undefined` when it didn't print one.
 */
export async function verifyFiles(
  copy: string,
  files: readonly string[],
  env: NodeJS.ProcessEnv,
  log: string,
): Promise<VerifyOutput | undefined> {
  const output = await run(
    [
      process.execPath,
      [
        join(copy, 'node_modules/@ndop/cli/main.js'),
        'verify',
        ...files,
        '--json',
      ],
    ],
    { cwd: copy, env, log, allowFailure: true },
  );
  try {
    return lastJsonObject(output) as VerifyOutput;
  } catch {
    return undefined;
  }
}
