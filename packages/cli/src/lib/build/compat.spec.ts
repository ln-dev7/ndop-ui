import { compatImports, normalizeCompatBaseUrl } from './compat';

describe('compatImports', () => {
  it('rewrites @/ imports to relative paths at the default aliases', () => {
    const text = [
      "import { cn } from '@/lib/utils';",
      "import { Button } from '@/ui/button/button';",
      "export * from '@/blocks/login-01/form';",
      "import { Component } from '@angular/core';",
      "/** @example import { Card } from '@/ui/card/card'; */",
      "const lazy = () => import('@/ui/card/card');",
      '',
    ].join('\n');
    expect(compatImports('src/app/blocks/login-01/login-01.ts', text)).toBe(
      [
        "import { cn } from '../../lib/utils';",
        "import { Button } from '../../ui/button/button';",
        "export * from './form';",
        "import { Component } from '@angular/core';",
        "/** @example import { Card } from '@/ui/card/card'; */",
        "const lazy = () => import('../../ui/card/card');",
        '',
      ].join('\n'),
    );
  });
});

describe('normalizeCompatBaseUrl', () => {
  it('adds the trailing slash and refuses relative URLs', () => {
    expect(normalizeCompatBaseUrl('https://ui.acme.dev/r/compat')).toBe(
      'https://ui.acme.dev/r/compat/',
    );
    expect(normalizeCompatBaseUrl('http://localhost:4400/r/compat/')).toBe(
      'http://localhost:4400/r/compat/',
    );
    expect(normalizeCompatBaseUrl('/r/compat/')).toBeUndefined();
    expect(normalizeCompatBaseUrl('file:///r/compat/')).toBeUndefined();
  });
});
