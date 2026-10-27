import { createHash } from 'node:crypto';
import type { RegistryItem } from '@ndop/schema';
import {
  fixture,
  runNdop,
  testEnvironment,
  type TestEnvironmentOptions,
} from '../../testing/environment';

const BUTTON = 'src/app/ui/button/button.ts';
const SIZES = 'src/app/lib/sizes.ts';

type Environment = ReturnType<typeof testEnvironment>;

/**
 * A project with `ndop init` run and the given items added.
 *
 * @param items - Items to add, with versions where wanted.
 * @param options - Test environment options.
 * @returns The test environment.
 */
async function installed(
  items: string[],
  options: TestEnvironmentOptions = {},
): Promise<Environment> {
  const environment = testEnvironment(fixture('ng22'), options);
  await runNdop(environment, 'init', '--yes');
  await runNdop(environment, 'add', '--yes', ...items);
  return environment;
}

/**
 * Runs `ndop update --yes --json` and parses the result.
 *
 * @param environment - Test environment.
 * @param args - Items and options.
 * @returns The JSON result.
 */
async function update(environment: Environment, ...args: string[]) {
  const { out } = await runNdop(
    environment,
    'update',
    '--yes',
    '--json',
    ...args,
  );
  return JSON.parse(out);
}

/**
 * Reads a project file.
 *
 * @param environment - Test environment.
 * @param path - Project path.
 * @returns Its text.
 */
function read(environment: Environment, path: string): string {
  return environment.project.files.get(path) ?? '';
}

/**
 * Edits a project file in place.
 *
 * @param environment - Test environment.
 * @param path - Project path.
 * @param edit - Returns the new text.
 */
function edit(
  environment: Environment,
  path: string,
  edit: (text: string) => string,
): void {
  environment.project.files.set(path, edit(read(environment, path)));
}

/**
 * The lockfile entry of an item.
 *
 * @param environment - Test environment.
 * @param name - Item name.
 * @returns The entry.
 */
function locked(environment: Environment, name: string) {
  return JSON.parse(read(environment, 'ndop.lock.json')).items[`@ndop/${name}`];
}

/**
 * SHA-256 of a text, as the lockfile records it.
 *
 * @param text - File text.
 * @returns Hex digest.
 */
function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * A `registry:lib` item.
 *
 * @param version - Its version.
 * @param files - Registry paths under `lib/` to contents.
 * @param extra - Other fields.
 * @returns The item.
 */
function sizes(
  version: string,
  files: Record<string, string>,
  extra: Partial<RegistryItem> = {},
): RegistryItem {
  return {
    name: 'sizes',
    type: 'registry:lib',
    version,
    title: 'Sizes',
    description: 'Size classes.',
    files: Object.entries(files).map(([path, content]) => ({
      path: `lib/${path}`,
      type: 'registry:lib' as const,
      target: `{lib}/${path}`,
      content,
    })),
    ...extra,
  };
}

/**
 * Serves `sizes` at version 1.0.0, installs it, then publishes 2.0.0.
 *
 * @param before - Version 1.0.0.
 * @param after - Version 2.0.0.
 * @returns The environment, with 1.0.0 installed.
 */
async function sizesProject(
  before: RegistryItem,
  after: RegistryItem,
): Promise<Environment> {
  const environment = await installed(['sizes'], {
    registry: { ...testEnvironment({}).registry, sizes: before },
  });
  environment.registry['sizes@1.0.0'] = before;
  environment.registry['sizes'] = after;
  return environment;
}

const V1 = "export const sizes = {\n  sm: 'h-8',\n  lg: 'h-10',\n};\n";

describe('ndop update', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('replaces files nobody edited and moves the lockfile on', async () => {
    const environment = await installed(['button@0.1.0']);
    const latest = environment.registry['button'] as RegistryItem;
    const result = await update(environment);

    expect(result.ok).toBe(true);
    expect(result.updates).toEqual([
      {
        registry: '@ndop',
        name: 'button',
        from: '0.1.0',
        to: latest.version,
        files: [{ path: BUTTON, status: 'replaced' }],
      },
    ]);
    expect(read(environment, BUTTON)).toBe(latest.files?.[0]?.content);
    expect(locked(environment, 'button')).toEqual({
      name: 'button',
      registry: '@ndop',
      version: latest.version,
      files: [{ path: BUTTON, sha256: hash(read(environment, BUTTON)) }],
    });
    expect(process.exitCode).toBeUndefined();
  });

  it('merges upstream changes into your edits, and a rerun changes nothing', async () => {
    const environment = await installed(['button@0.1.0']);
    edit(environment, BUTTON, (text) => text.replace("'default'", "'outline'"));
    const result = await update(environment);

    expect(result.updates[0].files).toEqual([
      { path: BUTTON, status: 'merged' },
    ]);
    const merged = read(environment, BUTTON);
    expect(merged).toContain("'outline'");
    expect(merged).not.toContain('Styles from shadcn/ui');
    const latest = environment.registry['button']?.files?.[0]?.content ?? '';
    // The pristine new version's hash, not the merged file's: the next
    // update must merge again, not replace the user's edits.
    expect(locked(environment, 'button').files).toEqual([
      { path: BUTTON, sha256: hash(latest) },
    ]);

    const again = await update(environment);
    expect(again.updates).toEqual([]);
    expect(again.files).toEqual([]);
  });

  it('writes conflicts with markers, exits 2 and keeps the old base', async () => {
    const environment = await installed(['button@0.1.0']);
    edit(environment, BUTTON, (text) =>
      text.replace('Styles from shadcn/ui', 'Styles adapted from shadcn/ui'),
    );
    const before = locked(environment, 'button').files[0];
    const latest = environment.registry['button']?.version ?? '';
    const result = await update(environment);

    expect(result.updates[0].files).toEqual([
      { path: BUTTON, status: 'conflict', conflictLines: [1] },
    ]);
    expect(read(environment, BUTTON)).toMatch(
      new RegExp(
        `^<<<<<<< local\n[\\s\\S]*=======\n[\\s\\S]*>>>>>>> ndop@${latest}\n`,
      ),
    );
    expect(locked(environment, 'button')).toEqual(
      expect.objectContaining({
        version: latest,
        files: [{ ...before, version: '0.1.0' }],
      }),
    );
    expect(process.exitCode).toBe(2);
  });

  it('leaves unresolved conflicts alone, then records them with --continue', async () => {
    const environment = await installed(['button@0.1.0']);
    edit(environment, BUTTON, (text) =>
      text.replace('Styles from shadcn/ui', 'Styles adapted from shadcn/ui'),
    );
    await update(environment);
    const conflicted = read(environment, BUTTON);

    const unresolved = await update(environment);
    expect(unresolved.updates[0].files[0].status).toBe('unresolved');
    expect(read(environment, BUTTON)).toBe(conflicted);
    expect(process.exitCode).toBe(2);

    // Keep the user's side of the conflict.
    edit(environment, BUTTON, (text) =>
      text.replace(
        /^<<<<<<< local\n([\s\S]*?)=======\n[\s\S]*?>>>>>>> .*\n/,
        '$1',
      ),
    );
    process.exitCode = undefined;
    const pending = await update(environment);
    expect(pending.updates[0].files[0].status).toBe('pending');
    expect(process.exitCode).toBe(2);

    process.exitCode = undefined;
    const recorded = await update(environment, '--continue');
    expect(recorded.updates[0].files).toEqual([
      { path: BUTTON, status: 'resolved' },
    ]);
    const latest = environment.registry['button']?.files?.[0]?.content ?? '';
    expect(locked(environment, 'button').files).toEqual([
      { path: BUTTON, sha256: hash(latest) },
    ]);
    expect(read(environment, BUTTON)).toContain('Styles adapted from');
    expect(process.exitCode).toBeUndefined();
    expect((await update(environment)).updates).toEqual([]);
  });

  it('keeps both additions at one spot when the result type-checks', async () => {
    const environment = await sizesProject(
      sizes('1.0.0', { 'sizes.ts': V1 }),
      sizes('2.0.0', {
        'sizes.ts': V1.replace("lg: 'h-10',", "lg: 'h-10',\n  xl: 'h-12',"),
      }),
    );
    edit(environment, SIZES, (text) =>
      text.replace("lg: 'h-10',", "lg: 'h-10',\n  xs: 'h-6',"),
    );
    const result = await update(environment);
    expect(result.updates[0].files[0].status).toBe('merged');
    expect(read(environment, SIZES)).toBe(
      "export const sizes = {\n  sm: 'h-8',\n  lg: 'h-10',\n  xl: 'h-12',\n  xs: 'h-6',\n};\n",
    );
  });

  it('turns additions that clash into a conflict', async () => {
    const environment = await sizesProject(
      sizes('1.0.0', { 'sizes.ts': V1 }),
      sizes('2.0.0', {
        'sizes.ts': V1.replace("lg: 'h-10',", "lg: 'h-10',\n  xs: 'h-6',"),
      }),
    );
    edit(environment, SIZES, (text) =>
      text.replace("lg: 'h-10',", "lg: 'h-10',\n  xs: 'h-7',"),
    );
    const result = await update(environment);
    expect(result.updates[0].files[0]).toEqual({
      path: SIZES,
      status: 'conflict',
      conflictLines: [4],
      note: expect.stringMatching(/didn't type-check \(TS1117: /),
    });
    expect(process.exitCode).toBe(2);
  });

  it('creates new upstream files and lets go of dropped ones', async () => {
    const environment = await sizesProject(
      sizes('1.0.0', { 'sizes.ts': V1, 'old.ts': 'export const old = 1;\n' }),
      sizes('2.0.0', { 'sizes.ts': V1, 'new.ts': 'export const n = 1;\n' }),
    );
    const result = await update(environment);
    expect(result.updates[0].files).toEqual([
      { path: SIZES, status: 'unchanged' },
      {
        path: 'src/app/lib/old.ts',
        status: 'kept',
        note: "sizes 2.0.0 no longer has it; it's yours now.",
      },
      { path: 'src/app/lib/new.ts', status: 'created' },
    ]);
    expect(read(environment, 'src/app/lib/old.ts')).toBe(
      'export const old = 1;\n',
    );
    expect(
      locked(environment, 'sizes').files.map(
        (file: { path: string }) => file.path,
      ),
    ).toEqual([SIZES, 'src/app/lib/new.ts']);
  });

  it('updates theme variables one by one and keeps yours', async () => {
    const environment = await sizesProject(
      sizes(
        '1.0.0',
        { 'sizes.ts': V1 },
        {
          cssVars: { light: { brand: 'red', ring: 'gray' } },
        },
      ),
      sizes(
        '2.0.0',
        { 'sizes.ts': V1 },
        {
          cssVars: {
            light: { brand: 'blue', ring: 'black', 'brand-muted': 'green' },
          },
        },
      ),
    );
    edit(environment, 'src/styles.css', (text) =>
      text.replace('--brand: red', '--brand: pink'),
    );
    const result = await update(environment);
    const css = read(environment, 'src/styles.css');
    expect(css).toContain('--brand: pink');
    expect(css).toContain('--ring: black');
    expect(css).toContain('--brand-muted: green');
    expect(result.warnings).toContain(
      'Kept your value of --brand in :root; sizes 2.0.0 changed it too.',
    );
  });

  it('installs new dependencies and reports dropped ones', async () => {
    const environment = await sizesProject(
      sizes('1.0.0', { 'sizes.ts': V1 }, { dependencies: ['clsx'] }),
      sizes(
        '2.0.0',
        { 'sizes.ts': V1 },
        {
          dependencies: ['tailwind-merge'],
          registryDependencies: ['badge'],
        },
      ),
    );
    const result = await update(environment);
    expect(result.items.map((item: { name: string }) => item.name)).toEqual(
      expect.arrayContaining(['badge', 'sizes']),
    );
    expect(result.dependencies).toContain('tailwind-merge');
    expect(result.warnings).toContain(
      'sizes 2.0.0 no longer needs clsx; remove it yourself if nothing else uses it.',
    );
    expect(locked(environment, 'badge')).toBeDefined();
  });

  it('refuses uncommitted files unless forced', async () => {
    const environment = await installed(['button@0.1.0'], {
      dirty: [BUTTON],
    });
    const original = read(environment, BUTTON);
    const refused = await update(environment);
    expect(refused.ok).toBe(false);
    expect(refused.errors[0].message).toMatch(
      /^These files have uncommitted changes: src\/app\/ui\/button\/button\.ts\./,
    );
    expect(read(environment, BUTTON)).toBe(original);
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    const forced = await update(environment, '--force');
    expect(forced.ok).toBe(true);
    expect(read(environment, BUTTON)).not.toBe(original);
  });

  it('warns outside a git repository', async () => {
    const environment = await installed(['button@0.1.0'], { dirty: false });
    const result = await update(environment);
    expect(result.warnings).toContain(
      "This project isn't in a git repository, so nothing can undo this update. Keep a copy, or use git.",
    );
  });

  it('refuses items that are not installed and older versions', async () => {
    const environment = await installed(['button']);
    expect((await update(environment, 'tooltip')).errors[0].message).toBe(
      "@ndop/tooltip isn't installed. Run ndop add tooltip instead.",
    );
    expect(
      (await update(environment, 'button@0.1.0')).errors[0].message,
    ).toMatch(/0\.1\.0 is older than the installed .*only goes forward\.$/);
  });

  it('prints the table and writes nothing in a dry run', async () => {
    const environment = await installed(['button@0.1.0']);
    const original = read(environment, BUTTON);
    const latest = environment.registry['button']?.version ?? '';
    const { out } = await runNdop(environment, 'update', '--dry-run');
    expect(out).toMatch(/^Item\s+From\s+To\s+Clean\s+Merged\s+Conflicts\n/);
    expect(out).toMatch(
      new RegExp(`@ndop/button\\s+0\\.1\\.0\\s+${latest}\\s+1\\s+0\\s+0`),
    );
    expect(out).toContain('Dry run: nothing was written.');
    expect(read(environment, BUTTON)).toBe(original);
  });

  describe('items installed by URL', () => {
    const URL = 'https://kit.example/r/sizes.json?v=1';
    const V2 = "export const sizes = {\n  sm: 'h-8',\n  lg: 'h-12',\n};\n";
    const OTHER = 'src/app/lib/other.ts';

    /**
     * Installs `sizes` 1.0.0 from {@link URL}, edits `sizes.ts`, then
     * publishes 2.0.0 there.
     *
     * @returns The environment.
     */
    async function urlProject(): Promise<Environment> {
      const environment = testEnvironment(fixture('ng22'));
      await runNdop(environment, 'init', '--yes');
      const before = sizes('1.0.0', {
        'sizes.ts': V1,
        'other.ts': 'export const other = 1;\n',
      });
      environment.urls[URL] = before;
      await runNdop(environment, 'add', '--yes', URL);
      edit(environment, SIZES, (text) => `// Mine.\n${text}`);
      environment.urls[URL] = sizes('2.0.0', {
        'sizes.ts': V2,
        'other.ts': 'export const other = 2;\n',
      });
      return environment;
    }

    it('fetches the URL again and merges with its versioned URL', async () => {
      const environment = await urlProject();
      environment.urls['https://kit.example/r/sizes@1.0.0.json?v=1'] = sizes(
        '1.0.0',
        { 'sizes.ts': V1, 'other.ts': 'export const other = 1;\n' },
      );
      const result = await update(environment, URL);

      expect(result.updates).toEqual([
        {
          source: URL,
          name: 'sizes',
          from: '1.0.0',
          to: '2.0.0',
          files: [
            { path: SIZES, status: 'merged' },
            { path: OTHER, status: 'replaced' },
          ],
        },
      ]);
      expect(read(environment, SIZES)).toBe(`// Mine.\n${V2}`);
      const lock = JSON.parse(read(environment, 'ndop.lock.json'));
      expect(lock.items[URL]).toEqual({
        name: 'sizes',
        source: URL,
        version: '2.0.0',
        files: [
          { path: SIZES, sha256: hash(V2) },
          { path: OTHER, sha256: hash('export const other = 2;\n') },
        ],
      });
    });

    it('keeps edited files and replaces the rest without a versioned URL', async () => {
      const environment = await urlProject();
      const result = await update(environment);

      expect(result.updates[0].files).toEqual([
        {
          path: SIZES,
          status: 'kept',
          note: "Kept your edits: there's no https://kit.example/r/sizes@1.0.0.json?v=1 to merge with. Bring in sizes 2.0.0's changes by hand, then run ndop update --continue.",
        },
        { path: OTHER, status: 'replaced' },
      ]);
      expect(read(environment, SIZES)).toBe(`// Mine.\n${V1}`);
      expect(read(environment, OTHER)).toBe('export const other = 2;\n');
      const lock = JSON.parse(read(environment, 'ndop.lock.json'));
      expect(lock.items[URL].version).toBe('2.0.0');
      expect(lock.items[URL].files[0]).toEqual({
        path: SIZES,
        sha256: hash(V1),
        version: '1.0.0',
      });

      edit(environment, SIZES, () => `// Mine.\n${V2}`);
      const recorded = await update(environment, '--continue');
      expect(recorded.updates[0].files).toEqual([
        { path: SIZES, status: 'resolved' },
      ]);
      expect(
        JSON.parse(read(environment, 'ndop.lock.json')).items[URL].files[0],
      ).toEqual({ path: SIZES, sha256: hash(V2) });
    });
  });

  describe('migrations', () => {
    const v2 = (extra: Partial<RegistryItem> = {}) =>
      sizes(
        '2.0.0',
        { 'scale.ts': V1.replace("lg: 'h-10'", "lg: 'h-11'") },
        {
          migrations: [{ from: 'lib/sizes.ts', to: 'lib/scale.ts' }],
          ...extra,
        },
      );

    it('moves a file nobody edited to its new path', async () => {
      const environment = await sizesProject(
        sizes('1.0.0', { 'sizes.ts': V1 }),
        v2(),
      );
      const result = await update(environment);
      expect(result.updates[0].files).toEqual([
        { path: 'src/app/lib/scale.ts', from: SIZES, status: 'renamed' },
      ]);
      expect(environment.project.files.has(SIZES)).toBe(false);
      expect(read(environment, 'src/app/lib/scale.ts')).toContain("'h-11'");
      expect(result.files).toEqual(
        expect.arrayContaining([{ path: SIZES, action: 'delete' }]),
      );
      expect(result.warnings).toContain(
        `${SIZES} moved to src/app/lib/scale.ts; update the imports of it.`,
      );
      expect(
        locked(environment, 'sizes').files.map(
          (file: { path: string }) => file.path,
        ),
      ).toEqual(['src/app/lib/scale.ts']);
    });

    it('moves your edits with the file and merges them', async () => {
      const environment = await sizesProject(
        sizes('1.0.0', { 'sizes.ts': V1 }),
        v2(),
      );
      edit(environment, SIZES, (text) => `// Mine.\n${text}`);
      const result = await update(environment);
      expect(result.updates[0].files[0]).toEqual({
        path: 'src/app/lib/scale.ts',
        from: SIZES,
        status: 'renamed',
      });
      expect(read(environment, 'src/app/lib/scale.ts')).toBe(
        `// Mine.\n${V1.replace("'h-10'", "'h-11'")}`,
      );
    });

    it('deletes an unedited file upstream deleted, and keeps an edited one', async () => {
      const deleting = sizes(
        '2.0.0',
        { 'sizes.ts': V1 },
        { migrations: [{ from: 'lib/old.ts' }, { from: 'lib/older.ts' }] },
      );
      const environment = await sizesProject(
        sizes('1.0.0', {
          'sizes.ts': V1,
          'old.ts': 'export const old = 1;\n',
          'older.ts': 'export const older = 1;\n',
        }),
        deleting,
      );
      edit(environment, 'src/app/lib/older.ts', (text) => `${text}// Mine.\n`);
      const result = await update(environment);
      expect(result.updates[0].files).toEqual([
        { path: SIZES, status: 'unchanged' },
        { path: 'src/app/lib/old.ts', status: 'deleted' },
        {
          path: 'src/app/lib/older.ts',
          status: 'kept',
          note: "sizes 2.0.0 deletes it; kept because you edited it. It's yours now.",
        },
      ]);
      expect(environment.project.files.has('src/app/lib/old.ts')).toBe(false);
      expect(read(environment, 'src/app/lib/older.ts')).toContain('// Mine.');
      expect(
        locked(environment, 'sizes').files.map(
          (file: { path: string }) => file.path,
        ),
      ).toEqual([SIZES]);
    });
  });

  describe('codemods', () => {
    const page = `import { Component } from '@angular/core';
import { sizes } from '@/lib/sizes';

@Component({
  selector: 'app-page',
  template: \`<span ndSize size="sm"></span>\`,
})
export class Page {
  protected readonly all = sizes;
}
`;

    it('renames exports and inputs in your files when the update crosses them', async () => {
      const environment = await sizesProject(
        sizes('1.0.0', { 'sizes.ts': V1 }),
        sizes(
          '2.0.0',
          { 'sizes.ts': V1.replace('sizes', 'scales') },
          {
            codemods: [
              { since: '1.0.0', kind: 'rename-export', from: 'x', to: 'y' },
              {
                since: '2.0.0',
                kind: 'rename-export',
                from: 'sizes',
                to: 'scales',
              },
              {
                since: '2.0.0',
                kind: 'rename-input',
                selector: '[ndSize]',
                from: 'size',
                to: 'scale',
              },
            ],
          },
        ),
      );
      environment.project.files.set('src/app/page.ts', page);
      environment.project.files.set(
        'src/app/other.html',
        '<p ndSize [size]="s"></p><p size="untouched"></p>\n',
      );
      const result = await update(environment);

      expect(read(environment, 'src/app/page.ts')).toBe(
        page
          .replace('import { sizes }', 'import { scales }')
          .replace('= sizes;', '= scales;')
          .replace('size="sm"', 'scale="sm"'),
      );
      expect(read(environment, 'src/app/other.html')).toBe(
        '<p ndSize [scale]="s"></p><p size="untouched"></p>\n',
      );
      expect(result.updates[0].codemods).toEqual([
        expect.objectContaining({
          kind: 'rename-export',
          files: ['src/app/page.ts'],
        }),
        expect.objectContaining({
          kind: 'rename-input',
          files: ['src/app/other.html', 'src/app/page.ts'],
        }),
      ]);
    });

    it('plans native dialog and export moves together, including dry-run and repeat updates', async () => {
      const codemods: NonNullable<RegistryItem['codemods']> = [
        {
          since: '2.0.0',
          kind: 'move-export',
          from: 'sizes',
          to: 'NdDialog',
          module: '@ndop/primitives/dialog',
        },
        {
          since: '2.0.0',
          kind: 'native-dialog',
          from: 'ndDialogContent',
          to: 'dialog',
          overlay: 'ndDialogOverlay',
        },
      ];
      const environment = await sizesProject(
        sizes('1.0.0', { 'sizes.ts': V1 }),
        sizes('2.0.0', { 'sizes.ts': V1 }, { codemods }),
      );
      const source = page.replace(
        '<span ndSize size="sm"></span>',
        '<div ndDialogOverlay class="bg-black/70"></div><div ndDialogContent class="p-8">Mine</div>',
      );
      environment.project.files.set('src/app/page.ts', source);
      const before = new Map(environment.project.files);
      await runNdop(environment, 'update', '--yes', '--dry-run');
      expect(environment.project.files).toEqual(before);
      const result = await update(environment);
      const migrated = read(environment, 'src/app/page.ts');
      expect(migrated).toContain('NdDialog as sizes');
      expect(migrated).toContain(
        '<dialog ndDialogContent class="p-8 backdrop:bg-black/70">Mine</dialog>',
      );
      expect(migrated).not.toContain('ndDialogOverlay');
      expect(result.updates[0].codemods).toHaveLength(2);
      await update(environment);
      expect(read(environment, 'src/app/page.ts')).toBe(migrated);
      await runNdop(environment, 'update', '--continue');
      expect(read(environment, 'src/app/page.ts')).toBe(migrated);
    });

    it('keeps native migration idempotent while resolving an item merge with --continue', async () => {
      const next = V1.replace("'h-10'", "'h-12'");
      const environment = await sizesProject(
        sizes('1.0.0', { 'sizes.ts': V1 }),
        sizes(
          '2.0.0',
          { 'sizes.ts': next },
          {
            codemods: [
              {
                since: '2.0.0',
                kind: 'move-export',
                from: 'sizes',
                to: 'NdDialog',
                module: '@ndop/primitives/dialog',
              },
              {
                since: '2.0.0',
                kind: 'native-dialog',
                from: 'ndDialogContent',
                to: 'dialog',
                overlay: 'ndDialogOverlay',
              },
            ],
          },
        ),
      );
      edit(environment, SIZES, (text) => text.replace("'h-10'", "'h-14'"));
      environment.project.files.set(
        'src/app/page.ts',
        page.replace(
          '<span ndSize size="sm"></span>',
          '<div ndDialogContent>Mine</div>',
        ),
      );
      const first = await update(environment);
      expect(
        first.updates[0].files.some(
          (file: { status: string }) => file.status === 'conflict',
        ),
      ).toBe(true);
      const migrated = read(environment, 'src/app/page.ts');
      expect(migrated).toContain('NdDialog as sizes');
      expect(migrated).toContain('<dialog ndDialogContent>Mine</dialog>');
      environment.project.files.set(SIZES, next);
      const result = await update(environment, '--continue');
      expect(result.ok).toBe(true);
      expect(read(environment, 'src/app/page.ts')).toBe(migrated);
      expect(locked(environment, 'sizes').version).toBe('2.0.0');
      expect(
        locked(environment, 'sizes').files.every(
          (file: { version?: string }) => !file.version,
        ),
      ).toBe(true);
    });

    it('leaves every file and the lock untouched if a native migration is unsafe', async () => {
      const environment = await sizesProject(
        sizes('1.0.0', { 'sizes.ts': V1 }),
        sizes(
          '2.0.0',
          { 'sizes.ts': V1 },
          {
            codemods: [
              {
                since: '2.0.0',
                kind: 'move-export',
                from: 'sizes',
                to: 'NdDialog',
                module: '@ndop/primitives/dialog',
              },
              {
                since: '2.0.0',
                kind: 'native-dialog',
                from: 'ndDialogContent',
                to: 'dialog',
                overlay: 'ndDialogOverlay',
              },
            ],
          },
        ),
      );
      environment.project.files.set('src/app/page.ts', page);
      environment.project.files.set(
        'src/app/unsafe.html',
        '<div ndDialogOverlay (click)="track()"></div><div ndDialogContent></div>',
      );
      const before = new Map(environment.project.files);
      const { err } = await runNdop(environment, 'update', '--yes');
      expect(err).toContain('Custom ndDialogOverlay behavior');
      expect(environment.project.files).toEqual(before);
    });

    it('asks you to rename inputs yourself without an Angular compiler', async () => {
      const environment = await sizesProject(
        sizes('1.0.0', { 'sizes.ts': V1 }),
        sizes(
          '2.0.0',
          { 'sizes.ts': V1 },
          {
            codemods: [
              {
                since: '2.0.0',
                kind: 'rename-input',
                selector: '[ndSize]',
                from: 'size',
                to: 'scale',
              },
            ],
          },
        ),
      );
      environment.angularCompiler = async () => undefined;
      const result = await update(environment);
      expect(result.warnings).toContain(
        "Couldn't load @angular/compiler, so rename the size input to scale on [ndSize] in your templates yourself.",
      );
    });
  });

  describe('--interactive', () => {
    it('applies only the upstream changes you accept', async () => {
      const environment = await sizesProject(
        sizes('1.0.0', { 'sizes.ts': V1 }),
        sizes('2.0.0', {
          'sizes.ts': `// Sizes.\n${V1.replace("'h-10'", "'h-11'")}`,
        }),
      );
      edit(environment, SIZES, (text) => `${text}// Mine.\n`);
      const answers = [false, true];
      environment.interactive = true;
      environment.confirm = async () => answers.shift() ?? true;
      const { out } = await runNdop(
        environment,
        'update',
        '--yes',
        '--interactive',
      );

      expect(out).toContain(`${SIZES} change 1 of 2, at line 1`);
      expect(out).toContain('+// Sizes.');
      expect(read(environment, SIZES)).toBe(
        `${V1.replace("'h-10'", "'h-11'")}// Mine.\n`,
      );
      expect(out).toContain('Skipped 1 of 2 upstream changes.');
      const latest = environment.registry['sizes']?.files?.[0]?.content ?? '';
      expect(locked(environment, 'sizes').files).toEqual([
        { path: SIZES, sha256: hash(latest) },
      ]);
    });

    it('needs a terminal', async () => {
      const environment = await installed(['button@0.1.0']);
      const { err } = await runNdop(environment, 'update', '--interactive');
      expect(err).toContain(
        '--interactive asks questions, so it needs a terminal.',
      );
      expect(process.exitCode).toBe(1);
    });
  });
});
