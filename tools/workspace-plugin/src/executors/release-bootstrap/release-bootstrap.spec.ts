import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExecutorContext } from '@nx/devkit';
import {
  canTrust,
  placeholderManifest,
  placeholderReadme,
  publishArgs,
  trustArgs,
} from './placeholders';
import executor from './release-bootstrap';
import { runCaptured, runInherited } from '../../utils/processes';

vi.mock('../../utils/processes', () => ({
  runCaptured: vi.fn(),
  runInherited: vi.fn(),
}));

const CLI = {
  name: '@ndop/cli',
  version: '0.0.1',
  license: 'MIT',
  homepage: 'https://ndop.dev',
  repository: {
    type: 'git',
    url: 'git+https://github.com/ndop-ui/ui.git',
    directory: 'packages/cli',
  },
  bugs: { url: 'https://github.com/ndop-ui/ui/issues' },
  dependencies: { commander: '15.0.0' },
};

describe('release-bootstrap placeholders', () => {
  it("keeps the real package's name, license and repository, and nothing else", () => {
    expect(placeholderManifest(CLI, '0.0.0')).toEqual({
      name: '@ndop/cli',
      version: '0.0.0',
      description: 'Placeholder; the first release is 1.0.0.',
      license: 'MIT',
      homepage: 'https://ndop.dev',
      repository: CLI.repository,
      bugs: CLI.bugs,
    });
    expect(placeholderReadme(CLI)).toBe(
      '# @ndop/cli\n\nPlaceholder; the first release is 1.0.0.\n\nSee https://ndop.dev.\n',
    );
  });

  it('builds the publish and trust commands', () => {
    expect(publishArgs('tmp/a.tgz')).toEqual([
      'publish',
      'tmp/a.tgz',
      '--access',
      'public',
    ]);
    expect(
      trustArgs('@ndop/core', {
        repository: 'ndop-ui/ui',
        workflow: 'release.yml',
        environment: 'npm',
      }),
    ).toEqual([
      'trust',
      'github',
      '@ndop/core',
      '--file',
      'release.yml',
      '--repo',
      'ndop-ui/ui',
      '--env',
      'npm',
      '--allow-publish',
      '--yes',
    ]);
  });
});

describe('canTrust', () => {
  it('accepts npm 11.15.0 and later, whose npm trust takes --allow-publish', () => {
    expect(canTrust('11.15.0\n')).toBe(true);
    expect(canTrust('11.19.1')).toBe(true);
    expect(canTrust('12.2.0')).toBe(true);
    expect(canTrust('11.12.1')).toBe(false);
    expect(canTrust('10.9.2')).toBe(false);
    expect(canTrust('')).toBe(false);
  });
});

describe('release-bootstrap executor', () => {
  let root: string;
  let context: ExecutorContext;

  beforeEach(async () => {
    vi.mocked(runInherited).mockReset();
    vi.mocked(runCaptured).mockReset();
    root = await mkdtemp(join(tmpdir(), 'release-bootstrap-'));
    await mkdir(join(root, '.changeset'));
    await writeFile(
      join(root, '.changeset/config.json'),
      '{ "fixed": [["@ndop/core", "@ndop/cli"]] }',
    );
    await writeFile(join(root, 'LICENSE'), 'MIT License\n');
    for (const [folder, manifest] of [
      ['cli', CLI],
      ['core', { ...CLI, name: '@ndop/core' }],
    ] as const) {
      await mkdir(join(root, 'packages', folder), { recursive: true });
      await writeFile(
        join(root, 'packages', folder, 'package.json'),
        JSON.stringify(manifest),
      );
    }
    // `@ndop/core` is on npm; `@ndop/cli` isn't. `npm pack` names the
    // tarball.
    vi.mocked(runCaptured).mockImplementation(async (_command, args) => {
      if (args[0] === '--version') {
        return { code: 0, stdout: '11.19.1\n', stderr: '' };
      }
      if (args[0] !== 'view') {
        return {
          code: 0,
          stdout: JSON.stringify([{ filename: 'ndop-cli-0.0.0.tgz' }]),
          stderr: '',
        };
      }
      return args[1] === '@ndop/core'
        ? { code: 0, stdout: '"@ndop/core"', stderr: '' }
        : { code: 1, stdout: '{"error":{"code":"E404"}}', stderr: '' };
    });
    context = {
      root,
      cwd: root,
      isVerbose: false,
      projectGraph: { nodes: {}, dependencies: {} },
      projectsConfigurations: { version: 2, projects: {} },
      nxJsonConfiguration: {},
    };
  });

  afterEach(() => rm(root, { recursive: true, force: true }));

  it('packs a placeholder only for packages not on npm, and publishes nothing by default', async () => {
    expect((await executor({}, context)).success).toBe(true);

    const folder = join(root, 'tmp/release-bootstrap/ndop-cli');
    expect(
      JSON.parse(await readFile(join(folder, 'package.json'), 'utf-8')),
    ).toEqual(placeholderManifest(CLI, '0.0.0'));
    expect(await readFile(join(folder, 'LICENSE'), 'utf-8')).toBe(
      'MIT License\n',
    );
    expect(runCaptured).toHaveBeenCalledWith(
      'npm',
      [
        'pack',
        folder,
        '--pack-destination',
        join(root, 'tmp/release-bootstrap'),
        '--json',
      ],
      root,
    );
    expect(
      vi
        .mocked(runCaptured)
        .mock.calls.filter(([, args]) => args[0] === 'pack'),
    ).toHaveLength(1);
    expect(runInherited).not.toHaveBeenCalled();
  });

  it('publishes the packed placeholders, then adds every trusted publisher, when asked', async () => {
    vi.mocked(runInherited).mockResolvedValue(0);

    expect(
      (await executor({ publish: true, trust: true }, context)).success,
    ).toBe(true);

    expect(
      vi.mocked(runInherited).mock.calls.map(([, args]) => args.slice(0, 3)),
    ).toEqual([
      [
        'publish',
        join(root, 'tmp/release-bootstrap/ndop-cli-0.0.0.tgz'),
        '--access',
      ],
      ['trust', 'github', '@ndop/core'],
      ['trust', 'github', '@ndop/cli'],
    ]);
  });

  it('stops before publishing when npm is too old to add trusted publishers', async () => {
    vi.mocked(runCaptured).mockImplementation(async (_command, args) =>
      args[0] === '--version'
        ? { code: 0, stdout: '11.12.1\n', stderr: '' }
        : { code: 1, stdout: '{"error":{"code":"E404"}}', stderr: '' },
    );

    expect(
      (await executor({ publish: true, trust: true }, context)).success,
    ).toBe(false);
    expect(runInherited).not.toHaveBeenCalled();
  });
});
