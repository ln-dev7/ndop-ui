import type { CreateNodesContext } from '@nx/devkit';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { createNodes } from './typecheck';

describe('typecheck plugin', () => {
  let workspaceRoot: string;
  const [, createNodesFunction] = createNodes;

  function addProject(root: string, files: Record<string, string>): void {
    mkdirSync(join(workspaceRoot, root), { recursive: true });
    writeFileSync(join(workspaceRoot, root, 'project.json'), '{}');
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(workspaceRoot, root, name), content);
    }
  }

  async function infer(configFiles: string[]) {
    const context = {
      workspaceRoot,
      nxJsonConfiguration: {},
    } as CreateNodesContext;
    const results = await createNodesFunction(configFiles, {}, context);
    return Object.fromEntries(results.map(([file, result]) => [file, result]));
  }

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'ndop-typecheck-'));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('checks every tsconfig kind with ngc in Angular projects', async () => {
    addProject('packages/core', {
      'tsconfig.json': '{ "angularCompilerOptions": {} }',
      'tsconfig.lib.json': '{}',
      'tsconfig.lib.prod.json': '{}',
      'tsconfig.spec.json': '{}',
    });

    const result = await infer(['packages/core/project.json']);

    expect(
      result['packages/core/project.json']?.projects?.['packages/core']
        ?.targets?.['typecheck']?.command,
    ).toBe(
      'ngc -p packages/core/tsconfig.lib.json --noEmit && ngc -p packages/core/tsconfig.spec.json --noEmit',
    );
  });

  it('uses tsc elsewhere and falls back to tsconfig.json', async () => {
    addProject('apps/docs-e2e', { 'tsconfig.json': '{}' });

    const result = await infer(['apps/docs-e2e/project.json']);

    expect(
      result['apps/docs-e2e/project.json']?.projects?.['apps/docs-e2e']
        ?.targets?.['typecheck']?.command,
    ).toBe('tsc -p apps/docs-e2e/tsconfig.json --noEmit');
  });

  it('skips the workspace root and projects without a tsconfig', async () => {
    writeFileSync(join(workspaceRoot, 'project.json'), '{}');
    addProject('tools/update-fixtures', {});

    const result = await infer([
      'project.json',
      'tools/update-fixtures/project.json',
    ]);

    expect(result['project.json']).toEqual({});
    expect(result['tools/update-fixtures/project.json']).toEqual({});
  });
});
