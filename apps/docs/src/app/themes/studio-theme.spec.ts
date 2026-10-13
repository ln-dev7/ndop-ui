import {
  decodeTheme,
  encodeTheme,
  THEME_FONTS,
  type ThemeVars,
} from '@ndop/schema/theme';
import {
  applyTheme,
  densityOf,
  fontsUrl,
  initialTheme,
  liveCss,
  normalizeTheme,
  radiusOf,
  removeTheme,
  setColor,
  setDensity,
  setFont,
  setRadius,
  themeUrl,
} from './studio-theme';
import type { ThemeSummary } from './theme-data';

const font = (id: string) => {
  const found = THEME_FONTS.find((entry) => entry.id === id);
  if (!found) throw new Error(id);
  return found;
};

const VARS: ThemeVars = {
  theme: { 'font-sans': `'Geist Variable', sans-serif` },
  light: {
    background: 'oklch(1 0 0)',
    primary: 'oklch(0.205 0 0)',
    radius: '0.625rem',
  },
  dark: { background: 'oklch(0.145 0 0)', border: 'oklch(1 0 0 / 10%)' },
};

const theme = (name: string, vars: ThemeVars): ThemeSummary => ({
  name,
  title: name,
  description: '',
  version: '0.1.0',
  command: `npx @ndop/cli add ${name}`,
  vars,
});

const THEMES = [theme('default', VARS), theme('indigo', VARS)];

describe('initialTheme', () => {
  it('starts from the first gallery theme, or the one `from` names', () => {
    expect(initialTheme({}, THEMES).from).toBe('default');
    expect(initialTheme({ from: 'indigo' }, THEMES).from).toBe('indigo');
    expect(initialTheme({ from: 'nope' }, THEMES).from).toBe('default');
  });

  it('starts from the theme in `t`, and says why it refuses one', () => {
    const vars = setColor(VARS, 'light', 'primary', {
      l: 0.5,
      c: 0.2,
      h: 260,
      alpha: 1,
    });
    const start = initialTheme({ t: encodeTheme(vars) }, THEMES);
    expect(start.from).toBeUndefined();
    expect(start.vars.light['primary']).toBe('oklch(0.5 0.2 260)');

    const refused = initialTheme({ t: 'nope', from: 'indigo' }, THEMES);
    expect(refused.problem).toBeTruthy();
    expect(refused.from).toBe('indigo');
  });
});

describe('editing', () => {
  it('keeps only what a theme URL carries, so every start encodes', () => {
    const normalized = normalizeTheme({
      theme: { ...VARS.theme, 'font-serif': 'Georgia' },
      light: { ...VARS.light, 'destructive-foreground': 'oklch(1 0 0)' },
      dark: VARS.dark,
    });
    expect(normalized.theme['font-serif']).toBeUndefined();
    expect(normalized.light['destructive-foreground']).toBeUndefined();
    expect('vars' in decodeTheme(encodeTheme(normalized))).toBe(true);
  });

  it('sets a color in one mode only', () => {
    const vars = setColor(VARS, 'dark', 'primary', {
      l: 0.9,
      c: 0,
      h: 0,
      alpha: 1,
    });
    expect(vars.dark['primary']).toBe('oklch(0.9 0 0)');
    expect(vars.light['primary']).toBe('oklch(0.205 0 0)');
  });

  it('sets the radius, fonts and density', () => {
    expect(radiusOf(setRadius(VARS, 1))).toBe(1);
    expect(setFont(VARS, font('inter')).theme['font-sans']).toMatch(
      /^'Inter Variable'/,
    );
    const compact = setDensity(VARS, 'compact');
    expect(compact.theme['spacing']).toBe('0.225rem');
    expect(densityOf(compact)).toBe('compact');
    expect(setDensity(compact, 'default').theme['spacing']).toBeUndefined();
  });
});

describe('applying a theme', () => {
  it('loads only fonts the site does not ship, from Google Fonts', () => {
    expect(fontsUrl(VARS)).toBeUndefined();
    const url = fontsUrl(
      setFont(setFont(VARS, font('ibm-plex-sans')), font('jetbrains-mono')),
    );
    expect(url).toBe(
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
    );
  });

  it('writes light, dark and system-dark blocks, Google font names first', () => {
    const css = liveCss(setFont(VARS, font('inter')));
    expect(css).toContain(':root { ');
    expect(css).toContain(`--font-sans: 'Inter', 'Inter Variable'`);
    expect(css).toContain('.dark { --background: oklch(0.145 0 0);');
    expect(css).toContain("[data-ndop-theme='system'] { --background");
  });

  it('adds its stylesheet and fonts to a document and takes them away', () => {
    applyTheme(document, setFont(VARS, font('inter')));
    const style = document.getElementById('ndop-studio-theme');
    expect(style?.textContent).toContain('--primary: oklch(0.205 0 0)');
    expect(document.getElementById('ndop-studio-fonts')).not.toBeNull();
    expect(document.head.lastElementChild).toBe(style);

    applyTheme(document, VARS);
    expect(document.getElementById('ndop-studio-fonts')).toBeNull();
    removeTheme(document);
    expect(document.getElementById('ndop-studio-theme')).toBeNull();
  });

  it('makes a theme URL the function decodes', () => {
    const url = new URL(themeUrl('https://ndop.dev', VARS));
    expect(url.pathname).toBe('/r/themes/custom.json');
    expect('vars' in decodeTheme(url.searchParams.get('t') ?? '')).toBe(true);
  });
});
