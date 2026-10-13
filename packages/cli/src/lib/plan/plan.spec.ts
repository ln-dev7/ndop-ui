import { memoryFs } from '../project/fs';
import { noFormat } from '../project/format';
import { applyPlan } from './apply';
import { PlanBuilder } from './plan';

describe('PlanBuilder', () => {
  it('plans deletions of files that exist, and applies them', async () => {
    const fs = memoryFs({ 'a.ts': 'a\n', 'b.ts': 'b\n' });
    const builder = new PlanBuilder(fs, noFormat);
    builder.remove('a.ts');
    builder.remove('missing.ts');
    expect(await builder.read('a.ts')).toBeUndefined();

    const plan = await builder.finish();
    expect(plan.files).toEqual([
      { path: 'a.ts', action: 'delete', before: 'a\n', after: '' },
    ]);
    await applyPlan(fs, plan, async () => undefined);
    expect([...fs.files.keys()]).toEqual(['b.ts']);
  });

  it('writes a file staged after its deletion', async () => {
    const builder = new PlanBuilder(memoryFs({ 'a.ts': 'a\n' }), noFormat);
    builder.remove('a.ts');
    await builder.stage('a.ts', 'new\n');
    expect((await builder.finish()).files).toEqual([
      { path: 'a.ts', action: 'update', before: 'a\n', after: 'new\n' },
    ]);
  });

  it('knows the packages the project depends on once the plan is applied', async () => {
    const builder = new PlanBuilder(
      memoryFs({
        'package.json': JSON.stringify({ devDependencies: { tslib: '^2' } }),
      }),
      noFormat,
    );
    builder.depend(['@ndop/cli@^1.0.0'], true);
    expect(await builder.dependsOn('tslib')).toBe(true);
    expect(await builder.dependsOn('@ndop/cli')).toBe(true);
    expect(await builder.dependsOn('@ndop/core')).toBe(false);
  });
});

describe('memoryFs.list', () => {
  it('lists files under a folder, skipping node_modules and dot-folders', async () => {
    const fs = memoryFs({
      'src/a.ts': '',
      'src/app/b.html': '',
      'src/node_modules/x.ts': '',
      'src/.cache/y.ts': '',
      'other/c.ts': '',
    });
    expect(await fs.list('src')).toEqual(['src/a.ts', 'src/app/b.html']);
  });
});
