import { buildProblems, harnessSource } from './build';

const LOG = `Application bundle generation failed. [1.3 seconds]

✘ [ERROR] TS2322: Type 'string' is not assignable to type 'number'. [plugin angular-compiler]

    src/app/settings.ts:17:24:
      17 │ export class Settings { count: number = "x"; }
         ╵                         ~~~~~


✘ [ERROR] NG8002: Can't bind to 'open' since it isn't a known property of 'h2'.
1. If 'h2' is an Angular component, then verify that it is included in the '@Component.imports' of this component. [plugin angular-compiler]

    /app/src/app/settings.ts:12:47:
      12 │ <h2 [open]="x">

▲ [WARNING] Unexpected "*" [css-syntax-error]

    src/styles.css:1769:104:
`;

describe('buildProblems', () => {
  it('maps errors to files, and keeps only warnings about checked files', () => {
    expect(buildProblems(LOG, '/app', false, ['src/app/settings.ts'])).toEqual([
      {
        file: 'src/app/settings.ts',
        line: 17,
        column: 25,
        rule: 'build/TS2322',
        severity: 'error',
        message: "Type 'string' is not assignable to type 'number'.",
      },
      {
        file: 'src/app/settings.ts',
        line: 12,
        column: 48,
        rule: 'build/NG8002',
        severity: 'error',
        message:
          "Can't bind to 'open' since it isn't a known property of 'h2'. 1. If 'h2' is an Angular component, then verify that it is included in the '@Component.imports' of this component.",
      },
    ]);
  });

  it('still fails a failed build without a parsable error', () => {
    expect(buildProblems('Something broke', '/app', false, [])).toEqual([
      expect.objectContaining({
        rule: 'build/failed',
        message: 'Something broke',
      }),
    ]);
  });
});

describe('harnessSource', () => {
  it('imports each component and the app config from the harness folder', () => {
    const source = harnessSource(
      { root: '/app', project: 'app', sourceRoot: 'src' },
      [
        {
          name: 'Settings',
          file: 'src/app/settings.ts',
          exported: true,
          requiredInputs: [],
          stylesheets: [],
        },
      ],
      'src/app/app.config.ts',
    );
    expect(source).toContain(
      "import { appConfig } from '../../src/app/app.config';",
    );
    expect(source).toContain(
      "import { Settings as Component0 } from '../../src/app/settings';",
    );
    expect(source).toContain('"Settings": Component0,');
  });
});
