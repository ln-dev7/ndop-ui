import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RegistryItem } from '@ndop/schema';
import { fixture, runNdop, testEnvironment } from '../../testing/environment';
import { CHECKS, NODE_ENGINES } from '../doctor/doctor';
import { definedTokens } from '../edit/stylesheet';
import { readAliasBase } from '../install/project-files';
import { runDoctor, type DoctorResult } from './doctor';

type Environment = ReturnType<typeof testEnvironment>;

const APP_CONFIG = 'src/app/app.config.ts';
const STYLES = 'src/styles.css';
const DIALOG = 'src/app/ui/dialog/dialog.ts';

/**
 * A project with `ndop init` run and the given items added.
 *
 * @param items - Items to add.
 * @returns The test environment.
 */
async function installed(...items: string[]): Promise<Environment> {
  const environment = testEnvironment(fixture('ng22'));
  await runNdop(environment, 'init', '--yes');
  if (items.length) await runNdop(environment, 'add', '--yes', ...items);
  return environment;
}

/**
 * Runs `ndop doctor --json` and parses the result.
 *
 * @param environment - Test environment.
 * @param args - Options.
 * @returns The JSON result.
 */
async function doctor(
  environment: Environment,
  ...args: string[]
): Promise<DoctorResult> {
  const { out } = await runNdop(environment, 'doctor', '--json', ...args);
  return JSON.parse(out) as DoctorResult;
}

/**
 * One check of a result.
 *
 * @param result - A doctor result.
 * @param id - The check.
 * @returns It.
 */
function check(result: DoctorResult, id: string) {
  const found = result.checks.find((entry) => entry.id === id);
  if (!found) throw new Error(`No ${id} check.`);
  return found;
}

/**
 * The checks that aren't `ok`, as `id: status`.
 *
 * @param result - A doctor result.
 * @returns Their statuses by id.
 */
function problems(result: DoctorResult): Record<string, string> {
  return Object.fromEntries(
    result.checks
      .filter((entry) => entry.status !== 'ok')
      .map((entry) => [entry.id, entry.status]),
  );
}

/**
 * Edits a project file.
 *
 * @param environment - Test environment.
 * @param path - Project path.
 * @param change - Returns the new text.
 */
function edit(
  environment: Environment,
  path: string,
  change: (text: string) => string,
): void {
  const files = environment.project.files;
  files.set(path, change(files.get(path) ?? ''));
}

/**
 * Edits `package.json`.
 *
 * @param environment - Test environment.
 * @param change - Changes the parsed manifest.
 */
function editManifest(
  environment: Environment,
  change: (manifest: Record<string, Record<string, string>>) => void,
): void {
  edit(environment, 'package.json', (text) => {
    const manifest = JSON.parse(text);
    change(manifest);
    return JSON.stringify(manifest, null, 2);
  });
}

describe('ndop doctor', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('finds nothing wrong in a set-up project, online and offline', async () => {
    const environment = await installed('dialog-demo', 'pagination');
    for (const args of [[], ['--offline']]) {
      const result = await doctor(environment, ...args);
      expect(result.checks.map((entry) => entry.id)).toEqual(
        CHECKS.map(([id]) => id),
      );
      expect(problems(result)).toEqual({});
      expect(result).toEqual(
        expect.objectContaining({ ok: true, command: 'doctor', errors: [] }),
      );
      expect(process.exitCode).toBeUndefined();
    }
  });

  it('prints each check, then a count', async () => {
    const environment = await installed('dialog');
    edit(environment, APP_CONFIG, (text) => text.replace('provideNdop(),', ''));
    const { out } = await runNdop(environment, 'doctor', '--offline');
    expect(out).toContain('✓ Node ');
    expect(out).toContain(
      `✗ Providers      provideNdop() isn't in the providers of ${APP_CONFIG}.`,
    );
    expect(out).toContain(
      `fix: ndop doctor --fix adds provideNdop() to ${APP_CONFIG}, as ndop init does.`,
    );
    expect(out).toContain(
      '1 error. Run ndop doctor --fix to apply the safe fixes.',
    );
    expect(process.exitCode).toBe(1);
  });

  it('checks Node against the CLI engines range', async () => {
    const manifest = JSON.parse(
      readFileSync(join(import.meta.dirname, '../../../package.json'), 'utf-8'),
    ) as { engines: { node: string } };
    expect(NODE_ENGINES).toBe(manifest.engines.node);

    const environment = await installed();
    const { result } = await runDoctor(
      { cwd: '.', offline: true, nodeVersion: '22.11.0' },
      environment,
    );
    expect(check(result, 'node')).toEqual(
      expect.objectContaining({
        status: 'error',
        message: 'Node 22.11.0 is older than the CLI needs (>=22.12.0).',
      }),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects unsupported Angular versions and NgModule apps', async () => {
    const environment = await installed();
    editManifest(environment, (manifest) => {
      manifest['dependencies'] = {
        ...manifest['dependencies'],
        '@angular/core': '^23.0.0',
      };
    });
    expect(check(await doctor(environment, '--offline'), 'angular')).toEqual(
      expect.objectContaining({
        status: 'error',
        message:
          "Angular ^23.0.0 isn't supported yet; Ndop supports Angular 21 and 22.",
      }),
    );

    environment.project.files.delete(APP_CONFIG);
    const result = await doctor(environment, '--offline');
    expect(check(result, 'angular')).toEqual(
      expect.objectContaining({
        status: 'error',
        message: `No ${APP_CONFIG}. ndop init supports standalone apps bootstrapped with an ApplicationConfig.`,
      }),
    );
    expect(check(result, 'providers').message).toBe(
      "Not checked: the Angular app couldn't be read.",
    );
  });

  it('reports missing and mismatched packages, and installs them with --fix', async () => {
    const environment = await installed('dialog');
    editManifest(environment, (manifest) => {
      delete manifest['dependencies']?.['@ndop/primitives'];
      manifest['dependencies'] = {
        ...manifest['dependencies'],
        '@angular/cdk': '~22.0.0',
      };
    });
    environment.project.files.set(
      'node_modules/@lucide/angular/package.json',
      '{ "version": "1.2.0" }',
    );
    const before = check(await doctor(environment), 'packages');
    expect(before).toEqual(
      expect.objectContaining({ status: 'error', fixable: true }),
    );
    expect(before.details).toEqual([
      '@lucide/angular 1.2.0 is outside ^1.50.0 (needed by icons).',
      '@ndop/primitives is missing (needed by dialog).',
      '@angular/cdk is at 22.0, and @angular/core at 22.2.',
    ]);
    // Offline, items' imports still show what they need, without ranges.
    expect(
      check(await doctor(environment, '--offline'), 'packages').details,
    ).toEqual([
      '@ndop/primitives is missing (needed by dialog).',
      '@angular/cdk is at 22.0, and @angular/core at 22.2.',
    ]);

    const installs = environment.installs.length;
    await doctor(environment, '--fix', '--yes');
    expect(environment.installs.slice(installs)).toEqual([
      {
        specs: [
          '@angular/cdk@~22.2.0',
          '@lucide/angular@^1.50.0',
          '@ndop/primitives',
        ],
        dev: false,
      },
    ]);
  });

  it('reports a missing or invalid ndop.json, and skips what needs it', async () => {
    const environment = await installed();
    edit(environment, 'ndop.json', (text) =>
      text.replace('"style"', '"stile"'),
    );
    const invalid = await doctor(environment, '--offline');
    expect(check(invalid, 'config')).toEqual(
      expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('ndop.json is invalid'),
      }),
    );

    environment.project.files.delete('ndop.json');
    const missing = await doctor(environment, '--offline');
    expect(check(missing, 'config')).toEqual(
      expect.objectContaining({
        status: 'error',
        message: 'No ndop.json here.',
        fix: 'Run ndop init.',
      }),
    );
    expect(check(missing, 'aliases')).toEqual(
      expect.objectContaining({
        status: 'warning',
        message: 'Not checked: ndop.json is missing.',
      }),
    );
  });

  it('adds a missing tsconfig path with --fix, and reports alias folders that cannot exist', async () => {
    const environment = await installed();
    edit(environment, 'tsconfig.json', (text) =>
      text.replace(/"paths": \{[^}]*\},?/, ''),
    );
    expect(check(await doctor(environment, '--offline'), 'aliases')).toEqual(
      expect.objectContaining({
        status: 'error',
        message:
          "@/* isn't in compilerOptions.paths of tsconfig.json, so imports through it don't resolve.",
        fixable: true,
      }),
    );
    const fixed = await doctor(environment, '--offline', '--fix', '--yes');
    expect(fixed.fix?.files).toEqual([
      { path: 'tsconfig.json', action: 'update' },
    ]);
    expect(await readAliasBase(environment.project, '@/')).toBe('src/app');
    expect(check(fixed, 'aliases').status).toBe('ok');

    edit(environment, 'ndop.json', (text) =>
      text.replace('"src/app/blocks"', '"src/nowhere/blocks"'),
    );
    expect(check(await doctor(environment, '--offline'), 'aliases')).toEqual(
      expect.objectContaining({
        status: 'error',
        message:
          "aliases.blocks is src/nowhere/blocks, and src/nowhere doesn't exist.",
        fixable: false,
      }),
    );
  });

  it('reports a stylesheet that does not import Tailwind', async () => {
    const environment = await installed();
    edit(environment, STYLES, (text) =>
      text.replace("@import 'tailwindcss';", ''),
    );
    expect(check(await doctor(environment, '--offline'), 'tailwind')).toEqual(
      expect.objectContaining({
        status: 'error',
        message: `${STYLES} doesn't import tailwindcss.`,
        fix: 'Run ndop init, which sets Tailwind v4 up.',
      }),
    );

    editManifest(environment, (manifest) => {
      delete manifest['devDependencies']?.['tailwindcss'];
    });
    expect(
      check(await doctor(environment, '--offline'), 'tailwind').details,
    ).toEqual([
      "tailwindcss isn't in package.json.",
      `${STYLES} doesn't import tailwindcss.`,
    ]);
  });

  it('adds tokens items use from the theme with --fix, and flags colors that are not the theme’s', async () => {
    const environment = await installed('dialog');
    const styles = environment.project.files.get(STYLES) ?? '';
    edit(environment, STYLES, (text) =>
      text
        .replace(/\n {2}--background: [^;]+;/, '')
        .replace(':root {', ':root {\n  --brand: oklch(0.5 0.2 30);'),
    );
    const result = await doctor(environment);
    expect(check(result, 'tokens')).toEqual(
      expect.objectContaining({
        status: 'error',
        details: [
          "--background isn't defined in :root (used by dialog).",
          "--brand isn't one of the theme's tokens.",
        ],
        fix: 'ndop doctor --fix adds them from the default theme.',
        fixable: true,
      }),
    );
    // Offline, the theme can't be fetched to fill them in.
    expect(check(await doctor(environment, '--offline'), 'tokens')).toEqual(
      expect.objectContaining({
        fix: 'Run ndop doctor --fix without --offline to add them from the default theme.',
        fixable: false,
      }),
    );

    const fixed = await doctor(environment, '--fix', '--yes');
    expect(check(fixed, 'tokens')).toEqual(
      expect.objectContaining({
        status: 'warning',
        details: ["--brand isn't one of the theme's tokens."],
      }),
    );
    expect(environment.project.files.get(STYLES)).toContain(
      styles.match(/--background: [^;]+;/)?.[0],
    );
  });

  it('adds missing providers with --fix, and warns when nothing provides icons', async () => {
    const environment = await installed('pagination');
    const appConfig = environment.project.files.get(APP_CONFIG) ?? '';
    edit(environment, APP_CONFIG, (text) =>
      text.replace('provideNdop(),', '').replace('provideIcons()', ''),
    );
    const result = await doctor(environment, '--offline');
    expect(check(result, 'providers')).toEqual(
      expect.objectContaining({
        status: 'error',
        details: [
          `provideNdop() isn't in the providers of ${APP_CONFIG}.`,
          `Installed items draw icons, and ${APP_CONFIG} provides none.`,
        ],
        fixable: true,
      }),
    );
    await doctor(environment, '--offline', '--fix', '--yes');
    expect(environment.project.files.get(APP_CONFIG)?.replace(/\s/g, '')).toBe(
      appConfig.replace(/\s/g, ''),
    );
  });

  it('reports conflicts, missing and edited files, and items behind the registry', async () => {
    const environment = await installed('dialog', 'separator');
    edit(environment, DIALOG, (text) => `// mine\n${text}`);
    edit(
      environment,
      'src/app/lib/utils.ts',
      (text) => `<<<<<<< local\na\n=======\nb\n>>>>>>> ndop@9.0.0\n${text}`,
    );
    environment.project.files.delete('src/app/ui/separator/separator.ts');
    const dialog = structuredClone(
      environment.registry['dialog'],
    ) as RegistryItem;
    const version = dialog.version;
    dialog.version = '9.0.0';
    environment.registry['dialog'] = dialog;
    environment.registry[`dialog@${version}`] = structuredClone(dialog);
    (environment.registry[`dialog@${version}`] as RegistryItem).version =
      version;

    const result = await doctor(environment);
    expect(check(result, 'lockfile')).toEqual(
      expect.objectContaining({
        status: 'error',
        details: [
          'src/app/ui/separator/separator.ts is missing (from separator).',
          'src/app/lib/utils.ts has conflict markers.',
          `${DIALOG} was edited since it was installed.`,
          `dialog ${version} is behind the registry's 9.0.0.`,
        ],
        fixable: false,
      }),
    );
    expect(
      check(await doctor(environment, '--offline'), 'lockfile').message,
    ).toBe('2 errors about installed items. Updates not checked offline.');

    // --fix never resolves conflicts or touches component files.
    const files = new Map(environment.project.files);
    await doctor(environment, '--fix', '--yes');
    expect(environment.project.files.get(DIALOG)).toBe(files.get(DIALOG));
    expect(environment.project.files.get('src/app/lib/utils.ts')).toBe(
      files.get('src/app/lib/utils.ts'),
    );
  });

  it("reports items that don't support a zoneless or SSR app", async () => {
    const environment = await installed('dialog');
    const dialog = environment.registry['dialog'] as RegistryItem;
    environment.registry['dialog'] = {
      ...dialog,
      angular: {
        ...(dialog.angular as NonNullable<RegistryItem['angular']>),
        zoneless: false,
      },
    };
    expect(check(await doctor(environment), 'zoneless-ssr')).toEqual(
      expect.objectContaining({
        status: 'error',
        details: ['dialog needs zone.js, and this app is zoneless.'],
      }),
    );
    expect(
      check(await doctor(environment, '--offline'), 'zoneless-ssr').status,
    ).toBe('ok');
  });

  it('refreshes out-of-date agent files with --fix', async () => {
    const environment = await installed('dialog');
    const agents = environment.project.files.get('AGENTS.md') ?? '';
    edit(environment, 'AGENTS.md', (text) =>
      text.replace('### Workflow', '### Workflow\n\nStale.'),
    );
    expect(
      check(await doctor(environment, '--offline'), 'agent-files'),
    ).toEqual(
      expect.objectContaining({
        status: 'warning',
        details: ['AGENTS.md'],
        fixable: true,
      }),
    );
    await doctor(environment, '--offline', '--fix', '--yes');
    expect(environment.project.files.get('AGENTS.md')).toBe(agents);
  });

  it('fixes everything safe in one plan, and a second run changes nothing', async () => {
    const environment = await installed('dialog-demo', 'pagination');
    const healthy = new Map(environment.project.files);
    edit(environment, APP_CONFIG, (text) => text.replace('provideNdop(),', ''));
    edit(environment, 'tsconfig.json', (text) =>
      text.replace(/"paths": \{[^}]*\},?/, ''),
    );
    edit(environment, STYLES, (text) =>
      text.replace(/(\.dark \{[^}]*?)\n {2}--primary: [^;]+;/, '$1'),
    );

    const preview = await doctor(environment, '--fix', '--dry-run');
    expect(preview.fix?.files.map((file) => file.path).sort()).toEqual([
      APP_CONFIG,
      STYLES,
      'tsconfig.json',
    ]);
    expect(preview.fix?.applied).toBe(false);
    // The agent files mention the alias, so they follow it.
    expect(problems(preview)).toEqual({
      'agent-files': 'warning',
      aliases: 'error',
      providers: 'error',
      tokens: 'error',
    });
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;

    const fixed = await doctor(environment, '--fix', '--yes');
    expect(fixed.fix?.applied).toBe(true);
    expect(problems(fixed)).toEqual({});
    expect(fixed.ok).toBe(true);
    expect(process.exitCode).toBeUndefined();
    expect(definedTokens(environment.project.files.get(STYLES) ?? '')).toEqual(
      definedTokens(healthy.get(STYLES) ?? ''),
    );
    expect(await readAliasBase(environment.project, '@/')).toBe('src/app');

    const installs = environment.installs.length;
    const again = await doctor(environment, '--fix', '--yes');
    expect(again.fix).toEqual(
      expect.objectContaining({ applied: false, files: [], dependencies: [] }),
    );
    expect(environment.installs).toHaveLength(installs);
  });

  it('prints the fixes as diffs on a dry run, and writes nothing', async () => {
    const environment = await installed();
    edit(environment, APP_CONFIG, (text) => text.replace('provideNdop(),', ''));
    const before = new Map(environment.project.files);
    const { out } = await runNdop(
      environment,
      'doctor',
      '--offline',
      '--fix',
      '--dry-run',
    );
    expect(out).toContain(`+++ b/${APP_CONFIG}`);
    expect(out).toContain('Dry run: nothing was written.');
    expect(out).toContain('✗ Providers');
    expect(environment.project.files).toEqual(before);
  });
});
