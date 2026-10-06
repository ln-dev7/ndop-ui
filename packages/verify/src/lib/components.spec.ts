import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { findComponents } from './components';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ndop-verify-'));
});
afterEach(() => rm(root, { recursive: true, force: true }));

describe('findComponents', () => {
  it('reads inline and external templates and required inputs', async () => {
    await writeFile(join(root, 'page.html'), '<p>External</p>\n');
    await writeFile(
      join(root, 'page.ts'),
      `import { Component, input, model } from '@angular/core';

@Component({ selector: 'app-a', template: \`<h1>A</h1>\` })
export class A {}

@Component({ selector: 'app-b', templateUrl: './page.html' })
class B {
  readonly user = input.required<string>();
  readonly open = model.required<boolean>();
  readonly size = input(1);
}
`,
    );
    expect(await findComponents(ts, root, join(root, 'page.ts'))).toEqual([
      {
        name: 'A',
        file: 'page.ts',
        exported: true,
        template: {
          text: '<h1>A</h1>',
          file: 'page.ts',
          start: { line: 2, column: 43 },
        },
        requiredInputs: [],
      },
      {
        name: 'B',
        file: 'page.ts',
        exported: false,
        template: {
          text: '<p>External</p>\n',
          file: 'page.html',
          start: { line: 0, column: 0 },
        },
        requiredInputs: ['user', 'open'],
      },
    ]);
  });
});
