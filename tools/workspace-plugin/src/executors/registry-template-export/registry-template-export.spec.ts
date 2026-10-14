import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { ExecutorContext } from '@nx/devkit';
import executor from './registry-template-export';
import {
  exportRegistryTemplate,
  standaloneManifestProblems,
  templateFiles,
  withMonorepoLinks,
  withoutMaintainerSection,
} from './template-export';

const workspace = join(import.meta.dirname, '../../../../..');

/**
 * Writes files under a folder, creating their folders.
 *
 * @param folder - Absolute folder.
 * @param files - Contents by relative path.
 */
async function writeFiles(
  folder: string,
  files: Record<string, string>,
): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(folder, path)), { recursive: true });
    await writeFile(join(folder, path), content);
  }
}

const README = `# Template

See [the guide](https://ndop.dev/docs) and [the ADR](../../docs/adr/0025.md).

## Make it yours

Edit [the widget](./ui/widget/widget.ts).

## In the Ndop repository

Run \`pnpm nx build registry-template\`.

### Keeping the public repository in sync

Run the export.
`;

describe('withoutMaintainerSection', () => {
  it('drops the maintainer section and its subsections, up to the end', () => {
    expect(withoutMaintainerSection(README)).toBe(
      README.slice(0, README.indexOf('## In the Ndop')).trimEnd() + '\n',
    );
  });

  it('keeps the sections after it', () => {
    expect(
      withoutMaintainerSection(
        '# T\n\n## In the Ndop repository\n\nOurs.\n\n## Install\n\nYours.\n',
      ),
    ).toBe('# T\n\n## Install\n\nYours.\n');
  });

  it('leaves a README without one as it is', () => {
    expect(withoutMaintainerSection('# T\n\nText.\n')).toBe('# T\n\nText.\n');
  });
});

describe('withMonorepoLinks', () => {
  it('points links that leave the template at the Ndop repository', () => {
    expect(
      withMonorepoLinks(
        '[ADR](../../docs/adr/0025.md#sample) and [CLI](../../packages/cli)',
        'README.md',
        'tools/registry-template',
      ),
    ).toBe(
      '[ADR](https://github.com/ndop-ui/ui/blob/master/docs/adr/0025.md#sample) and [CLI](https://github.com/ndop-ui/ui/blob/master/packages/cli)',
    );
  });

  it('resolves links from a nested file', () => {
    expect(
      withMonorepoLinks(
        '[Button](../../../../packages/registry/ui/button/button.ts)',
        'ui/widget/docs.md',
        'tools/registry-template',
        'https://example.com/src/',
      ),
    ).toBe(
      '[Button](https://example.com/src/packages/registry/ui/button/button.ts)',
    );
  });

  it('keeps links inside the template, absolute URLs and anchors', () => {
    const text =
      '[a](./ui/widget/widget.ts) [b](changelog/widget.md) [c](https://ndop.dev) [d](#install) [e](/r/index.json) [f](mailto:a@b.c)';
    expect(
      withMonorepoLinks(text, 'README.md', 'tools/registry-template'),
    ).toBe(text);
  });

  it('refuses links that leave the workspace', () => {
    expect(() =>
      withMonorepoLinks(
        '[x](../../../x.md)',
        'README.md',
        'tools/registry-template',
      ),
    ).toThrow('README.md links outside the workspace: ../../../x.md');
  });
});

describe('standaloneManifestProblems', () => {
  it('accepts versions npm can install', () => {
    expect(
      standaloneManifestProblems(
        '{ "devDependencies": { "@ndop/cli": "1.0.0", "rxjs": "^7.8.2" } }',
      ),
    ).toEqual([]);
  });

  it('names workspace and file links', () => {
    expect(
      standaloneManifestProblems(
        '{ "dependencies": { "a": "file:../a" }, "devDependencies": { "@ndop/cli": "workspace:*" } }',
      ),
    ).toEqual([
      'dependencies.a is "file:../a"',
      'devDependencies.@ndop/cli is "workspace:*"',
    ]);
  });
});

describe('exportRegistryTemplate', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'registry-template-export-'));
    await writeFiles(root, {
      LICENSE: 'MIT License\n',
      'tools/registry-template/README.md': README,
      'tools/registry-template/package.json':
        '{ "devDependencies": { "@ndop/cli": "1.0.0" } }\n',
      'tools/registry-template/project.json': '{}\n',
      'tools/registry-template/package-lock.json': '{}\n',
      'tools/registry-template/.gitignore': 'node_modules\npublic\n',
      'tools/registry-template/.github/workflows/deploy.yml': 'name: Deploy\n',
      'tools/registry-template/registry.json': '{ "items": [] }\n',
      'tools/registry-template/ui/widget/widget.ts': 'export {};\n',
      'tools/registry-template/ui/widget/.DS_Store': '',
      'tools/registry-template/node_modules/x/index.js': '',
      'tools/registry-template/public/r/index.json': '[]\n',
    });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const settings = () => ({
    root,
    source: 'tools/registry-template',
    output: join(root, 'out'),
    license: 'LICENSE',
  });

  it('copies what the public repository needs, and nothing of the monorepo', async () => {
    const written = await exportRegistryTemplate(settings());
    const expected = [
      '.github/workflows/deploy.yml',
      '.gitignore',
      'LICENSE',
      'README.md',
      'package.json',
      'registry.json',
      'ui/widget/widget.ts',
    ];
    expect(written).toEqual(expected);
    expect(await templateFiles(join(root, 'out'))).toEqual(expected);
    expect(await readFile(join(root, 'out/LICENSE'), 'utf-8')).toBe(
      'MIT License\n',
    );
    const readme = await readFile(join(root, 'out/README.md'), 'utf-8');
    expect(readme).not.toContain('In the Ndop repository');
    expect(readme).not.toContain('pnpm nx');
    expect(readme).toContain(
      '(https://github.com/ndop-ui/ui/blob/master/docs/adr/0025.md)',
    );
    expect(readme).toContain('(./ui/widget/widget.ts)');
  });

  it('gives the same files every time, and removes stale ones', async () => {
    await exportRegistryTemplate(settings());
    const first = await readFile(join(root, 'out/README.md'), 'utf-8');
    await writeFile(join(root, 'out/stale.txt'), 'old');
    await exportRegistryTemplate(settings());
    expect(await readFile(join(root, 'out/README.md'), 'utf-8')).toBe(first);
    expect(await templateFiles(join(root, 'out'))).not.toContain('stale.txt');
  });

  it('refuses a package.json that only installs in the workspace', async () => {
    await writeFile(
      join(root, 'tools/registry-template/package.json'),
      '{ "devDependencies": { "@ndop/cli": "workspace:*" } }\n',
    );
    await expect(exportRegistryTemplate(settings())).rejects.toThrow(
      'devDependencies.@ndop/cli is "workspace:*"',
    );
  });
});

describe('registry-template-export executor', () => {
  let output: string;

  const context: ExecutorContext = {
    root: workspace,
    cwd: workspace,
    isVerbose: false,
    projectGraph: { nodes: {}, dependencies: {} },
    projectsConfigurations: { version: 2, projects: {} },
    nxJsonConfiguration: {},
  };

  beforeEach(async () => {
    output = await mkdtemp(join(tmpdir(), 'registry-template-repo-'));
  });

  afterEach(async () => {
    await rm(output, { recursive: true, force: true });
  });

  it('exports tools/registry-template as a repository of its own', async () => {
    expect((await executor({ outputPath: output }, context)).success).toBe(
      true,
    );
    const files = await templateFiles(output);
    for (const file of [
      '.github/workflows/deploy.yml',
      '.gitignore',
      '.nvmrc',
      'LICENSE',
      'README.md',
      'changelog/widget.md',
      'package.json',
      'registry.json',
      'snapshots/widget@0.1.0.json',
      'ui/widget/docs.md',
      'ui/widget/widget.ts',
    ]) {
      expect(files).toContain(file);
    }
    expect(files).not.toContain('project.json');
    const readme = await readFile(join(output, 'README.md'), 'utf-8');
    expect(readme).not.toMatch(/In the Ndop repository|pnpm nx|\]\(\.\.\//);
    expect(readme).toContain('Use this template');
    expect(await readFile(join(output, 'LICENSE'), 'utf-8')).toBe(
      await readFile(join(workspace, 'LICENSE'), 'utf-8'),
    );
  });

  it('fails without a template', async () => {
    expect(
      (await executor({ outputPath: output, source: 'tools/missing' }, context))
        .success,
    ).toBe(false);
  });
});
