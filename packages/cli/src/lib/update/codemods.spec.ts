import * as angular from '@angular/compiler';
import type { RegistryItem } from '@ndop/schema';
import type { InstallContext } from '../install/project-files';
import {
  codemodsBetween,
  renameExports,
  moveExports,
  nativeDialogs,
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

describe('moveExports', () => {
  const modules = ['src/app/ui/dialog/dialog'];
  const mods: Codemod[] = [
    {
      since: '2.0.0',
      kind: 'move-export',
      from: 'Dialog',
      to: 'NdDialog',
      module: '@ndop/primitives/dialog',
    },
  ];
  const run = (text: string) =>
    moveExports(context, 'src/app/page.ts', text, modules, mods);

  it('preserves local aliases and unrelated imports without renaming uses', () => {
    const result = run(
      `import { Dialog as Modal, DialogContent } from '@/ui/dialog/dialog';\nconst parts = [Modal, DialogContent];`,
    );
    expect(result).toContain('DialogContent');
    expect(result).toContain('NdDialog as Modal');
    expect(result).toContain('@ndop/primitives/dialog');
    expect(result).toContain('const parts = [Modal, DialogContent]');
    expect(run(result)).toBe(result);
  });

  it('preserves type-only imports and public barrel names', () => {
    const result = run(
      `import type { Dialog } from './ui/dialog/dialog';\nexport { Dialog as Modal } from './ui/dialog/dialog';\nexport type { Dialog } from './ui/dialog/dialog';`,
    );
    expect(result).toContain('import type { NdDialog as Dialog }');
    expect(result).toContain('NdDialog as Modal');
    expect(result).toContain('export type { NdDialog as Dialog }');
    expect(run(result)).toBe(result);
  });

  it('keeps styled star exports and explicitly restores moved exports once', () => {
    const result = run(`export * from './ui/dialog/dialog';`);
    expect(result).toContain("export * from './ui/dialog/dialog'");
    expect(result).toContain('NdDialog as Dialog');
    expect(run(result)).toBe(result);
  });

  it('stops unsafe namespace migration before applying changes', () => {
    expect(() => run(`import * as Dialog from './ui/dialog/dialog';`)).toThrow(
      'namespace import',
    );
    expect(() => run(`export * as Dialog from './ui/dialog/dialog';`)).toThrow(
      'namespace re-export',
    );
    expect(run(`import { Dialog } from './unrelated';`)).toBe(
      `import { Dialog } from './unrelated';`,
    );
  });
});

describe('nativeDialogs', () => {
  const mods: Codemod[] = [
    {
      since: '2.0.0',
      kind: 'native-dialog',
      from: 'ndDialogContent',
      to: 'dialog',
      overlay: 'ndDialogOverlay',
    },
  ];
  const run = (text: string) => nativeDialogs(compiler, text, mods);

  it('preserves content customizations, control flow and lazy templates', () => {
    const before = `<ng-template ndDialogPortal>\n  <div ndDialogOverlay class="bg-black/70 dark:bg-black/80"></div>\n  <section ndDialogContent class="p-8" (click)="go()">@if (ok) { <b>Keep</b> }</section>\n</ng-template>`;
    const result = run(before);
    expect(result).toContain('<ng-template ndDialogPortal>');
    expect(result).not.toContain('ndDialogOverlay');
    expect(result).toContain(
      '<dialog ndDialogContent class="p-8 backdrop:bg-black/70 backdrop:dark:bg-black/80" (click)="go()">',
    );
    expect(result).toContain('@if (ok) { <b>Keep</b> }</dialog>');
    expect(run(result)).toBe(result);
  });

  it('migrates multiple and nested dialogs independently', () => {
    const before = `<div ndDialogContent><div ndDialog><i ndDialogOverlay></i><main ndDialogContent>Nested</main></div></div><article ndDialogContent>Other</article>`;
    const result = run(before);
    expect(result.match(/<dialog /g)).toHaveLength(3);
    expect(result.match(/<\/dialog>/g)).toHaveLength(3);
    expect(run(result)).toBe(result);
  });

  it('refuses custom overlay behavior, ambiguous pairing and invalid templates', () => {
    expect(() =>
      run(
        `<i ndDialogOverlay (click)="track()"></i><div ndDialogContent></div>`,
      ),
    ).toThrow('Custom');
    expect(() =>
      run(`<i ndDialogOverlay></i><div><main ndDialogContent></main></div>`),
    ).toThrow('pair');
    expect(() => run(`<div ndDialogContent><span></div>`)).toThrow(
      'parse errors',
    );
    expect(() =>
      run(
        `<i ndDialogOverlay class="bg-red-500"></i><div ndDialogContent [class]="custom"></div>`,
      ),
    ).toThrow('bound');
  });

  it('handles escaped inline strings, aliased decorators and local constants', () => {
    const before = `import { Component as C } from '@angular/core';\nconst HTML = '<div ndDialogContent title="It\\'s yours">Hello</div>';\n@C({ template: HTML }) class Demo {}`;
    const result = renameInlineInputs(
      compiler,
      'src/app/demo.ts',
      before,
      mods,
    );
    expect(result).toContain('<dialog ndDialogContent');
    expect(result).toContain("It\\'s yours");
    expect(renameInlineInputs(compiler, 'src/app/demo.ts', result, mods)).toBe(
      result,
    );
  });
});

describe('native inline template safety', () => {
  const mods: Codemod[] = [
    {
      since: '2.0.0',
      kind: 'native-dialog',
      from: 'ndDialogContent',
      to: 'dialog',
      overlay: 'ndDialogOverlay',
    },
  ];
  it('changes a shared template constant only once', () => {
    const text =
      'const HTML = `<div ndDialogContent></div>`; @Component({ template: HTML }) class A {} @Component({ template: HTML }) class B {}';
    const result = renameInlineInputs(compiler, 'page.ts', text, mods);
    expect(result).toBe(
      text.replace(
        '<div ndDialogContent></div>',
        '<dialog ndDialogContent></dialog>',
      ),
    );
  });
  it('refuses computed templates and custom CSS backdrop classes', () => {
    expect(() =>
      renameInlineInputs(
        compiler,
        'page.ts',
        '@Component({template: getTemplate()}) class A {}',
        mods,
      ),
    ).toThrow('computed or imported');
    expect(() =>
      nativeDialogs(
        compiler,
        '<i ndDialogOverlay class="my-overlay"></i><div ndDialogContent></div>',
        mods,
      ),
    ).toThrow('custom or arbitrary');
  });
});

describe('dynamic primitive migration imports', () => {
  it('requires named imports before changing a module with removed exports', () => {
    const mods: Codemod[] = [
      {
        since: '2.0.0',
        kind: 'move-export',
        from: 'Dialog',
        to: 'NdDialog',
        module: '@ndop/primitives/dialog',
      },
    ];
    expect(() =>
      moveExports(
        context,
        'src/app/page.ts',
        "const module = import('./ui/dialog/dialog');",
        ['src/app/ui/dialog/dialog'],
        mods,
      ),
    ).toThrow('dynamic or require');
  });
});

describe('directive selector migration', () => {
  it('renames exportAs references only when explicitly requested', () => {
    const mod: Codemod = {
      since: '2.0.0',
      kind: 'rename-input',
      selector: '[ndSheet]',
      from: 'ndSheet',
      to: 'ndDialog',
      renameExportAs: true,
    };
    const before =
      '<ng-container ndSheet #panel="ndSheet">{{ panel.open() }}</ng-container>';
    const after =
      '<ng-container ndDialog #panel="ndDialog">{{ panel.open() }}</ng-container>';
    expect(renameInputs(compiler, before, [mod])).toBe(after);
    expect(renameInputs(compiler, after, [mod])).toBe(after);
    expect(
      renameInputs(compiler, before, [{ ...mod, renameExportAs: false }]),
    ).toContain('#panel="ndSheet"');
  });
});
