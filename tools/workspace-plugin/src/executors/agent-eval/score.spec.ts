import { authoredFiles, score, type ScoreInput } from './score';

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
    expect(outside.checks[2]?.detail).toBe(
      'Changed outside src/: angular.json.',
    );
  });

  it('fails when the agent wrote nothing', () => {
    expect(score({ ...passing, sources: {} }).checks[0]?.detail).toBe(
      'The agent wrote no source files under src/.',
    );
  });
});
