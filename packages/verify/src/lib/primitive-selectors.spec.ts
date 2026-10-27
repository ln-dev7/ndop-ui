import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { primitiveSelectors } from './primitive-selectors';
import { checkUsage } from './usage';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ndop-primitive-selectors-'));
  const packageRoot = join(root, 'node_modules/@ndop/primitives');
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@ndop/primitives',
      exports: { './dialog': './dialog.d.ts' },
    }),
  );
  await writeFile(
    join(packageRoot, 'dialog.d.ts'),
    `
import type * as i0 from '@angular/core';
export { Root as NdDialog } from './root';
export declare class NdDialogTrigger {
  static ɵdir: i0.ɵɵDirectiveDeclaration<NdDialogTrigger, "button[ndDialogTrigger], a[ndDialogTrigger]", never>;
}
export declare class Helper { static ɵdir: Other<Helper, "[ndInvented]">; }
`,
  );
  await writeFile(
    join(packageRoot, 'root.d.ts'),
    `
import type * as i0 from '@angular/core';
export declare class Root {
  static ɵdir: i0.ɵɵDirectiveDeclaration<Root, "[ndDialog]", ["ndDialog"]>;
}
`,
  );
});
afterEach(() => rm(root, { recursive: true, force: true }));

it('resolves installed declaration selectors through aliases and re-exports', async () => {
  const file = join(root, 'page.ts');
  await writeFile(
    file,
    "import { NdDialog as Dialog, NdDialogTrigger } from '@ndop/primitives/dialog';",
  );
  const selectors = primitiveSelectors(ts, [file], root);
  expect(selectors).toEqual([
    '[ndDialog]',
    'button[ndDialogTrigger], a[ndDialogTrigger]',
  ]);
  expect(
    checkUsage(
      [
        {
          file: 'page.html',
          start: { line: 0, column: 0 },
          text: '<div ndDialog><button ndDialogTrigger>Open</button><div ndDailog></div></div>',
        },
      ],
      [],
      [],
      undefined,
      selectors,
    ),
  ).toEqual([
    expect.objectContaining({
      rule: 'usage/unknown-selector',
      message: expect.stringContaining('ndDailog'),
    }),
  ]);
});

it('follows checked local barrels without guessing missing entry points', async () => {
  await writeFile(
    join(root, 'barrel.ts'),
    "export { NdDialog } from '@ndop/primitives/dialog';",
  );
  const file = join(root, 'page.ts');
  await writeFile(
    file,
    "import { NdDialog } from './barrel'; import { Missing } from '@ndop/primitives/missing';",
  );
  expect(primitiveSelectors(ts, [file], root)).toEqual([
    '[ndDialog]',
    'button[ndDialogTrigger], a[ndDialogTrigger]',
  ]);
});

it('does not exempt selectors from arbitrary imports or absent packages', async () => {
  const file = join(root, 'page.ts');
  await writeFile(
    file,
    "import { Something } from 'unrelated'; import { Root } from '@ndop/primitives/missing';",
  );
  expect(primitiveSelectors(ts, [file], root)).toEqual([]);
});

it('honors application path aliases and namespace primitive imports', async () => {
  await writeFile(
    join(root, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { paths: { '@app/*': ['./lib/*'] } } }),
  );
  await mkdir(join(root, 'lib'));
  await writeFile(
    join(root, 'lib/dialog.ts'),
    "import * as Dialog from '@ndop/primitives/dialog'; export { Dialog };",
  );
  const file = join(root, 'page.ts');
  await writeFile(file, "import { Dialog } from '@app/dialog';");
  expect(primitiveSelectors(ts, [file], root)).toEqual([
    '[ndDialog]',
    'button[ndDialogTrigger], a[ndDialogTrigger]',
  ]);
});
