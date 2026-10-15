import {
  authoredFiles,
  authoredStylesheets,
  score,
  styleOffenses,
  type ScoreInput,
} from './score';

const passing: ScoreInput = {
  components: ['dialog', 'button'],
  changed: [
    'src/app/settings/settings.ts',
    'src/app/app.routes.ts',
    'src/app/ui/dialog/dialog.ts',
    'package.json',
    'ndop.lock.json',
    'AGENTS.md',
  ],
  ndopFiles: new Set([
    'src/app/ui/dialog/dialog.ts',
    'src/app/ui/button/button.ts',
  ]),
  installed: new Set(['dialog', 'button', 'utils']),
  sources: {
    'src/app/settings/settings.ts':
      "import { Button } from '@/ui/button/button';\nimport { DialogContent } from '../ui/dialog/dialog';",
    'src/app/app.routes.ts': '',
  },
  verify: {
    ok: true,
    steps: [{ name: 'usage', ok: true }],
    problems: [],
    screenshots: [],
  },
};

describe('authoredFiles', () => {
  it("keeps the agent's sources under src/, not ndop's or tests", () => {
    expect(
      authoredFiles(
        [
          'src/app/a.ts',
          'src/app/a.spec.ts',
          'src/app/a.html',
          'src/styles.css',
          'src/app/ui/dialog/dialog.ts',
          'README.md',
        ],
        new Set(['src/app/ui/dialog/dialog.ts']),
      ),
    ).toEqual(['src/app/a.html', 'src/app/a.ts']);
  });
});

describe('score', () => {
  it('passes a verified result that uses its components in scope', () => {
    expect(score(passing)).toEqual({
      passed: true,
      checks: [
        { name: 'verify', ok: true, detail: 'ndop verify passed.' },
        { name: 'components', ok: true, detail: 'Uses dialog, button.' },
        {
          name: 'styles',
          ok: true,
          detail: 'Every color comes from the theme.',
        },
        {
          name: 'scope',
          ok: true,
          detail: 'Only src/ and install files changed.',
        },
      ],
    });
  });

  it('passes a block routed from the app, installed from the registry', () => {
    const result = score({
      ...passing,
      components: ['login-01'],
      installed: new Set(['login-01', 'button', 'utils']),
      sources: {
        'src/app/app.routes.ts':
          "export const routes = [{ path: 'login', loadComponent: () => import('./blocks/login-01/login-01').then((m) => m.Login01Block) }];",
      },
    });
    expect(result.checks[1]).toEqual({
      name: 'components',
      ok: true,
      detail: 'Uses login-01.',
    });
  });

  it('fails verify errors and skipped steps', () => {
    const failed = score({
      ...passing,
      verify: {
        ok: false,
        steps: [{ name: 'render', ok: true, skipped: 'no Chromium' }],
        problems: [
          {
            rule: 'axe/button-name',
            file: 'src/app/a.ts',
            line: 3,
            message: 'x',
            severity: 'error',
          },
        ],
        screenshots: [],
      },
    });
    expect(failed.passed).toBe(false);
    expect(failed.checks[0]?.detail).toBe(
      'ndop verify skipped render (no Chromium).',
    );
  });

  it('fails a hand-written lookalike and an uninstalled component', () => {
    const lookalike = score({
      ...passing,
      installed: new Set(['button']),
      sources: {
        'src/app/a.ts': "import { Button } from '@/ui/button/button';",
      },
    });
    expect(lookalike.checks[1]).toEqual({
      name: 'components',
      ok: false,
      detail: 'Not installed and imported: dialog.',
    });
  });

  it("fails changes outside src/ that installing items doesn't make", () => {
    const outside = score({
      ...passing,
      changed: [...passing.changed, 'angular.json'],
    });
    expect(outside.checks[3]?.detail).toBe(
      'Changed outside src/: angular.json.',
    );
  });

  it('accepts any one of alternative components', () => {
    const result = score({
      ...passing,
      components: ['sidebar|sidebar-01', 'alert-dialog|dialog', 'button'],
      installed: new Set(['sidebar-01', 'dialog', 'button']),
      sources: {
        'src/app/app.ts':
          "import { Sidebar01Block } from './blocks/sidebar-01/sidebar-01';\nimport { Button } from '@/ui/button/button';\nimport { DialogContent } from '@/ui/dialog/dialog';",
      },
    });
    expect(result.checks[1]).toEqual({
      name: 'components',
      ok: true,
      detail: 'Uses sidebar-01, dialog, button.',
    });
    expect(
      score({ ...passing, components: ['sidebar|sidebar-01'] }).checks[1],
    ).toEqual({
      name: 'components',
      ok: false,
      detail: 'Not installed and imported: sidebar or sidebar-01.',
    });
  });

  it('fails colors and CSS variables of its own', () => {
    const result = score({
      ...passing,
      styles: { 'src/app/app.css': '.card { color: #fff; }' },
    });
    expect(result.passed).toBe(false);
    expect(result.checks[2]).toEqual({
      name: 'styles',
      ok: false,
      detail: 'Colors or CSS variables of its own: src/app/app.css (#fff).',
    });
  });

  it('fails when the agent wrote nothing', () => {
    expect(score({ ...passing, sources: {} }).checks[0]?.detail).toBe(
      'The agent wrote no source files under src/.',
    );
  });
});

describe('authoredStylesheets', () => {
  it("keeps the agent's stylesheets under src/, the global one included", () => {
    expect(
      authoredStylesheets(
        [
          'src/styles.css',
          'src/app/app.css',
          'src/app/ui/x/x.css',
          'src/app/app.ts',
          'public/a.css',
        ],
        new Set(['src/app/ui/x/x.css']),
      ),
    ).toEqual(['src/app/app.css', 'src/styles.css']);
  });
});

describe('styleOffenses', () => {
  it('finds color literals and CSS variables in stylesheets', () => {
    expect(
      styleOffenses(
        {},
        {
          'src/app/app.css':
            '/* #fff in a comment */\n#fab, .a:hover { background: rgb(0 0 0 / 50%); border: 1px solid #e2e8f0; }\n:root { --brand: oklch(0.6 0.2 250); }\n.b { color: var(--primary); }',
        },
      ),
    ).toEqual(['src/app/app.css (#e2e8f0, rgb(), oklch(), --brand)']);
  });

  it('finds them in templates and scripts, not in references or ids', () => {
    expect(
      styleOffenses(
        {
          'src/app/a.html':
            '<div class="bg-[#0f172a] text-primary" style="color: #333"></div>\n<button #add (click)="d.open()">Add</button>\n<a href="#bad">Skip</a>\n<p>Order: #1001</p>',
          'src/app/a.ts':
            "const series = { fill: '#22c55e' };\nconst order = { id: '#1234' };\nconst x = 'hsl(10 20% 30%)';\nconst y = `[--gap:4px]`;\n// [style.--size]=\"size\"",
          'src/app/b.ts': "const c = 'var(--chart-1)';",
        },
        {},
      ),
    ).toEqual([
      'src/app/a.html (#0f172a, #333)',
      'src/app/a.ts (#22c55e, hsl(), --gap, --size)',
    ]);
  });
});
