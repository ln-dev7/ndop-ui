import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { buildRegistry } from './build';
import type { BuildOptions } from './types';

// Fixtures live inside the workspace so `ngc` and `@angular/core` resolve
// from its node_modules, as they would in a registry author's repo.
const scratch = join(import.meta.dirname, '../../../../../tmp');

const UTILS = `/** Joins class names. */
export function cn(...names: string[]): string {
  return names.join(' ');
}
`;

const BADGE = `import { Directive, input } from '@angular/core';
import { cn } from '@/lib/utils';

/** A small status label. */
@Directive({ selector: '[badge]', host: { '[class]': 'classes()' } })
export class Badge {
  /** Extra classes. */
  readonly class = input('');
  protected classes() {
    return cn('rounded', this.class());
  }
}
`;

const THEME = `@import '@fontsource-variable/geist';
@theme {
  --font-sans: 'Geist Variable',
    sans-serif;
}
:root {
  --background: white;
}
.dark {
  --background: black;
}
@media (prefers-color-scheme: dark) {
  [data-ndop-theme='system'] {
    --background: black;
  }
}
`;

const ANGULAR = { minVersion: '21.0.0', zoneless: true, ssr: true };

/**
 * A small valid manifest: a lib, a ui item using it, and a theme.
 *
 * @returns Manifest items.
 */
function items(): Record<string, unknown>[] {
  return [
    {
      name: 'utils',
      type: 'registry:lib',
      version: '1.0.0',
      title: 'Utils',
      description: 'Class helpers.',
      files: [
        {
          path: 'lib/utils.ts',
          type: 'registry:lib',
          target: '{lib}/utils.ts',
        },
      ],
    },
    {
      name: 'badge',
      type: 'registry:ui',
      version: '1.0.0',
      title: 'Badge',
      description: 'A status label.',
      registryDependencies: ['utils'],
      files: [
        {
          path: 'ui/badge/badge.ts',
          type: 'registry:ui',
          target: '{ui}/badge/badge.ts',
        },
      ],
      angular: { ...ANGULAR, exports: ['Badge'] },
    },
    {
      name: 'plain',
      type: 'registry:theme',
      version: '1.0.0',
      title: 'Plain',
      description: 'Black and white.',
      dependencies: ['@fontsource-variable/geist@^5.3.0'],
    },
  ];
}

let root: string;

/**
 * Writes a registry fixture.
 *
 * @param files - Registry-relative paths to contents; `registry.json` is
 *   written from `manifestItems`.
 * @param manifestItems - Items for `registry.json`.
 */
async function fixture(
  files: Record<string, string>,
  manifestItems: Record<string, unknown>[] = items(),
): Promise<void> {
  const all = {
    'lib/utils.ts': UTILS,
    'ui/badge/badge.ts': BADGE,
    'themes/plain/theme.css': THEME,
    'changelog/badge.md': '# Badge\n\n## 1.0.0\n\nFirst release.\n',
    'changelog/plain.md': '## 1.0.0\n\nFirst release.\n',
    ...files,
    'registry.json': JSON.stringify({
      name: 'acme',
      homepage: 'https://acme.dev',
      items: manifestItems,
    }),
  };
  for (const [path, content] of Object.entries(all)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
}

/**
 * Runs the build on the fixture, without CI's frozen snapshots, `ngc` or
 * metadata unless asked.
 *
 * @param options - Overrides.
 * @returns The build result.
 */
function build(options: Partial<BuildOptions> = {}) {
  return buildRegistry({
    root,
    output: join(root, 'dist'),
    frozenSnapshots: false,
    compile: false,
    metadata: false,
    ...options,
  });
}

/**
 * Reads a JSON file from the fixture.
 *
 * @param path - Fixture-relative path.
 * @returns The parsed value.
 */
async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(root, path), 'utf-8'));
}

beforeEach(async () => {
  await mkdir(scratch, { recursive: true });
  root = await mkdtemp(join(scratch, 'ndop-build-spec-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('buildRegistry', () => {
  it('writes the index, each item, and a snapshot per version', async () => {
    await fixture({});
    const result = await build({ compile: true });

    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.items).toEqual([
      { name: 'utils', version: '1.0.0', snapshot: 'created' },
      { name: 'badge', version: '1.0.0', snapshot: 'created' },
      { name: 'plain', version: '1.0.0', snapshot: 'created' },
    ]);
    expect(result.files).toContain('r/badge@1.0.0.json');

    const badge = await readJson('dist/r/badge.json');
    expect(badge['$schema']).toBe('https://ndop.dev/schema/registry-item.json');
    expect(badge['files']).toEqual([
      expect.objectContaining({ path: 'ui/badge/badge.ts', content: BADGE }),
    ]);
    expect(await readJson('dist/r/badge@1.0.0.json')).toEqual(badge);
    expect(await readJson('snapshots/badge@1.0.0.json')).toEqual(badge);

    const index = await readJson('dist/r/index.json');
    expect(JSON.stringify(index)).not.toContain('"content"');
    expect(index['items']).toHaveLength(3);
  });

  it("serves the registry's LICENSE.txt next to its items", async () => {
    await fixture({ 'LICENSE.txt': 'MIT License\n' });
    const result = await build();
    expect(result.files).toContain('r/LICENSE.txt');
    expect(await readFile(join(root, 'dist/r/LICENSE.txt'), 'utf-8')).toBe(
      'MIT License\n',
    );
  });

  it('writes no license when the registry has none', async () => {
    await fixture({});
    const result = await build();
    expect(result.files).not.toContain('r/LICENSE.txt');
  });

  it('reports unchanged snapshots on the next build', async () => {
    await fixture({});
    await build();
    const result = await build({ frozenSnapshots: true });
    expect(result.ok).toBe(true);
    expect(result.items.map((item) => item.snapshot)).toEqual([
      'unchanged',
      'unchanged',
      'unchanged',
    ]);
  });

  it('fails when an item changes without a version bump, writing nothing', async () => {
    await fixture({});
    await build();
    await rm(join(root, 'dist'), { recursive: true });
    await writeFile(join(root, 'lib/utils.ts'), `${UTILS}\n// changed\n`);

    const result = await build();
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({
        item: 'utils',
        message: expect.stringContaining('Bump the version'),
      }),
    ]);
    await expect(readFile(join(root, 'dist/r/index.json'))).rejects.toThrow();
  });

  it('keeps older snapshots in the output after a version bump', async () => {
    await fixture({});
    await build();
    const bumped = items();
    (bumped[0] as { version: string }).version = '1.1.0';
    await fixture({ 'lib/utils.ts': `${UTILS}// changed\n` }, bumped);

    const result = await build();
    expect(result.ok).toBe(true);
    expect(result.files).toEqual(
      expect.arrayContaining(['r/utils@1.0.0.json', 'r/utils@1.1.0.json']),
    );
  });

  it("writes each item's changelog, newest version first", async () => {
    await fixture({});
    await build();
    const bumped = items();
    (bumped[1] as { version: string }).version = '1.1.0';
    (bumped[1] as { dependencies: string[] }).dependencies = ['clsx@^2.1.0'];
    await fixture(
      {
        'ui/badge/badge.ts': BADGE.replace("'rounded'", "'rounded-full'"),
        'changelog/badge.md':
          '# Badge\n\n## 1.1.0\n\nRounder.\n\n## 1.0.0\n\nFirst release.\n',
      },
      bumped,
    );

    const result = await build();
    expect(result.issues).toEqual([]);
    expect(result.files).toEqual(
      expect.arrayContaining([
        'r/changelog/badge.json',
        'r/changelog/utils.json',
        'r/changelog/plain.json',
      ]),
    );
    const none = { added: [], changed: [], removed: [] };
    expect(await readJson('dist/r/changelog/badge.json')).toEqual({
      $schema: 'https://ndop.dev/schema/changelog.json',
      name: 'badge',
      versions: [
        {
          version: '1.1.0',
          notes: 'Rounder.\n',
          changes: {
            files: { ...none, changed: ['{ui}/badge/badge.ts'] },
            migrations: [],
            codemods: [],
            dependencies: { ...none, added: ['clsx@^2.1.0'] },
            registryDependencies: { added: [], removed: [] },
          },
        },
        {
          version: '1.0.0',
          notes: 'First release.\n',
          changes: {
            files: { ...none, added: ['{ui}/badge/badge.ts'] },
            migrations: [],
            codemods: [],
            dependencies: none,
            registryDependencies: { added: ['utils'], removed: [] },
          },
        },
      ],
    });
    expect((await readJson('dist/r/changelog/utils.json'))['versions']).toEqual(
      [expect.objectContaining({ version: '1.0.0', notes: '' })],
    );
  });

  it('requires release notes for every version of a documented item', async () => {
    const bumped = items();
    (bumped[1] as { version: string }).version = '1.1.0';
    await fixture({}, items());
    await build();
    await fixture(
      {
        'ui/badge/badge.ts': `${BADGE}\n`,
        'changelog/badge.md': '## 1.0.0\n\nFirst.\n\n## 2.0.0\n\nLater.\n',
      },
      bumped,
    );
    await rm(join(root, 'changelog/plain.md'));

    const result = await build();
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      {
        item: 'badge',
        file: 'changelog/badge.md',
        message: "There's no version 2.0.0 of badge.",
      },
      {
        item: 'badge',
        file: 'changelog/badge.md',
        message: 'No section for 1.1.0. Add "## 1.1.0" with what changed.',
      },
      {
        item: 'plain',
        file: 'changelog/plain.md',
        message:
          'No changelog. Write one with a "## <version>" section for each version.',
      },
    ]);
  });

  it('fails on a missing snapshot with frozen snapshots', async () => {
    await fixture({});
    const result = await build({ frozenSnapshots: true });
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.message).toContain('No snapshot for this version');
  });

  it('writes nothing in a dry run', async () => {
    await fixture({});
    const result = await build({ dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.files).toContain('r/index.json');
    await expect(readFile(join(root, 'dist/r/index.json'))).rejects.toThrow();
    await expect(
      readFile(join(root, 'snapshots/utils@1.0.0.json')),
    ).rejects.toThrow();
  });

  it('reports schema errors in the manifest', async () => {
    const broken = items();
    delete broken[1]?.['description'];
    await fixture({}, broken);
    const result = await build();
    expect(result.ok).toBe(false);
    expect(result.issues[0]).toEqual(
      expect.objectContaining({ file: 'registry.json' }),
    );
  });

  it('reports missing files and unknown registry dependencies', async () => {
    const broken = items();
    (broken[1] as { registryDependencies: string[] }).registryDependencies = [
      'utils',
      'missing',
    ];
    await fixture({}, broken);
    await rm(join(root, 'lib/utils.ts'));
    const messages = (await build()).issues.map((issue) => issue.message);
    expect(messages).toContain('File not found.');
    expect(messages).toContain(
      'registryDependencies lists "missing", which isn\'t in the manifest.',
    );
  });

  describe('import rules', () => {
    it('rejects packages missing from dependencies', async () => {
      await fixture({
        'ui/badge/badge.ts': `import { of } from 'rxjs';\n${BADGE}`,
      });
      const [issue] = (await build()).issues;
      expect(issue).toEqual({
        item: 'badge',
        file: 'ui/badge/badge.ts',
        message: 'Line 1: "rxjs" needs "rxjs" in the item\'s dependencies.',
      });
    });

    it('accepts declared packages, with ranges and subpaths', async () => {
      const declared = items();
      (declared[1] as { dependencies: string[] }).dependencies = [
        '@scope/pkg@^1.0.0',
      ];
      await fixture(
        {
          'ui/badge/badge.ts': `import { a } from '@scope/pkg/sub';\n${BADGE}`,
        },
        declared,
      );
      expect((await build()).issues).toEqual([]);
    });

    it('rejects @/ imports of items not in registryDependencies', async () => {
      const undeclared = items();
      delete undeclared[1]?.['registryDependencies'];
      await fixture({}, undeclared);
      expect((await build()).issues[0]?.message).toContain(
        'is not a file of this item or of its registryDependencies',
      );
    });

    it('rejects @/ imports of files installed elsewhere', async () => {
      const moved = items();
      moved[0] = {
        ...moved[0],
        files: [
          {
            path: 'lib/utils.ts',
            type: 'registry:lib',
            target: '{lib}/helpers/utils.ts',
          },
        ],
      };
      await fixture({}, moved);
      expect((await build()).issues[0]?.message).toContain(
        "whose target {lib}/helpers/utils.ts isn't {lib}/utils.ts",
      );
    });

    it('rejects relative imports outside the item', async () => {
      await fixture({
        'ui/badge/badge.ts': BADGE.replace('@/lib/utils', '../../lib/utils'),
      });
      expect((await build()).issues[0]?.message).toContain(
        "is not one of this item's files",
      );
    });
  });

  it('checks angular.exports against what the files export', async () => {
    const wrong = items();
    (wrong[1] as { angular: { exports: string[] } }).angular.exports = [
      'Badge',
      'BadgeIcon',
    ];
    await fixture({}, wrong);
    expect((await build()).issues).toEqual([
      {
        item: 'badge',
        message:
          'angular.exports lists "BadgeIcon", which no file of the item exports.',
      },
    ]);
  });

  it('derives a theme from its stylesheet', async () => {
    await fixture({});
    await build();
    const theme = await readJson('dist/r/plain.json');
    expect(theme['cssVars']).toEqual({
      theme: { 'font-sans': "'Geist Variable', sans-serif" },
      light: { background: 'white' },
      dark: { background: 'black' },
    });
    expect(theme['css']).toEqual({
      '@import "@fontsource-variable/geist"': {},
    });
  });

  it('requires theme imports to be dependencies', async () => {
    const undeclared = items();
    delete undeclared[2]?.['dependencies'];
    await fixture({}, undeclared);
    expect((await build()).issues).toEqual([
      {
        item: 'plain',
        file: 'themes/plain/theme.css',
        message:
          'Imports "@fontsource-variable/geist", which isn\'t in the item\'s dependencies.',
      },
    ]);
  });

  describe('metadata', () => {
    const DOCS =
      "A small label.\n\n## Do\n\n- Keep it short.\n\n## Don't\n\n- Use it as a button.\n";

    /**
     * The manifest with `badge` pointing at its metadata.
     *
     * @returns Manifest items.
     */
    function withPointer(): Record<string, unknown>[] {
      const list = items();
      list[1] = { ...list[1], ndop: { metadata: 'metadata/badge.json' } };
      return list;
    }

    it('writes r/metadata/<name>.json for each registry:ui item', async () => {
      await fixture({ 'ui/badge/docs.md': DOCS }, withPointer());
      const result = await build({ metadata: true });
      expect(result.issues).toEqual([]);
      expect(result.files).toContain('r/metadata/badge.json');
      const metadata = await readJson('dist/r/metadata/badge.json');
      expect(metadata).toEqual(
        expect.objectContaining({
          name: 'badge',
          intro: 'A small label.',
          agentNotes: { do: ['Keep it short.'], dont: ['Use it as a button.'] },
        }),
      );
      expect(
        (metadata['parts'] as { name: string }[]).map((part) => part.name),
      ).toEqual(['Badge']);
    });

    it('fails on incomplete docs and a missing pointer', async () => {
      await fixture({ 'ui/badge/docs.md': 'Intro only.\n' });
      const result = await build({ metadata: true });
      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          'docs.md has no "## Do" list.',
          'ndop.metadata must be "metadata/badge.json".',
        ]),
      );
    });
  });

  it('reports type errors from ngc with their file and line', async () => {
    await fixture({
      'lib/utils.ts': `${UTILS}export const n: number = 'x';\n`,
    });
    const result = await build({ compile: true });
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      {
        file: 'lib/utils.ts',
        message: expect.stringMatching(/^Line 5, column 14: TS2322 /),
      },
    ]);
  });
});
