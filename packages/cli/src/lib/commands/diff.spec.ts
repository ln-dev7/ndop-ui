import type { RegistryItem } from '@ndop/schema';
import { fixture, runNdop, testEnvironment } from '../../testing/environment';
import { followMigrations } from '../update/diff';

const BUTTON = 'src/app/ui/button/button.ts';
const DIALOG = 'src/app/ui/dialog/dialog.ts';

/**
 * A project with `ndop init` run and the given items added.
 *
 * @param items - Items to add, with versions where wanted.
 * @returns The test environment.
 */
async function installed(...items: string[]) {
  const environment = testEnvironment(fixture('ng22'));
  await runNdop(environment, 'init', '--yes');
  await runNdop(environment, 'add', '--yes', ...items);
  return environment;
}

/**
 * Runs `ndop diff --json` and parses the result.
 *
 * @param environment - Test environment.
 * @param args - Items and options.
 * @returns The JSON result.
 */
async function diff(
  environment: ReturnType<typeof testEnvironment>,
  ...args: string[]
) {
  const { out } = await runNdop(environment, 'diff', '--json', ...args);
  return JSON.parse(out);
}

/**
 * Edits a project file in place.
 *
 * @param environment - Test environment.
 * @param path - Project path.
 * @param edit - Returns the new text.
 */
function edit(
  environment: ReturnType<typeof testEnvironment>,
  path: string,
  edit: (text: string) => string,
): void {
  environment.project.files.set(
    path,
    edit(environment.project.files.get(path) ?? ''),
  );
}

describe('ndop diff', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('shows your changes and upstream changes separately', async () => {
    const environment = await installed('button@0.1.0');
    edit(environment, BUTTON, (text) => text.replace("'default'", "'outline'"));

    const result = await diff(environment, 'button');
    expect(result.ok).toBe(true);
    const [button] = result.items;
    expect(button).toEqual(
      expect.objectContaining({
        registry: '@ndop',
        name: 'button',
        version: '0.1.0',
        target: environment.registry['button']?.version,
        added: [],
        codemods: [],
        warnings: [],
      }),
    );
    const [file] = button.files;
    expect(file).toEqual(
      expect.objectContaining({
        path: BUTTON,
        baseVersion: '0.1.0',
        local: 'edited',
        upstream: 'changed',
      }),
    );
    expect(file.localPatch).toMatch(/^\+.*'outline'/m);
    expect(file.localPatch).not.toContain('Styles from shadcn/ui');
    expect(file.upstreamPatch).toContain('- * Styles from shadcn/ui');
    expect(file.upstreamPatch).not.toContain("'outline'");
    expect(process.exitCode).toBeUndefined();
  });

  it('reports untouched, up-to-date items without patches', async () => {
    const environment = await installed('dialog');
    const result = await diff(environment);
    const dialog = result.items.find(
      (item: { name: string }) => item.name === 'dialog',
    );
    expect(dialog.target).toBe(dialog.version);
    expect(dialog.files).toEqual([
      {
        path: DIALOG,
        baseVersion: dialog.version,
        local: 'unchanged',
        upstream: 'unchanged',
      },
    ]);
  });

  it('flags missing files and leftover conflict markers', async () => {
    const environment = await installed('button', 'dialog');
    environment.project.files.delete(BUTTON);
    edit(
      environment,
      DIALOG,
      (text) => `<<<<<<< local\na\n=======\nb\n>>>>>>> ndop@9.9.9\n${text}`,
    );
    const result = await diff(environment, 'button', 'dialog');
    expect(
      result.items.map(
        (item: { files: { local: string }[] }) => item.files[0]?.local,
      ),
    ).toEqual(['missing', 'conflicted']);
  });

  it('follows renames and lists added files and codemods', async () => {
    const environment = await installed('dialog');
    const dialog = structuredClone(
      environment.registry['dialog'],
    ) as RegistryItem;
    const [file] = dialog.files ?? [];
    if (!file || !dialog.angular) throw new Error('Dialog has no file.');
    dialog.version = '9.0.0';
    dialog.files = [
      {
        ...file,
        path: 'ui/dialog/dialog-root.ts',
        target: '{ui}/dialog/dialog-root.ts',
      },
      {
        path: 'ui/dialog/dialog-footer.ts',
        type: 'registry:ui',
        target: '{ui}/dialog/dialog-footer.ts',
        content: 'export const footer = true;\n',
      },
    ];
    dialog.migrations = [
      { from: 'ui/dialog/dialog.ts', to: 'ui/dialog/dialog-root.ts' },
    ];
    dialog.codemods = [
      {
        since: '9.0.0',
        kind: 'rename-export',
        from: 'Dialog',
        to: 'DialogRoot',
      },
    ];
    dialog.angular = { ...dialog.angular, exports: ['DialogRoot'] };
    environment.registry['dialog'] = dialog;

    const [result] = (await diff(environment, 'dialog')).items;
    expect(result.files[0]).toEqual(
      expect.objectContaining({
        local: 'unchanged',
        upstream: 'renamed',
        renamedTo: 'src/app/ui/dialog/dialog-root.ts',
      }),
    );
    expect(result.added).toEqual(['src/app/ui/dialog/dialog-footer.ts']);
    expect(result.codemods).toEqual(dialog.codemods);
  });

  it('compares with an exact version, one item at a time', async () => {
    const environment = await installed('button@0.1.0', 'dialog');
    const [button] = (await diff(environment, 'button', '--to', '0.1.1')).items;
    expect(button.target).toBe('0.1.1');
    expect(button.files[0].upstream).toBe('unchanged');

    const both = await diff(environment, 'button', 'dialog', '--to', '0.1.1');
    expect(both.errors).toEqual([
      { message: '--to compares one item; name it.' },
    ]);
    expect(process.exitCode).toBe(1);
  });

  it('refuses items that are not installed and older targets', async () => {
    const environment = await installed('button');
    expect((await diff(environment, 'tooltip')).errors[0].message).toBe(
      "@ndop/tooltip isn't installed. Run ndop add tooltip first.",
    );
    expect(
      (await diff(environment, 'button', '--to', '0.1.0')).errors[0].message,
    ).toMatch(/0\.1\.0 is older than the installed/);
  });

  it('warns when the project formats files differently since install', async () => {
    const environment = await installed('button');
    environment.formatter = async () => async (_path, text) =>
      `${text}// Reformatted.\n`;
    const [button] = (await diff(environment, 'button')).items;
    expect(button.files[0].local).toBe('unchanged');
    expect(button.warnings).toEqual([
      `${BUTTON}: the project's formatting or aliases changed since ${button.version} was installed, so its diffs show more than your edits.`,
    ]);
  });

  it('prints both diffs per file', async () => {
    const environment = await installed('button@0.1.0');
    edit(environment, BUTTON, (text) => `// Ours.\n${text}`);
    const { out } = await runNdop(environment, 'diff', 'button');
    expect(out).toContain(
      `@ndop/button 0.1.0 → ${environment.registry['button']?.version}`,
    );
    expect(out).toContain(`edited, changed upstream  ${BUTTON}`);
    expect(out).toContain('Your changes:');
    expect(out).toContain('+// Ours.');
    expect(out).toContain('Upstream changes:');
  });
});

describe('followMigrations', () => {
  const item = {
    files: [{ path: 'c.ts' }],
    migrations: [
      { from: 'a.ts', to: 'b.ts' },
      { from: 'b.ts', to: 'c.ts' },
      { from: 'old.ts' },
    ],
  } as unknown as RegistryItem;

  it('follows chains and deletions', () => {
    expect(followMigrations(item, 'a.ts')).toEqual({
      path: 'c.ts',
      deleted: false,
    });
    expect(followMigrations(item, 'old.ts')).toEqual({
      path: 'old.ts',
      deleted: true,
    });
    expect(followMigrations(item, 'gone.ts')).toEqual({
      path: 'gone.ts',
      deleted: false,
    });
  });
});
