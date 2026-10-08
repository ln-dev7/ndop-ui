import * as angular from '@angular/compiler';
import type { RegistryItem } from '@ndop/schema';
import type { InstallContext } from '../install/project-files';
import {
  codemodsBetween,
  renameExports,
  renameInlineInputs,
  renameInputs,
  type AngularCompiler,
  type Codemod,
} from './codemods';

const compiler = angular as unknown as AngularCompiler;

const context: InstallContext = {
  config: {
    style: 'default',
    tailwind: { css: 'src/styles.css' },
    aliases: { ui: 'src/app/ui', lib: 'src/app/lib', blocks: 'src/app/blocks' },
    importAlias: '@/',
  } as InstallContext['config'],
  aliasBase: 'src/app',
};

const renameSize: Codemod = {
  since: '0.2.0',
  kind: 'rename-input',
  selector: 'button[ndButton], a[ndButton]',
  from: 'size',
  to: 'scale',
};

describe('codemodsBetween', () => {
  it('keeps the codemods an update crosses', () => {
    const item = {
      version: '0.3.0',
      codemods: [
        { ...renameSize, since: '0.1.0' },
        { ...renameSize, since: '0.2.0' },
        { ...renameSize, since: '0.3.0' },
        { ...renameSize, since: '0.4.0' },
      ],
    } as RegistryItem;
    expect(codemodsBetween(item, '0.1.0').map(({ since }) => since)).toEqual([
      '0.2.0',
      '0.3.0',
    ]);
  });
});

describe('renameInputs', () => {
  it('renames the attribute and every binding on matching elements', () => {
    const template = `<button ndButton size="sm" (click)="go()">A</button>
<button ndButton [size]="size" (sizeChange)="size = $event">B</button>
<a ndButton [(size)]="size" bind-size="other">C</a>
<button size="sm">Not Ndop</button>
<button ndButton [attr.size]="x">Attribute binding</button>
@if (show) {
  <div *ngIf="ok"><button ndButton size="lg"></button></div>
}`;
    expect(renameInputs(compiler, template, [renameSize])).toBe(
      `<button ndButton scale="sm" (click)="go()">A</button>
<button ndButton [scale]="size" (scaleChange)="size = $event">B</button>
<a ndButton [(scale)]="size" bind-scale="other">C</a>
<button size="sm">Not Ndop</button>
<button ndButton [attr.size]="x">Attribute binding</button>
@if (show) {
  <div *ngIf="ok"><button ndButton scale="lg"></button></div>
}`,
    );
  });

  it('matches selectors on bound inputs too', () => {
    const codemod = { ...renameSize, selector: '[ndTooltip]' };
    expect(
      renameInputs(compiler, '<span [ndTooltip]="t" size="2"></span>', [
        codemod,
      ]),
    ).toBe('<span [ndTooltip]="t" scale="2"></span>');
  });
});

describe('renameInlineInputs', () => {
  it("edits an inline template inside a component's decorator", () => {
    const text = `import { Component } from '@angular/core';

@Component({
  selector: 'app-page',
  template: \`<button ndButton size="sm">Go</button>\`,
})
export class Page {}
`;
    expect(
      renameInlineInputs(compiler, 'src/app/page.ts', text, [renameSize]),
    ).toBe(text.replace('size="sm"', 'scale="sm"'));
  });
});

describe('renameExports', () => {
  const codemods: Codemod[] = [
    {
      since: '0.2.0',
      kind: 'rename-export',
      from: 'ButtonSize',
      to: 'ButtonScale',
    },
  ];
  const modules = ['src/app/ui/button/button'];

  it("renames imports from the item's files and their uses", () => {
    const text = `import { Button, ButtonSize } from '@/ui/button/button';
import { ButtonSize as Other } from '../other';

export const size: ButtonSize = 'sm';
export const other: Other = 1;
`;
    expect(
      renameExports(context, 'src/app/pages/page.ts', text, modules, codemods),
    ).toBe(`import { Button, ButtonScale } from '@/ui/button/button';
import { ButtonSize as Other } from '../other';

export const size: ButtonScale = 'sm';
export const other: Other = 1;
`);
  });

  it('keeps an alias, and follows relative imports and re-exports', () => {
    const text = `import { ButtonSize as Size } from '../ui/button/button';
export { ButtonSize } from './ui/button/button';
export const size: Size = 'sm';
`;
    expect(
      renameExports(context, 'src/app/pages/page.ts', text, modules, codemods),
    ).toBe(text.replace('ButtonSize as', 'ButtonScale as'));
    expect(
      renameExports(context, 'src/app/index.ts', text, modules, codemods),
    ).toBe(text.replace('export { ButtonSize }', 'export { ButtonScale }'));
  });
});
