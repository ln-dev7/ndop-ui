import { caseId } from './scenario';
import {
  PUBLISHED_COMPAT_BASE_URL,
  rebaseCompatItem,
  setupAppConfig,
  setupItemUrls,
  setupStylesheet,
  shadcnAddCommand,
} from './shadcn';

const DOCS = [
  'Ndop setup, once per app (ndop init does this for you):',
  '1. Add a theme and the icons: npx shadcn add https://ndop.dev/r/compat/default.json https://ndop.dev/r/compat/icons.json',
  "2. In src/styles.css, after @import 'tailwindcss';, add @import '@ndop/core/styles.css'; then @import './ndop-theme.css';",
].join('\n');

describe('shadcn case', () => {
  it('has its own name', () => {
    expect(
      caseId({ packageManager: 'npm', angular: '22.2.1', shadcn: true }),
    ).toBe('npm-ng22-shadcn');
  });

  it('runs the pinned shadcn CLI without prompts', () => {
    expect(
      shadcnAddCommand(['http://localhost:1/r/compat/dialog.json']),
    ).toEqual([
      'npx',
      [
        '--yes',
        'shadcn@4.21.4',
        'add',
        'http://localhost:1/r/compat/dialog.json',
        '--yes',
      ],
    ]);
  });

  it('rebases dependencies and the setup note onto the local server', () => {
    const item = JSON.stringify({
      registryDependencies: ['https://ndop.dev/r/compat/utils.json'],
      docs: DOCS,
    });
    const rebased = JSON.parse(
      rebaseCompatItem(
        item,
        PUBLISHED_COMPAT_BASE_URL,
        'http://localhost:9/r/compat/',
      ),
    );
    expect(rebased.registryDependencies).toEqual([
      'http://localhost:9/r/compat/utils.json',
    ]);
    expect(setupItemUrls(rebased.docs)).toEqual([
      'http://localhost:9/r/compat/default.json',
      'http://localhost:9/r/compat/icons.json',
    ]);
  });

  it('refuses a setup note without the add step', () => {
    expect(() => setupItemUrls('Nothing to do.')).toThrow(/npx shadcn add/);
  });

  it('imports the styles and theme right after Tailwind', () => {
    expect(setupStylesheet('@import "tailwindcss";\n\nbody {}\n')).toBe(
      "@import \"tailwindcss\";\n@import '@ndop/core/styles.css';\n@import './ndop-theme.css';\n\nbody {}\n",
    );
    expect(setupStylesheet("@import 'tailwindcss';")).toBe(
      "@import 'tailwindcss';\n@import '@ndop/core/styles.css';\n@import './ndop-theme.css';\n",
    );
    expect(() => setupStylesheet('body {}')).toThrow(/Tailwind/);
  });

  it('registers the providers with their imports', () => {
    const config = [
      "import { ApplicationConfig } from '@angular/core';",
      '',
      'export const appConfig: ApplicationConfig = {',
      '  providers: [',
      '    provideRouter(routes)',
      '  ]',
      '};',
    ].join('\n');
    expect(setupAppConfig(config)).toBe(
      [
        "import { provideNdop } from '@ndop/core';",
        "import { provideIcons } from './lib/icons';",
        "import { ApplicationConfig } from '@angular/core';",
        '',
        'export const appConfig: ApplicationConfig = {',
        '  providers: [',
        '    provideNdop(),',
        '    provideIcons(),',
        '    provideRouter(routes)',
        '  ]',
        '};',
      ].join('\n'),
    );
    expect(() => setupAppConfig('export const appConfig = {};')).toThrow(
      /providers/,
    );
  });
});
