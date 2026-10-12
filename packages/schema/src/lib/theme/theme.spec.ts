import {
  contrastRatio,
  decodeTheme,
  encodeTheme,
  formatOklch,
  parseColor,
  THEME_FONTS,
  themeContrast,
  themeCss,
  themeItem,
  themeTokens,
  toHex,
  type ThemeVars,
} from '../../theme';
import { validate } from '../validate';

const inter = THEME_FONTS.find((font) => font.id === 'inter');

/** A small theme: two tokens per mode, a font and a radius. */
const THEME: ThemeVars = {
  theme: {
    'font-sans': `'Inter Variable', sans-serif`,
    spacing: '0.25rem',
  },
  light: {
    background: 'oklch(1 0 0)',
    foreground: 'oklch(0.145 0 0)',
    radius: '0.625rem',
  },
  dark: {
    background: 'oklch(0.145 0 0)',
    foreground: 'oklch(0.985 0 0)',
  },
};

describe('colors', () => {
  it('reads oklch, with percentages and alpha, and hex', () => {
    expect(parseColor('oklch(0.205 0 0)')).toEqual({
      l: 0.205,
      c: 0,
      h: 0,
      alpha: 1,
    });
    expect(parseColor('oklch(62% 0.2 -30 / 10%)')).toEqual({
      l: 0.62,
      c: 0.2,
      h: 330,
      alpha: 0.1,
    });
    expect(parseColor('#fff')?.l).toBeCloseTo(1, 5);
    expect(parseColor('red')).toBeUndefined();
    expect(parseColor('oklch(2 0 0)')).toBeUndefined();
  });

  it('round-trips hex through oklch', () => {
    for (const hex of ['#000000', '#ffffff', '#4f46e5', '#e11d48']) {
      expect(toHex(parseColor(hex)!)).toBe(hex);
    }
    expect(formatOklch(parseColor('#ffffff')!)).toBe('oklch(1 0 0)');
  });

  it('measures WCAG contrast, blending translucent colors first', () => {
    expect(contrastRatio(parseColor('#000')!, parseColor('#fff')!)).toBeCloseTo(
      21,
      5,
    );
    expect(contrastRatio(parseColor('#777')!, parseColor('#fff')!)).toBeCloseTo(
      4.48,
      2,
    );
    expect(
      contrastRatio(parseColor('oklch(0 0 0 / 0%)')!, parseColor('#fff')!),
    ).toBeCloseTo(1, 5);
  });
});

describe('themeContrast', () => {
  it('checks each pair in both modes, falling back to light values', () => {
    const results = themeContrast({
      light: {
        foreground: 'oklch(0.145 0 0)',
        background: 'oklch(1 0 0)',
        muted: 'oklch(0.97 0 0)',
        'muted-foreground': 'oklch(0.556 0 0)',
      },
      dark: { background: 'oklch(0.145 0 0)' },
    });
    const pair = (mode: string, foreground: string, background: string) =>
      results.find(
        (result) =>
          result.mode === mode &&
          result.foreground === foreground &&
          result.background === background,
      );
    expect(pair('light', 'foreground', 'background')?.ok).toBe(true);
    expect(pair('light', 'muted-foreground', 'muted')?.ratio).toBeCloseTo(
      4.34,
      2,
    );
    expect(pair('light', 'muted-foreground', 'muted')?.ok).toBe(false);
    // The dark foreground falls back to the light one: dark on dark.
    expect(pair('dark', 'foreground', 'background')?.ok).toBe(false);
    expect(pair('light', 'card-foreground', 'card')?.ratio).toBeUndefined();
  });
});

describe('theme URLs', () => {
  it('round-trips a theme, with its font by id', () => {
    const decoded = decodeTheme(encodeTheme(THEME));
    expect(decoded).toEqual({
      vars: {
        ...THEME,
        theme: {
          'font-sans': expect.stringMatching(/^'Inter Variable', /),
          spacing: '0.25rem',
        },
      },
    });
    expect(encodeTheme(THEME)).toMatch(/^[\w-]+$/);
  });

  it('refuses anything that could reach a stylesheet unchecked', () => {
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    expect(decodeTheme('%%%')).toEqual({
      problem: "The theme parameter isn't encoded JSON.",
    });
    expect(
      decodeTheme(
        encode({ v: 1, l: { background: 'red; } body { x: y' }, d: {} }),
      ),
    ).toEqual({ problem: 'light "background" isn\'t a color.' });
    expect(
      decodeTheme(encode({ v: 1, l: { 'evil-token': 'oklch(1 0 0)' }, d: {} })),
    ).toEqual({ problem: 'light has an unknown token "evil-token".' });
    expect(
      decodeTheme(encode({ v: 1, f: { sans: 'comic-sans' }, l: {}, d: {} })),
    ).toEqual({ problem: 'Unknown sans font "comic-sans".' });
    expect(
      decodeTheme(encode({ v: 1, l: { radius: '1rem;}' }, d: {} })),
    ).toEqual({ problem: 'light "radius" must be a length in rem.' });
  });
});

describe('exports', () => {
  it('makes a valid theme item that installs its font', () => {
    const item = themeItem(THEME, {
      name: 'custom',
      title: 'Custom theme',
      description: 'A theme.',
      version: '1.0.0',
    });
    expect(validate('registry-item', item).valid).toBe(true);
    expect(item.dependencies).toEqual([inter?.package]);
    expect(item.css).toEqual({ '@import "@fontsource-variable/inter"': {} });
  });

  it('writes the stylesheet with the system dark block', () => {
    const css = themeCss(THEME);
    expect(css).toContain(`@import '@fontsource-variable/inter';`);
    expect(css).toContain(':root {\n  --background: oklch(1 0 0);');
    expect(css).toContain(
      "@media (prefers-color-scheme: dark) {\n  [data-ndop-theme='system'] {\n    --background: oklch(0.145 0 0);",
    );
  });

  it('writes Design Tokens with colors in oklch', () => {
    const tokens = themeTokens(THEME) as Record<
      string,
      Record<string, unknown>
    >;
    expect(tokens['light']?.['background']).toEqual({
      $type: 'color',
      $value: { colorSpace: 'oklch', components: [1, 0, 0], alpha: 1 },
    });
    expect(tokens['light']?.['radius']).toEqual({
      $type: 'dimension',
      $value: { value: 0.625, unit: 'rem' },
    });
    expect(tokens['font-sans']).toEqual({
      $type: 'fontFamily',
      $value: ['Inter Variable', 'sans-serif'],
    });
  });
});
