import {
  blockKind,
  codeBlocks,
  compilerErrors,
  formatIssues,
  jsonIssues,
  knownDirectives,
  nocheckIssue,
  templateComponent,
  unknownDirectives,
  unknownItems,
} from './guides';

const fence = '```';

describe('codeBlocks', () => {
  it('reads language, title, nocheck and code, with the first code line', () => {
    const [block] = codeBlocks(
      'a/b.md',
      `Intro\n\n${fence}angular-html title="x.html" nocheck="Material's markup"\n<p>Hi</p>\n${fence}\n`,
    );
    expect(block).toEqual({
      guide: 'a/b.md',
      line: 4,
      lang: 'angular-html',
      meta: 'title="x.html" nocheck="Material\'s markup"',
      title: 'x.html',
      nocheck: "Material's markup",
      code: '<p>Hi</p>',
    });
  });

  it('reads blocks indented in a list, and longer fences around shorter ones', () => {
    const blocks = codeBlocks(
      'a.md',
      `- Step\n\n  ${fence}ts\n  const a = 1;\n  ${fence}\n\n${fence}\`md\n${fence}ts\nx\n${fence}\n${fence}\`\n`,
    );
    expect(blocks.map((block) => [block.lang, block.code])).toEqual([
      ['ts', 'const a = 1;'],
      ['md', `${fence}ts\nx\n${fence}`],
    ]);
  });

  it('tells a nocheck without a reason from no nocheck', () => {
    const [bare, none] = codeBlocks(
      'a.md',
      `${fence}ts nocheck\nx\n${fence}\n${fence}ts\ny\n${fence}\n`,
    );
    expect(bare?.nocheck).toBe('');
    expect(none?.nocheck).toBeUndefined();
  });
});

describe('blockKind', () => {
  const kind = (markdown: string) => {
    const [block] = codeBlocks('a.md', markdown);
    return block && blockKind(block);
  };

  it('compiles TypeScript and Angular templates, and validates Ndop JSON files', () => {
    expect(kind(`${fence}ts\n${fence}`)).toBe('typescript');
    expect(kind(`${fence}angular-ts\n${fence}`)).toBe('typescript');
    expect(kind(`${fence}angular-html\n${fence}`)).toBe('template');
    expect(kind(`${fence}json title="ndop.json"\n${fence}`)).toBe('json');
    expect(kind(`${fence}json title="public/registry.json"\n${fence}`)).toBe(
      'json',
    );
  });

  it('leaves shell, CSS, plain HTML and other JSON alone', () => {
    expect(kind(`${fence}bash pm\n${fence}`)).toBe('none');
    expect(kind(`${fence}css title="src/styles.css"\n${fence}`)).toBe('none');
    expect(kind(`${fence}html\n${fence}`)).toBe('none');
    expect(kind(`${fence}json title=".mcp.json"\n${fence}`)).toBe('none');
  });
});

describe('nocheckIssue', () => {
  const issue = (markdown: string) => {
    const [block] = codeBlocks('a.md', markdown);
    return block && nocheckIssue(block);
  };

  it('needs a reason', () => {
    expect(issue(`${fence}ts nocheck\n${fence}`)).toEqual({
      guide: 'a.md',
      line: 1,
      message: expect.stringContaining('nocheck needs a reason'),
    });
    expect(issue(`${fence}ts nocheck=""\n${fence}`)?.message).toContain(
      'needs a reason',
    );
    expect(issue(`${fence}ts nocheck="excerpt"\n${fence}`)).toBeUndefined();
  });

  it("is refused on a block that isn't checked", () => {
    expect(issue(`${fence}bash nocheck="shell"\n${fence}`)?.message).toContain(
      "isn't checked anyway",
    );
  });
});

describe('jsonIssues', () => {
  const issues = (title: string, json: string) => {
    const [block] = codeBlocks(
      'a.md',
      `${fence}json title="${title}"\n${json}\n${fence}`,
    );
    return block ? jsonIssues(block) : [];
  };

  it('accepts a whole file and a part of one', () => {
    expect(
      issues(
        'ndop.json',
        '{"style":"default","tailwind":{"css":"src/styles.css"},"aliases":{"ui":"a","lib":"b","blocks":"c"}}',
      ),
    ).toEqual([]);
    expect(
      issues(
        'ndop.json',
        '{"registries":{"@acme":"https://a.dev/{name}.json"}}',
      ),
    ).toEqual([]);
  });

  it('reports unknown and invalid properties, and bad JSON', () => {
    expect(issues('ndop.json', '{"iconLib":"lucide"}')).toEqual([
      {
        guide: 'a.md',
        line: 2,
        message:
          "ndop.json doesn't match the config schema: / must NOT have additional properties",
      },
    ]);
    expect(
      issues('ndop.json', '{"registries":{"@acme":"https://a.dev/r.json"}}'),
    ).not.toEqual([]);
    expect(issues('registry.json', '{"name": }')[0]?.message).toContain(
      'Invalid JSON',
    );
  });
});

describe('directives', () => {
  const directives = knownDirectives(
    new Map([
      [
        'alert-dialog',
        {
          parts: [
            { name: 'AlertDialog', selector: '[ndAlertDialog]' },
            {
              name: 'AlertDialogAction',
              selector: 'button[ndAlertDialogAction]',
            },
          ],
        },
      ],
      [
        'button',
        {
          parts: [
            { name: 'Button', selector: 'button[ndButton], a[ndButton]' },
          ],
        },
      ],
    ]),
    new Map([
      [
        'alert-dialog',
        [
          {
            path: 'ui/alert-dialog/alert-dialog.ts',
            content:
              'export class AlertDialog {}\nexport class AlertDialogAction {}',
          },
        ],
      ],
      [
        'button',
        [{ path: 'ui/button/button.ts', content: 'export class Button {}' }],
      ],
    ]),
  );

  it("maps each part's attributes to its class and file, and ndIcon to @ndop/core", () => {
    expect(directives.get('ndAlertDialogAction')).toEqual({
      className: 'AlertDialogAction',
      module: '@/ui/alert-dialog/alert-dialog',
    });
    expect(directives.get('ndButton')?.module).toBe('@/ui/button/button');
    expect(directives.get('ndIcon')).toEqual({
      className: 'NdIcon',
      module: '@ndop/core',
    });
  });

  it('wraps a template in a component importing the directives it uses', () => {
    expect(
      templateComponent(
        '<ng-container ndAlertDialog><button ndButton ndAlertDialogAction><svg ndIcon="x"></svg></button></ng-container>',
        directives,
        './template.html',
      ),
    ).toBe(
      [
        "import { Component } from '@angular/core';",
        "import { AlertDialog, AlertDialogAction } from '@/ui/alert-dialog/alert-dialog';",
        "import { Button } from '@/ui/button/button';",
        "import { NdIcon } from '@ndop/core';",
        '',
        '@Component({',
        "  selector: 'guide-template',",
        '  imports: [AlertDialog, AlertDialogAction, Button, NdIcon],',
        "  templateUrl: './template.html',",
        '})',
        'export class GuideTemplate {}',
        '',
      ].join('\n'),
    );
  });

  it('reports nd… names no directive answers to, by line', () => {
    expect(
      unknownDirectives('a.md', 'Use `ndButton`.\nNot `ndButon`.', directives),
    ).toEqual([
      {
        guide: 'a.md',
        line: 2,
        message: "ndButon isn't a directive of any Ndop item.",
      },
    ]);
  });
});

describe('unknownItems', () => {
  const items = new Map([
    ['button', 'registry:ui'],
    ['rose', 'registry:theme'],
  ]);

  it('checks added items, themes and component links', () => {
    expect(
      unknownItems(
        'a.md',
        [
          'npx @ndop/cli add button theme:rose @acme/table --yes',
          'npx @ndop/cli add buton theme:button',
          'Once installed, `ndop add crd` works too.',
          '[Button](/docs/components/button), [Card](/docs/components/crd)',
        ].join('\n'),
        items,
      ).map((issue) => `${issue.line}: ${issue.message}`),
    ).toEqual([
      "2: ndop add buton: no such item in Ndop's registry.",
      "2: ndop add theme:button: no such item in Ndop's registry.",
      "3: ndop add crd: no such item in Ndop's registry.",
      "4: /docs/components/crd: no such item in Ndop's registry.",
    ]);
  });
});

describe('compilerErrors', () => {
  it("reads ngc's and TypeScript's error formats", () => {
    expect(
      compilerErrors(
        [
          "a/12/template.html:3:5 - error NG8002: Can't bind to 'x' since it isn't a known property of 'button'.",
          '',
          '3 <button [x]="1"></button>',
          "b/4/block.ts(2,10): error TS2305: Module '\"@ndop/core\"' has no exported member 'Nope'.",
        ].join('\n'),
      ),
    ).toEqual([
      {
        file: 'a/12/template.html',
        line: 3,
        message:
          "NG8002 Can't bind to 'x' since it isn't a known property of 'button'.",
      },
      {
        file: 'b/4/block.ts',
        line: 2,
        message:
          "TS2305 Module '\"@ndop/core\"' has no exported member 'Nope'.",
      },
    ]);
  });
});

describe('formatIssues', () => {
  it('prints issues as path:line, sorted', () => {
    expect(
      formatIssues('apps/docs/src/guides', [
        { guide: 'b.md', line: 1, message: 'Two.' },
        { guide: 'a.md', line: 9, message: 'One.' },
      ]),
    ).toBe(
      'apps/docs/src/guides/a.md:9: One.\napps/docs/src/guides/b.md:1: Two.',
    );
  });
});
