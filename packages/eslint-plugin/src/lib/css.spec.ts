import { stylesheetColors, stylesheetImports, themeColors } from './css';

const THEME = `@import 'tailwindcss';
@import './app/app.css';

@theme inline {
  --color-background: var(--background);
  --color-brand: #1e3170;
}

:root {
  --background: oklch(1 0 0);
  --primary: oklch(0.205 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
}

@media (prefers-color-scheme: dark) {
  [data-ndop-theme="system"] {
    --background: oklch(0.145 0 0);
  }
}

body {
  color: #333;
}
`;

describe('stylesheetColors', () => {
  it('flags a palette of custom properties and color literals, in nested blocks', () => {
    const css =
      '@scope (app-root) { :scope{--ink:#18332d; --space: 4px} .x{color:#fff} }';
    expect(stylesheetColors(css)).toEqual([
      { kind: 'palette', text: '--ink', color: '#18332d', offset: 27 },
      { kind: 'literal', text: '#fff', offset: 65 },
    ]);
  });

  it('flags named colors in color properties only', () => {
    expect(
      stylesheetColors(
        '.a { animation: red 1s; border: 1px solid tomato; background: white url(x.png) }',
      ).map((color) => color.text),
    ).toEqual(['tomato', 'white']);
  });

  it('flags raw color utilities in @apply', () => {
    expect(
      stylesheetColors('.a { @apply bg-zinc-900 text-primary text-[#fff]; }'),
    ).toEqual([
      { kind: 'class', text: 'bg-zinc-900', offset: 12 },
      { kind: 'class', text: 'text-[#fff]', offset: 37 },
    ]);
  });

  it('allows tokens, color-mix over tokens and keywords', () => {
    expect(
      stylesheetColors(`
        .a {
          color: var(--muted-foreground);
          background: color-mix(in oklch, var(--primary) 10%, transparent);
          border-color: currentColor;
          outline-color: inherit;
          --sidebar-width: 16rem;
          --accent-soft: color-mix(in oklch, var(--accent) 50%, transparent);
        }
      `),
    ).toEqual([]);
  });

  it('ignores comments, strings and urls', () => {
    expect(
      stylesheetColors(
        "/* color: #fff */ .a { content: '#fff;'; background: url(data:image/svg+xml;utf8,<svg fill='%23fff'/>) }",
      ),
    ).toEqual([]);
  });

  it("allows the theme's own blocks only in stylesheets that hold the theme", () => {
    expect(
      stylesheetColors(THEME, { theme: true }).map((color) => color.text),
    ).toEqual(['#333']);
    expect(stylesheetColors(THEME).map((color) => color.text)).toEqual([
      '--color-brand',
      '--background',
      '--primary',
      '--background',
      '--background',
      '#333',
    ]);
  });

  it("flags custom properties outside the theme's blocks in a theme stylesheet", () => {
    expect(
      stylesheetColors(
        '@scope (app-root) { :scope { --ink: #18332d } } .card { --lime: #d7f36b }',
        { theme: true },
      ).map((color) => color.text),
    ).toEqual(['--ink', '--lime']);
  });

  it('checks a declaration list, as in a style attribute', () => {
    expect(stylesheetColors('color: #fff; width: 2px')).toEqual([
      { kind: 'literal', text: '#fff', offset: 7 },
    ]);
  });

  it('reads Sass line comments when asked', () => {
    expect(
      stylesheetColors('// color: #fff\n.a { color: var(--x) }', {
        lineComments: true,
      }),
    ).toEqual([]);
  });
});

describe('stylesheetImports', () => {
  it('lists imported stylesheets', () => {
    expect(
      stylesheetImports(
        "@import 'tailwindcss';\n@import url(\"./app/app.css\");\n/* @import './x.css'; */\n@use './tokens' as t;",
        true,
      ),
    ).toEqual(['tailwindcss', './app/app.css', './tokens']);
  });
});

describe('themeColors', () => {
  it('lists the color tokens of the top-level :root rule', () => {
    expect(themeColors(THEME)).toEqual(['background', 'primary']);
  });
});
