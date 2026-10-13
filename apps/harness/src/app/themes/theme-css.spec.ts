import { COLOR_TOKENS } from '@ndop/schema/theme';
import {
  loadedFontPackages,
  missingFonts,
  parseThemeCss,
  themeSheetCss,
} from './theme-css';
import { THEME_NAMES } from './theme-names';
import { LOADED_FONT_PACKAGES, THEMES, themeProblems } from './themes';

const SOURCE = `
/* A comment { with braces } and --fake: 1; */
@import '@fontsource-variable/inter';
@import "@fontsource-variable/jetbrains-mono";

@theme {
  --font-sans:
    'Inter Variable', -apple-system,
    sans-serif;
  --font-mono: 'JetBrains Mono Variable', monospace;
}

:root {
  --background: oklch(1 0 0);
  --primary: oklch(0.5 0.2 250);
  --radius: 0.5rem;
}

.dark {
  --background: oklch(0.1 0 0);
  --border: oklch(1 0 0 / 10%);
}

@media (prefers-color-scheme: dark) {
  [data-ndop-theme='system'] {
    --background: oklch(0.1 0 0);
  }
}
`;

describe('parseThemeCss', () => {
  it('reads the imports and the @theme, :root and .dark values', () => {
    expect(parseThemeCss(SOURCE)).toEqual({
      imports: [
        '@fontsource-variable/inter',
        '@fontsource-variable/jetbrains-mono',
      ],
      vars: {
        theme: {
          'font-sans': "'Inter Variable', -apple-system, sans-serif",
          'font-mono': "'JetBrains Mono Variable', monospace",
        },
        light: {
          background: 'oklch(1 0 0)',
          primary: 'oklch(0.5 0.2 250)',
          radius: '0.5rem',
        },
        dark: {
          background: 'oklch(0.1 0 0)',
          border: 'oklch(1 0 0 / 10%)',
        },
      },
    });
  });

  it('reads every registry theme in full', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_NAMES]);
    for (const [name, theme] of Object.entries(THEMES)) {
      for (const mode of ['light', 'dark'] as const) {
        expect(
          COLOR_TOKENS.filter((token) => !theme.vars[mode][token]),
          `${name} in ${mode}`,
        ).toEqual([]);
      }
    }
  });
});

describe('THEME_NAMES', () => {
  it("lists every registry.json theme, the visual test's list", () => {
    const [registry] = Object.values(
      import.meta.glob<{ items: { name: string; type: string }[] }>(
        '../../../../../registry/registry.json',
        { import: 'default', eager: true },
      ),
    );
    expect(
      (registry?.items ?? [])
        .filter((item) => item.type === 'registry:theme')
        .map((item) => item.name)
        .sort(),
    ).toEqual([...THEME_NAMES]);
  });
});

describe('themeSheetCss', () => {
  it('scopes light values to the sheet and dark ones to both dark modes', () => {
    const css = themeSheetCss('ocean', parseThemeCss(SOURCE).vars);
    expect(css).toContain(
      "[data-theme-sheet='ocean'] {\n  --font-sans: 'Inter Variable', -apple-system, sans-serif;",
    );
    expect(css).toContain('  --radius: 0.5rem;');
    expect(css).toContain(
      ".dark [data-theme-sheet='ocean'], .dark[data-theme-sheet='ocean'] {\n  --background: oklch(0.1 0 0);\n  --border: oklch(1 0 0 / 10%);\n}",
    );
    expect(css).toContain(
      "@media (prefers-color-scheme: dark) {\n[data-ndop-theme='system'] [data-theme-sheet='ocean'] {\n  --background: oklch(0.1 0 0);",
    );
  });
});

describe('fonts', () => {
  const vars = parseThemeCss(SOURCE).vars;

  it('counts the fonts of the theme a stylesheet imports as loaded', () => {
    expect(
      loadedFontPackages(
        ['tailwindcss', '../../../registry/themes/ocean/theme.css'],
        { ocean: parseThemeCss(SOURCE) },
      ),
    ).toEqual([
      'tailwindcss',
      '@fontsource-variable/inter',
      '@fontsource-variable/jetbrains-mono',
    ]);
  });

  it('says which import loads a missing font', () => {
    expect(missingFonts('ocean', vars, ['@fontsource-variable/inter'])).toEqual(
      [
        "The ocean theme's --font-mono is JetBrains Mono Variable, which the harness doesn't load: add @import '@fontsource-variable/jetbrains-mono'; to apps/harness/src/styles.css.",
      ],
    );
  });

  it('accepts system fonts and rejects fonts no package ships', () => {
    expect(
      missingFonts(
        'plain',
        {
          theme: { 'font-sans': 'system-ui, sans-serif' },
          light: {},
          dark: {},
        },
        [],
      ),
    ).toEqual([]);
    expect(
      missingFonts(
        'odd',
        {
          theme: { 'font-sans': "'Comic Sans MS', cursive" },
          light: {},
          dark: {},
        },
        [],
      ),
    ).toEqual([
      "The odd theme's --font-sans is Comic Sans MS, which isn't a font the harness can load: use one of @ndop/schema's THEME_FONTS.",
    ]);
  });

  it("loads every registry theme's fonts", () => {
    expect(LOADED_FONT_PACKAGES).toContain('@fontsource-variable/geist');
    expect(THEME_NAMES.flatMap((name) => themeProblems(name))).toEqual([]);
  });
});
