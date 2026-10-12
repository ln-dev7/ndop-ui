import type { ExecutorContext } from '@nx/devkit';
import { buildRegistry, type BuildResult } from '@ndop/cli';
import executor from './registry-build';

vi.mock('@ndop/cli', () => ({
  buildRegistry: vi.fn(),
  formatBuildResult: () => 'report',
}));

const context: ExecutorContext = {
  root: '/workspace',
  cwd: '/workspace',
  isVerbose: false,
  projectName: 'registry',
  projectGraph: { nodes: {}, dependencies: {} },
  projectsConfigurations: {
    version: 2,
    projects: { registry: { root: 'registry' } },
  },
  nxJsonConfiguration: {},
};

/**
 * A build result with the given outcome.
 *
 * @param ok - Whether the build passed.
 * @returns The result.
 */
function result(ok: boolean): BuildResult {
  return { ok, items: [], files: [], issues: [], warnings: [] };
}

describe('registry-build executor', () => {
  beforeEach(() => vi.mocked(buildRegistry).mockReset());

  it('builds the project root into the output path', async () => {
    vi.mocked(buildRegistry).mockResolvedValue(result(true));
    const output = await executor(
      { outputPath: 'dist/registry', tsconfig: 'tsconfig.base.json' },
      context,
    );
    expect(output.success).toBe(true);
    expect(buildRegistry).toHaveBeenCalledWith({
      root: '/workspace/registry',
      output: '/workspace/dist/registry',
      tsconfig: '/workspace/tsconfig.base.json',
    });
  });

  it('passes snapshot, compile, compat and registry options through, and reports failure', async () => {
    vi.mocked(buildRegistry).mockResolvedValue(result(false));
    const output = await executor(
      {
        registryRoot: 'other',
        outputPath: 'out',
        frozenSnapshots: true,
        compile: false,
        compat: 'shadcn',
        compatBaseUrl: 'https://ui.acme.dev/r/compat/',
        registry: 'dist/registry/r/{name}.json',
      },
      context,
    );
    expect(output.success).toBe(false);
    expect(buildRegistry).toHaveBeenCalledWith({
      root: '/workspace/other',
      output: '/workspace/out',
      frozenSnapshots: true,
      compile: false,
      compat: 'shadcn',
      compatBaseUrl: 'https://ui.acme.dev/r/compat/',
      registry: '/workspace/dist/registry/r/{name}.json',
    });
  });
});
