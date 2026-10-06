import type { RegistryItem } from '@ndop/schema';
import { fixture, runNdop, testEnvironment } from '../../testing/environment';

/**
 * A test environment with `ndop init` already run on the ng22 fixture.
 *
 * @returns The environment.
 */
async function initialized() {
  const environment = testEnvironment(fixture('ng22'));
  await runNdop(environment, 'init', '--yes');
  return environment;
}

/**
 * Runs `ndop add` with `--yes --json` and parses the result.
 *
 * @param environment - Test environment.
 * @param args - Item names and options.
 * @returns The JSON result.
 */
async function add(
  environment: ReturnType<typeof testEnvironment>,
  ...args: string[]
) {
  const { out } = await runNdop(environment, 'add', '--yes', '--json', ...args);
  return JSON.parse(out);
}

/**
 * Replaces the registry's dialog with a new version.
 *
 * @param environment - Test environment.
 * @param content - New file content.
 */
function publishDialog(
  environment: ReturnType<typeof testEnvironment>,
  content: string,
): void {
  const dialog = structuredClone(
    environment.registry['dialog'],
  ) as RegistryItem;
  dialog.version = '0.2.0';
  dialog.files = dialog.files?.map((file) => ({ ...file, content }));
  environment.registry['dialog'] = dialog;
}

describe('ndop add', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('installs an item, its registry dependencies and its packages', async () => {
    const environment = await initialized();
    const result = await add(environment, 'dialog');
    // From the registry, which bumps versions as items change.
    const version = (name: string) => environment.registry[name]?.version;

    expect(result.items).toEqual([
      { registry: '@ndop', name: 'utils', version: version('utils') },
      { registry: '@ndop', name: 'dialog', version: version('dialog') },
    ]);
    expect(result.files).toEqual([
      { path: 'src/app/ui/dialog/dialog.ts', action: 'create' },
      { path: 'ndop.lock.json', action: 'update' },
      { path: 'AGENTS.md', action: 'update' },
    ]);
    expect(result.dependencies).toEqual([
      '@angular/cdk@^22.0.0',
      '@ndop/primitives',
    ]);
    expect(environment.project.files.get('src/app/ui/dialog/dialog.ts')).toBe(
      environment.registry['dialog']?.files?.[0]?.content,
    );
    const lock = JSON.parse(
      environment.project.files.get('ndop.lock.json') ?? '',
    );
    expect(Object.keys(lock.items)).toEqual([
      '@ndop/default',
      '@ndop/dialog',
      '@ndop/icons',
      '@ndop/utils',
    ]);
    expect(lock.items['@ndop/dialog']).toEqual({
      name: 'dialog',
      registry: '@ndop',
      version: version('dialog'),
      files: [
        {
          path: 'src/app/ui/dialog/dialog.ts',
          sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      ],
    });
  });

  it('changes nothing when run again', async () => {
    const environment = await initialized();
    await add(environment, 'dialog');
    const before = new Map(environment.project.files);
    const installs = environment.installs.length;

    const result = await add(environment, 'dialog');
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        applied: false,
        files: [],
        dependencies: [],
      }),
    );
    expect(environment.project.files).toEqual(before);
    expect(environment.installs).toHaveLength(installs);
    const { out } = await runNdop(environment, 'add', 'dialog', '--yes');
    expect(out).toBe('Already up to date; nothing changed.\n');
  });

  it("pins @angular/cdk to the app's Angular major", async () => {
    const environment = testEnvironment(fixture('ng21'));
    await runNdop(environment, 'init', '--yes');
    const result = await add(environment, 'tooltip');
    expect(result.dependencies).toContain('@angular/cdk@^21.0.0');
    expect((await add(environment, 'popover')).dependencies).not.toContain(
      '@angular/cdk@^21.0.0',
    );
  });

  it('installs examples under {blocks}/examples with the items they use', async () => {
    const environment = await initialized();
    const result = await add(environment, 'dialog-demo');
    expect(result.files.map((file: { path: string }) => file.path)).toEqual([
      'src/app/ui/button/button.ts',
      'src/app/ui/dialog/dialog.ts',
      'src/app/ui/input/input.ts',
      'src/app/ui/label/label.ts',
      'src/app/blocks/examples/dialog-demo.ts',
      'ndop.lock.json',
      'AGENTS.md',
    ]);
  });

  it('rewrites @/ imports to the project aliases', async () => {
    const environment = await initialized();
    const config = JSON.parse(environment.project.files.get('ndop.json') ?? '');
    config.aliases = {
      ui: 'src/app/components',
      lib: 'src/lib',
      blocks: 'src/app/blocks',
    };
    environment.project.files.set('ndop.json', JSON.stringify(config));
    await add(environment, 'dialog-demo');

    const dialog = environment.project.files.get(
      'src/app/components/dialog/dialog.ts',
    );
    expect(dialog).toContain("from '../../../lib/utils'");
    const demo = environment.project.files.get(
      'src/app/blocks/examples/dialog-demo.ts',
    );
    expect(demo).toContain("from '@/components/dialog/dialog'");
    expect(demo).not.toContain('@/ui/');
  });

  it('keeps local edits unless told to overwrite them', async () => {
    const environment = await initialized();
    await add(environment, 'dialog');
    environment.project.files.set('src/app/ui/dialog/dialog.ts', '// mine\n');
    publishDialog(environment, '// upstream\n');

    const kept = await add(environment, 'dialog');
    expect(kept.skipped).toEqual([
      {
        path: 'src/app/ui/dialog/dialog.ts',
        reason: 'It has local changes. Run with --overwrite to replace it.',
      },
    ]);
    expect(environment.project.files.get('src/app/ui/dialog/dialog.ts')).toBe(
      '// mine\n',
    );

    await add(environment, 'dialog', '--overwrite');
    expect(environment.project.files.get('src/app/ui/dialog/dialog.ts')).toBe(
      '// upstream\n',
    );
  });

  it('updates files the user never edited', async () => {
    const environment = await initialized();
    await add(environment, 'dialog');
    publishDialog(environment, '// upstream\n');

    const result = await add(environment, 'dialog');
    expect(result.skipped).toEqual([]);
    expect(environment.project.files.get('src/app/ui/dialog/dialog.ts')).toBe(
      '// upstream\n',
    );
    const lock = JSON.parse(
      environment.project.files.get('ndop.lock.json') ?? '',
    );
    expect(lock.items['@ndop/dialog'].version).toBe('0.2.0');
  });

  it('asks for ndop init first', async () => {
    const environment = testEnvironment(fixture('ng22'));
    const { out, err } = await runNdop(environment, 'add', 'dialog', '--yes');
    expect(out).toBe('');
    expect(err).toBe('✗ No ndop.json here. Run ndop init first.\n');
    expect(process.exitCode).toBe(1);
  });

  it('reports unknown items and registries', async () => {
    const environment = await initialized();
    const missing = await add(environment, 'carousel');
    expect(missing.errors[0].message).toBe(
      "Can't fetch mem://carousel: No item carousel in the test registry.",
    );
    const unknown = await add(environment, '@acme/table');
    expect(unknown.errors[0].message).toBe(
      'Unknown registry @acme. Add it to "registries" in ndop.json.',
    );
  });
});
