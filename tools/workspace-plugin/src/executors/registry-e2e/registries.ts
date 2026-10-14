import { readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join, normalize, sep } from 'node:path';
import type { SiteServer } from '../../utils/serve-site';
import { logger } from '@nx/devkit';
import { exportRegistryTemplate } from '../registry-template-export/template-export';
import {
  caseId,
  execCommand,
  lastJsonObject,
  localCliProblems,
  localCommand,
  run,
  runScriptCommand,
  type CommandLine,
  type InstallCase,
  type RunOptions,
} from './scenario';

/** Namespace the `registries` case installs the template under. */
export const SAMPLE_NAMESPACE = '@sample';

/** The variable the `registries` case's token header reads. */
export const SAMPLE_TOKEN_VARIABLE = 'SAMPLE_TOKEN';

/**
 * The page the `registries` case builds: the widget alone, whose action
 * brings Ndop's Button with it (ADR-0025).
 */
export const SAMPLE_PAGE = `import { Component } from '@angular/core';
import { Widget, WidgetAction } from '@/ui/widget/widget';

@Component({
  selector: 'app-sample',
  imports: [Widget, WidgetAction],
  template: \`
    <section sampleWidget aria-labelledby="usage">
      <h2 id="usage">Usage</h2>
      <button sampleWidgetAction size="sm">Upgrade</button>
    </section>
  \`,
})
export class Sample {}
`;

/**
 * Serves a built registry's JSON only to requests carrying
 * `Authorization: Bearer <token>`, as a private registry would, and
 * answers 401 to the rest.
 *
 * @param folder - Absolute folder to serve, holding `r/`.
 * @param token - The bearer token to require.
 * @returns The running server.
 */
export async function serveWithToken(
  folder: string,
  token: string,
): Promise<SiteServer> {
  const root = normalize(folder);
  const server = createServer(async (request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) {
      response
        .writeHead(401, { 'content-type': 'text/plain' })
        .end('Unauthorized');
      return;
    }
    const path = normalize(
      join(
        root,
        decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname),
      ),
    );
    const found =
      path.startsWith(root + sep) &&
      (await stat(path).catch(() => undefined))?.isFile();
    if (!found) {
      response
        .writeHead(404, { 'content-type': 'text/plain' })
        .end('Not found');
      return;
    }
    response
      .writeHead(200, { 'content-type': 'application/json' })
      .end(await readFile(path));
  });
  await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://localhost:${port}`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

/**
 * Adds the sample registry to an `ndop.json`, with its token read from
 * {@link SAMPLE_TOKEN_VARIABLE}, as the "Build your own registry" guide
 * tells users to (ADR-0025).
 *
 * @param config - The `ndop.json` text.
 * @param url - The served registry's base URL.
 * @returns The new text.
 */
export function withSampleRegistry(config: string, url: string): string {
  const parsed = JSON.parse(config) as Record<string, unknown>;
  parsed['registries'] = {
    ...(parsed['registries'] as Record<string, unknown> | undefined),
    [SAMPLE_NAMESPACE]: {
      url: `${url}/r/{name}.json`,
      headers: { Authorization: `Bearer \${${SAMPLE_TOKEN_VARIABLE}}` },
    },
  };
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

/**
 * Points the template's `package.json` at the Ndop packages under test, so
 * its own `build` script runs the freshly published `ndop build` and
 * compiles against the published `@ndop/core` and `@ndop/primitives`.
 *
 * @param manifest - The template's `package.json` text.
 * @param version - The published `@ndop/*` version.
 * @returns The new text.
 */
export function withCliVersion(manifest: string, version: string): string {
  const parsed = JSON.parse(manifest) as {
    devDependencies?: Record<string, string>;
  };
  const devDependencies = parsed.devDependencies;
  if (!devDependencies?.['@ndop/cli']) {
    throw new Error("The registry template doesn't depend on @ndop/cli.");
  }
  for (const name of Object.keys(devDependencies)) {
    if (name.startsWith('@ndop/')) devDependencies[name] = version;
  }
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

/** The parts of `ndop.lock.json` the `registries` case reads. */
export interface LockJson {
  /** Installed items by key. */
  items?: Record<string, { registry?: string; version?: string }>;
}

/**
 * What's wrong with the lockfile after `ndop add @sample/widget`: the
 * widget must be recorded under its namespace, and the Button it depends
 * on under Ndop's.
 *
 * @param lock - `ndop.lock.json`.
 * @param widgetVersion - The template's widget version.
 * @returns Problems; none when it's right.
 */
export function sampleLockProblems(
  lock: LockJson,
  widgetVersion: string,
): string[] {
  const problems: string[] = [];
  const widget = lock.items?.[`${SAMPLE_NAMESPACE}/widget`];
  if (
    widget?.registry !== SAMPLE_NAMESPACE ||
    widget.version !== widgetVersion
  ) {
    problems.push(
      `the lockfile doesn't record ${SAMPLE_NAMESPACE}/widget ${widgetVersion}: ${JSON.stringify(widget)}`,
    );
  }
  if (lock.items?.['@ndop/button']?.registry !== '@ndop') {
    problems.push("the lockfile doesn't record @ndop/button");
  }
  return problems;
}

/**
 * What's wrong with `ndop add @sample/widget --json` run without the
 * token: it must fail, naming the variable.
 *
 * @param output - Its standard output.
 * @returns Problems; none when it failed as it should.
 */
export function missingTokenProblems(output: string): string[] {
  const result = lastJsonObject(output) as {
    ok?: boolean;
    errors?: { message: string }[];
  };
  const expected = `Registry ${SAMPLE_NAMESPACE} needs the ${SAMPLE_TOKEN_VARIABLE} environment variable.`;
  return !result.ok &&
    result.errors?.some((error) => error.message === expected)
    ? []
    : [`without the token, ndop add didn't say "${expected}": ${output}`];
}

/** What {@link registriesProblems} needs from the case it runs in. */
export interface RegistriesCase {
  /** The set-up app. */
  app: string;
  /** Folder the template is exported to and built in. */
  workDir: string;
  /** Absolute workspace root. */
  root: string;
  /** The registry template folder, relative to `root`. */
  template: string;
  /** The published `@ndop/cli` version. */
  version: string;
  /** How commands run in the app, with the local registries' env. */
  options: RunOptions;
  /** Runs `ndop` with the case's package manager. */
  ndop: (args: string[]) => CommandLine;
  /** Builds the app with the case's package manager. */
  build: CommandLine;
}

/**
 * The `registries` case (ADR-0025): it exports `tools/registry-template`
 * as the public template repository gets it (see
 * {@link exportRegistryTemplate}), builds that copy with its own
 * `npm run build`, against the published `@ndop/cli`, and serves it behind
 * a bearer token. In the app,
 * it adds `@sample` to `ndop.json`, checks that `ndop add @sample/widget`
 * without the token fails naming the variable, then adds it with the
 * token, which also installs `button` from Ndop's registry, checks the
 * lockfile, imports a page using the widget, which brings the Button, and
 * builds the app.
 *
 * @param settings - The app, paths and commands.
 * @returns Problems; none when it all worked.
 */
export async function registriesProblems(
  settings: RegistriesCase,
): Promise<string[]> {
  const { app, options } = settings;
  const registry = join(settings.workDir, 'registry-template');
  await exportRegistryTemplate({
    root: settings.root,
    source: settings.template,
    output: registry,
    license: 'LICENSE',
  });
  const manifest = join(registry, 'package.json');
  await writeFile(
    manifest,
    withCliVersion(await readFile(manifest, 'utf-8'), settings.version),
  );
  const inRegistry = { ...options, cwd: registry };
  await run(['npm', ['install', '--no-audit', '--no-fund']], inRegistry);
  await run(['npm', ['run', 'build', '--', '--frozen-snapshots']], inRegistry);
  const { items } = JSON.parse(
    await readFile(join(registry, 'registry.json'), 'utf-8'),
  ) as { items: { name: string; version: string }[] };
  const widgetVersion = items.find((item) => item.name === 'widget')?.version;
  if (!widgetVersion) return ['the registry template has no widget item'];

  const token = `e2e-${Date.now()}`;
  const server = await serveWithToken(join(registry, 'public'), token);
  try {
    const config = join(app, 'ndop.json');
    await writeFile(
      config,
      withSampleRegistry(await readFile(config, 'utf-8'), server.url),
    );
    const add = settings.ndop([
      'add',
      `${SAMPLE_NAMESPACE}/widget`,
      '--yes',
      '--json',
    ]);
    const withoutToken = { ...options.env };
    delete withoutToken[SAMPLE_TOKEN_VARIABLE];
    const problems = missingTokenProblems(
      await run(add, { ...options, env: withoutToken, allowFailure: true }),
    );

    await run(add, {
      ...options,
      env: { ...options.env, [SAMPLE_TOKEN_VARIABLE]: token },
    });
    problems.push(
      ...sampleLockProblems(
        JSON.parse(await readFile(join(app, 'ndop.lock.json'), 'utf-8')),
        widgetVersion,
      ),
    );
    if (problems.length) return problems;

    await writeFile(join(app, 'src/app/sample.ts'), SAMPLE_PAGE);
    // The app's build only compiles what main.ts reaches.
    const main = join(app, 'src/main.ts');
    await writeFile(
      main,
      `${await readFile(main, 'utf-8')}import './app/sample';\n`,
    );
    await run(settings.build, options);
    return [];
  } finally {
    await server.close();
  }
}

/** Shared settings {@link runRegistriesCase} needs. */
export interface RegistriesCaseSettings {
  /** Folder the app, the template copy and the log go in. */
  workDir: string;
  /** Environment pointing every tool at the local registries. */
  env: NodeJS.ProcessEnv;
  /** Version the `@ndop/*` packages were published under. */
  version: string;
  /** Absolute workspace root. */
  root: string;
  /** The registry template folder, relative to `root`. */
  template: string;
}

/**
 * Runs the `registries` case: `ng new` with the case's package manager
 * and Angular CLI, `ndop init --yes`, a check that init added the app's
 * own `ndop` (see {@link localCliProblems}), then
 * {@link registriesProblems} through that `ndop`.
 *
 * @param installCase - Package manager and Angular version.
 * @param settings - Folders, environment and version.
 * @returns The case's name and, when it failed, why.
 */
export async function runRegistriesCase(
  installCase: InstallCase,
  settings: RegistriesCaseSettings,
): Promise<{ id: string; seconds?: number; error?: string }> {
  const id = caseId(installCase);
  const { packageManager } = installCase;
  const app = join(settings.workDir, id);
  const options: RunOptions = {
    cwd: app,
    env: settings.env,
    log: join(settings.workDir, `${id}.log`),
  };
  const ndop = (args: string[]) =>
    execCommand(packageManager, `@ndop/cli@${settings.version}`, args);
  logger.info(`Running ${id}…`);
  try {
    await run(
      [
        'npx',
        [
          '--yes',
          `@angular/cli@${installCase.angular}`,
          'new',
          'app',
          `--directory=${id}`,
          '--style=tailwind',
          '--zoneless',
          '--ssr=false',
          `--package-manager=${packageManager}`,
          '--skip-git',
          '--defaults',
        ],
      ],
      { ...options, cwd: settings.workDir },
    );
    const start = performance.now();
    await run(ndop(['init', '--yes']), options);
    const installed = localCliProblems(
      JSON.parse(await readFile(join(app, 'package.json'), 'utf-8')),
      settings.version,
      await run(localCommand(['--version']), options),
    );
    if (installed.length) return { id, error: installed.join('; ') };
    const problems = await registriesProblems({
      app,
      workDir: settings.workDir,
      root: settings.root,
      template: settings.template,
      version: settings.version,
      options,
      // After init, the app's own ndop, as users run it from then on.
      ndop: localCommand,
      build: runScriptCommand(packageManager, 'build'),
    });
    const seconds = Math.round((performance.now() - start) / 1000);
    return problems.length
      ? { id, seconds, error: problems.join('; ') }
      : { id, seconds };
  } catch (error) {
    return { id, error: (error as Error).message };
  }
}
