import { fixture, runNdop, testEnvironment } from '../../testing/environment';

/**
 * Runs `ndop init --yes --json` and parses the result.
 *
 * @param environment - Test environment.
 * @param args - Extra arguments.
 * @returns The JSON result.
 */
async function init(
  environment: ReturnType<typeof testEnvironment>,
  ...args: string[]
) {
  const { out } = await runNdop(
    environment,
    'init',
    '--yes',
    '--json',
    ...args,
  );
  return JSON.parse(out);
}

describe('ndop init', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it.each(['ng21', 'ng22'])('sets up a fresh %s app', async (app) => {
    const environment = testEnvironment(fixture(app));
    const result = await init(environment);

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        applied: true,
        errors: [],
        warnings: [],
      }),
    );
    expect(result.items.map((item: { name: string }) => item.name)).toEqual([
      'default',
      'utils',
      'icons',
    ]);
    expect(result.files).toEqual([
      { path: 'ndop.json', action: 'create' },
      { path: 'tsconfig.json', action: 'update' },
      { path: 'src/styles.css', action: 'update' },
      { path: 'src/app/lib/utils.ts', action: 'create' },
      { path: 'src/app/lib/icons.ts', action: 'create' },
      { path: 'ndop.lock.json', action: 'create' },
      { path: 'src/app/app.config.ts', action: 'update' },
      { path: 'AGENTS.md', action: 'create' },
      { path: '.gitignore', action: 'create' },
    ]);
    expect(environment.installs).toEqual([
      {
        specs: [
          '@fontsource-variable/geist-mono@^5.3.0',
          '@fontsource-variable/geist@^5.3.0',
          '@lucide/angular@^1.50.0',
          '@ndop/core',
        ],
        dev: false,
      },
      { specs: ['@ndop/cli@^0.0.0'], dev: true },
    ]);
  });

  it('writes the config, alias, styles and providers', async () => {
    const environment = testEnvironment(fixture('ng22'));
    await init(environment);
    const files = environment.project.files;

    expect(JSON.parse(files.get('ndop.json') ?? '')).toEqual({
      $schema: 'https://ndop.dev/schema/config.json',
      style: 'default',
      tailwind: { css: 'src/styles.css' },
      aliases: {
        ui: 'src/app/ui',
        lib: 'src/app/lib',
        blocks: 'src/app/blocks',
      },
      importAlias: '@/',
      iconLibrary: 'lucide',
      agents: [],
      mcp: false,
    });
    expect(files.get('tsconfig.json')).toMatchSnapshot();
    expect(files.get('src/styles.css')).toMatchSnapshot();
    expect(files.get('src/app/app.config.ts')).toMatchSnapshot();
  });

  it('changes nothing when run again', async () => {
    const environment = testEnvironment(fixture('ng22'));
    await init(environment);
    const before = new Map(environment.project.files);

    const result = await init(environment);
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        applied: false,
        files: [],
        dependencies: [],
      }),
    );
    expect(environment.project.files).toEqual(before);
    expect(environment.installs).toHaveLength(2);
  });

  it('ignores .ndop/ in git, keeping the rest of .gitignore', async () => {
    const environment = testEnvironment({
      ...fixture('ng22'),
      '.gitignore': '/dist\n/node_modules\n',
    });
    await init(environment);
    expect(environment.project.files.get('.gitignore')).toBe(
      "/dist\n/node_modules\n\n# ndop verify's harness and screenshots\n.ndop/\n",
    );
  });

  it('adds @ndop/cli as a dev dependency, unless the app has it or --no-cli', async () => {
    expect(
      (await init(testEnvironment(fixture('ng22')), '--dry-run'))
        .devDependencies,
    ).toEqual(['@ndop/cli@^0.0.0']);
    expect(
      (await init(testEnvironment(fixture('ng22')), '--no-cli'))
        .devDependencies,
    ).toEqual([]);

    const files = fixture('ng22');
    const manifest = JSON.parse(files['package.json'] ?? '{}');
    manifest.devDependencies['@ndop/cli'] = '~0.1.0';
    files['package.json'] = JSON.stringify(manifest, null, 2);
    expect((await init(testEnvironment(files))).devDependencies).toEqual([]);
  });

  it('adds @ndop/verify with --verify', async () => {
    const result = await init(testEnvironment(fixture('ng22')), '--verify');
    expect(result.devDependencies).toContain('@ndop/verify');
  });

  it('sets up Tailwind v4 when the app has none', async () => {
    const files = fixture('ng22');
    delete files['.postcssrc.json'];
    files['src/styles.css'] = '';
    const manifest = JSON.parse(files['package.json'] ?? '{}');
    for (const name of ['tailwindcss', '@tailwindcss/postcss', 'postcss']) {
      delete manifest.devDependencies[name];
    }
    files['package.json'] = JSON.stringify(manifest, null, 2);
    const environment = testEnvironment(files);
    const result = await init(environment);

    expect(result.files).toContainEqual({
      path: '.postcssrc.json',
      action: 'create',
    });
    expect(
      JSON.parse(environment.project.files.get('.postcssrc.json') ?? ''),
    ).toEqual({
      plugins: { '@tailwindcss/postcss': {} },
    });
    expect(result.devDependencies).toEqual([
      '@ndop/cli@^0.0.0',
      '@tailwindcss/postcss',
      'postcss',
      'tailwindcss',
    ]);
    expect(environment.project.files.get('src/styles.css')).toMatch(
      /^@import 'tailwindcss';\n@import '@ndop\/core\/styles.css';/,
    );
  });

  it('uses an existing @/ alias for the item folders', async () => {
    const files = fixture('ng22');
    files['tsconfig.json'] = (files['tsconfig.json'] ?? '').replace(
      '"module": "preserve"',
      '"module": "preserve",\n    "paths": { "@/*": ["./src/*"] }',
    );
    const environment = testEnvironment(files);
    await init(environment);

    expect(
      JSON.parse(environment.project.files.get('ndop.json') ?? '').aliases,
    ).toEqual({
      ui: 'src/ui',
      lib: 'src/lib',
      blocks: 'src/blocks',
    });
    expect(environment.project.files.get('src/app/app.config.ts')).toContain(
      "import { provideIcons } from '@/lib/icons';",
    );
  });

  it('records --registry in ndop.json', async () => {
    const environment = testEnvironment(fixture('ng22'));
    await init(environment, '--registry', 'mem://{name}');
    expect(
      JSON.parse(environment.project.files.get('ndop.json') ?? '').registry,
    ).toBe('mem://{name}');
  });

  it('installs a theme from a URL with --theme', async () => {
    const environment = testEnvironment(fixture('ng22'));
    const url = 'https://ndop.dev/r/themes/custom.json?t=abc';
    environment.urls[url] = {
      name: 'custom',
      type: 'registry:theme',
      version: '1.0.0',
      title: 'Custom',
      description: 'A studio theme.',
      cssVars: { light: { background: 'ivory' }, dark: { background: 'navy' } },
    };
    const result = await init(environment, '--theme', `theme:${url}`);
    expect(result.items[0]).toEqual({
      source: url,
      name: 'custom',
      version: '1.0.0',
    });
    const css = environment.project.files.get('src/styles.css') ?? '';
    expect(css).toContain('--background: ivory');
    expect(css).toContain('--background: navy');
    const lock = JSON.parse(
      environment.project.files.get('ndop.lock.json') ?? '',
    );
    expect(Object.keys(lock.items)).toEqual([
      '@ndop/icons',
      '@ndop/utils',
      url,
    ]);
  });

  it('warns when it cannot find the providers array', async () => {
    const files = fixture('ng22');
    files['src/app/app.config.ts'] = 'export const appConfig = makeConfig();\n';
    const result = await init(testEnvironment(files));
    expect(result.warnings).toEqual([
      expect.stringContaining("Couldn't find the providers array"),
    ]);
  });

  it.each([
    [
      'no angular.json',
      (files: Record<string, string>) => delete files['angular.json'],
      'No angular.json here',
    ],
    [
      'Angular 20',
      (files: Record<string, string>) =>
        (files['package.json'] = (files['package.json'] ?? '').replace(
          /\^22\.\d+\.\d+/g,
          '^20.3.0',
        )),
      'Ndop needs Angular 21 or later; this project has ^20.3.0.',
    ],
    [
      'an NgModule app',
      (files: Record<string, string>) => delete files['src/app/app.config.ts'],
      'ndop init supports standalone apps',
    ],
  ])('refuses %s', async (_case, change, message) => {
    const files = fixture('ng22');
    change(files);
    const environment = testEnvironment(files);
    const result = await init(environment);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toContain(message);
    expect(process.exitCode).toBe(1);
    expect(environment.project.files).toEqual(new Map(Object.entries(files)));
  });

  it('prints diffs and writes nothing with --dry-run', async () => {
    const environment = testEnvironment(fixture('ng22'));
    const { out } = await runNdop(environment, 'init', '--dry-run');
    expect(out).toContain('--- /dev/null\n+++ b/ndop.json');
    expect(out).toContain('+    provideNdop(),');
    expect(out).toContain('install @ndop/core');
    expect(out).toContain('Dry run: nothing was written.');
    expect(environment.project.files.has('ndop.json')).toBe(false);
    expect(environment.installs).toEqual([]);
  });
});
