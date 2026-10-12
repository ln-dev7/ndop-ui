import {
  addProviders,
  importSpecifiers,
  providerCalls,
  relativeSpecifier,
  rewriteSpecifiers,
} from './typescript';

describe('addProviders', () => {
  const config = `import { ApplicationConfig } from '@angular/core';
import { provideNdop } from '@ndop/core';

export const appConfig: ApplicationConfig = {
  providers: [provideNdop({ theme: 'dark' })],
};
`;

  it('keeps an existing call and reuses an existing import', () => {
    const edited = addProviders('app.config.ts', config, [
      { name: 'provideNdop', module: '@ndop/core' },
    ]);
    expect(edited).toBe(config);
  });

  it('returns undefined without a providers array literal', () => {
    expect(
      addProviders('app.config.ts', 'export const appConfig = build();\n', [
        { name: 'provideNdop', module: '@ndop/core' },
      ]),
    ).toBeUndefined();
  });
});

describe('rewriteSpecifiers', () => {
  it('rewrites module specifiers only', () => {
    const source = "import { a } from '@/lib/a';\nconst text = '@/lib/a';\n";
    expect(rewriteSpecifiers('x.ts', source, () => './a')).toBe(
      "import { a } from './a';\nconst text = '@/lib/a';\n",
    );
  });
});

describe('relativeSpecifier', () => {
  it('drops the extension and adds ./', () => {
    expect(relativeSpecifier('src/a/b.ts', 'src/a/c.ts')).toBe('./c');
    expect(relativeSpecifier('src/a/b.ts', 'src/lib/index.ts')).toBe('../lib');
  });
});

describe('providerCalls', () => {
  it('lists the functions called in the providers array', () => {
    expect(
      providerCalls(
        'app.config.ts',
        'export const appConfig = { providers: [provideNdop(), routes, provideIcons()] };\n',
      ),
    ).toEqual(['provideNdop', 'provideIcons']);
    expect(
      providerCalls('app.config.ts', 'export const appConfig = build();\n'),
    ).toBeUndefined();
  });
});

describe('importSpecifiers', () => {
  it('lists imports and re-exports, not code in comments', () => {
    const source = `import { a } from '@angular/core';
export { b } from './b';
/** \`import { c } from 'nowhere';\` */
const d = () => import('@angular/cdk/a11y');
`;
    expect(importSpecifiers(source)).toEqual([
      '@angular/core',
      './b',
      '@angular/cdk/a11y',
    ]);
  });
});
