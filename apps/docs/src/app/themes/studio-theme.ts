import {
  COLOR_TOKENS,
  CUSTOM_THEME_PATH,
  decodeTheme,
  encodeTheme,
  fontOf,
  fontStack,
  formatOklch,
  type Oklch,
  type ThemeFont,
  type ThemeVars,
} from '@ndop/schema/theme';
import type { ThemeSummary } from './theme-data';

/** A theme mode: which of a theme's two sets of colors. */
export type ThemeMode = 'light' | 'dark';

/** The densities the studio offers, as Tailwind's `--spacing` (ADR-0023). */
export const DENSITIES = [
  { id: 'compact', label: 'Compact', spacing: '0.225rem' },
  { id: 'default', label: 'Default', spacing: '0.25rem' },
  { id: 'comfortable', label: 'Comfortable', spacing: '0.275rem' },
] as const;

/** A density's id. */
export type Density = (typeof DENSITIES)[number]['id'];

/** The radius a theme without one gets, Ndop's default theme's. */
export const DEFAULT_RADIUS = 0.625;

/**
 * Fonts the site already ships through Fontsource (the default theme's),
 * so the studio never fetches them from Google Fonts.
 */
const SHIPPED_FONTS = new Set(['geist', 'geist-mono']);

/** The id of the `<style>` the studio adds to a document. */
const STYLE_ID = 'ndop-studio-theme';

/** The id of the Google Fonts `<link>` the studio adds to a document. */
const FONTS_ID = 'ndop-studio-fonts';

/**
 * Keeps only what a theme URL can carry (fonts from `THEME_FONTS`,
 * spacing, radius and the color tokens), so every theme the studio starts
 * from encodes into a URL that decodes again.
 *
 * @param vars - A theme, such as a gallery item's `cssVars`.
 * @returns The same theme, without anything else.
 */
export function normalizeTheme(vars: ThemeVars): ThemeVars {
  const keep = (values: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(values).filter(
        ([token]) =>
          token === 'radius' ||
          (COLOR_TOKENS as readonly string[]).includes(token),
      ),
    );
  const theme: Record<string, string> = {};
  for (const token of ['font-sans', 'font-mono'] as const) {
    const font = fontOf(vars.theme[token]);
    if (font) theme[token] = fontStack(font);
  }
  if (vars.theme['spacing']) theme['spacing'] = vars.theme['spacing'];
  return { theme, light: keep(vars.light), dark: keep(vars.dark) };
}

/** The studio page's query parameters. */
export interface StudioParams {
  /** A theme, as a theme URL's `t`. */
  t?: string | null;
  /** A gallery theme's name. */
  from?: string | null;
}

/**
 * Where the studio starts: the theme a link's `t` holds, or the gallery
 * theme `from` names, or the first gallery theme.
 *
 * @param params - The page's query parameters.
 * @param themes - The gallery's themes.
 * @returns The theme, which gallery theme it is, if any, and why a `t`
 *   was refused.
 */
export function initialTheme(
  params: StudioParams,
  themes: readonly ThemeSummary[],
): { vars: ThemeVars; from?: string; problem?: string } {
  const named = themes.find((theme) => theme.name === params.from);
  const fallback = named ?? themes[0];
  const start = {
    vars: normalizeTheme(fallback?.vars ?? { theme: {}, light: {}, dark: {} }),
    ...(fallback ? { from: fallback.name } : {}),
  };
  if (!params.t) return start;
  const decoded = decodeTheme(params.t);
  return 'problem' in decoded
    ? { ...start, problem: decoded.problem }
    : { vars: decoded.vars };
}

/**
 * Sets one color in one mode.
 *
 * @param vars - The theme.
 * @param mode - Light or dark.
 * @param token - The color token.
 * @param color - The new color.
 * @returns A new theme.
 */
export function setColor(
  vars: ThemeVars,
  mode: ThemeMode,
  token: string,
  color: Oklch,
): ThemeVars {
  return { ...vars, [mode]: { ...vars[mode], [token]: formatOklch(color) } };
}

/**
 * A theme's radius.
 *
 * @param vars - The theme.
 * @returns The radius in rem.
 */
export function radiusOf(vars: ThemeVars): number {
  const value = Number.parseFloat(vars.light['radius'] ?? '');
  return Number.isFinite(value) ? value : DEFAULT_RADIUS;
}

/**
 * Sets the radius. It lives with the light values, as in shadcn's themes,
 * and with the dark ones too when a theme already sets it there.
 *
 * @param vars - The theme.
 * @param rem - The radius in rem.
 * @returns A new theme.
 */
export function setRadius(vars: ThemeVars, rem: number): ThemeVars {
  const value = `${Number(rem.toFixed(3))}rem`;
  return {
    ...vars,
    light: { ...vars.light, radius: value },
    dark: vars.dark['radius'] ? { ...vars.dark, radius: value } : vars.dark,
  };
}

/**
 * Sets the sans or mono font.
 *
 * @param vars - The theme.
 * @param font - One of `THEME_FONTS`.
 * @returns A new theme.
 */
export function setFont(vars: ThemeVars, font: ThemeFont): ThemeVars {
  return {
    ...vars,
    theme: { ...vars.theme, [`font-${font.role}`]: fontStack(font) },
  };
}

/**
 * A theme's density.
 *
 * @param vars - The theme.
 * @returns The density whose spacing it has; default without one.
 */
export function densityOf(vars: ThemeVars): Density {
  return (
    DENSITIES.find((density) => density.spacing === vars.theme['spacing'])
      ?.id ?? 'default'
  );
}

/**
 * Sets the density. The default density leaves `--spacing` out, so the
 * exports only carry it when it changes something.
 *
 * @param vars - The theme.
 * @param density - The density.
 * @returns A new theme.
 */
export function setDensity(vars: ThemeVars, density: Density): ThemeVars {
  const theme = Object.fromEntries(
    Object.entries(vars.theme).filter(([token]) => token !== 'spacing'),
  );
  const spacing = DENSITIES.find((entry) => entry.id === density)?.spacing;
  if (density !== 'default' && spacing) theme['spacing'] = spacing;
  return { ...vars, theme };
}

/**
 * The fonts of a theme that the site doesn't ship.
 *
 * @param vars - The theme.
 * @returns Those fonts.
 */
function fetchedFonts(vars: ThemeVars): ThemeFont[] {
  return [vars.theme['font-sans'], vars.theme['font-mono']]
    .map(fontOf)
    .filter((font): font is ThemeFont => !!font && !SHIPPED_FONTS.has(font.id));
}

/**
 * The Google Fonts stylesheet for the fonts of a theme that the site
 * doesn't ship, which only the studio loads (ADR-0023). Each font is
 * asked for in the four weights the components use, which every font in
 * `THEME_FONTS` has.
 *
 * @param vars - The theme.
 * @returns The stylesheet URL, or `undefined` when nothing needs loading.
 */
export function fontsUrl(vars: ThemeVars): string | undefined {
  const fonts = fetchedFonts(vars);
  if (!fonts.length) return undefined;
  const families = fonts
    .map(
      (font) => `family=${font.name.replace(/ /g, '+')}:wght@400;500;600;700`,
    )
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * The CSS that applies a theme to a page of the site, in both modes, the
 * way a theme's own stylesheet does: `:root` for light, `.dark` for dark,
 * and dark again under `data-ndop-theme="system"` when the system is
 * dark. Added after the site's stylesheet, it wins over the site's own
 * theme at the same specificity. Google Fonts declares a font under its
 * name, not Fontsource's `… Variable`, so that name goes first.
 *
 * @param vars - The theme, with values `decodeTheme` or the studio made.
 * @returns The stylesheet.
 */
export function liveCss(vars: ThemeVars): string {
  const declarations = (values: Record<string, string>) =>
    Object.entries(values)
      .map(([token, value]) => `--${token}: ${value};`)
      .join(' ');
  const theme = { ...vars.theme };
  for (const font of fetchedFonts(vars)) {
    theme[`font-${font.role}`] = `'${font.name}', ${fontStack(font)}`;
  }
  return [
    `:root { ${declarations({ ...theme, ...vars.light })} }`,
    `.dark { ${declarations(vars.dark)} }`,
    `@media (prefers-color-scheme: dark) { [data-ndop-theme='system'] { ${declarations(vars.dark)} } }`,
  ].join('\n');
}

/**
 * Applies a theme to a document, the site's or a preview frame's: its
 * stylesheet, and the Google Fonts it needs.
 *
 * @param doc - The document.
 * @param vars - The theme.
 */
export function applyTheme(doc: Document, vars: ThemeVars): void {
  let style = doc.getElementById(STYLE_ID);
  if (!style) {
    style = doc.createElement('style');
    style.id = STYLE_ID;
    doc.head.append(style);
  }
  style.textContent = liveCss(vars);

  const href = fontsUrl(vars);
  let link = doc.getElementById(FONTS_ID) as HTMLLinkElement | null;
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = doc.createElement('link');
    link.id = FONTS_ID;
    link.rel = 'stylesheet';
    // Before the theme's stylesheet, which has to stay last to win.
    doc.head.insertBefore(link, style);
  }
  if (link.href !== href) link.href = href;
}

/**
 * Removes what {@link applyTheme} added, which restores the site's own
 * theme.
 *
 * @param doc - The document.
 */
export function removeTheme(doc: Document): void {
  doc.getElementById(STYLE_ID)?.remove();
  doc.getElementById(FONTS_ID)?.remove();
}

/**
 * A theme's URL: a `registry:theme` item that `ndop add`,
 * `ndop init --theme` and the shadcn CLI install (ADR-0023).
 *
 * @param origin - The site's origin, such as `https://ndop.dev`.
 * @param vars - The theme.
 * @returns The URL.
 */
export function themeUrl(origin: string, vars: ThemeVars): string {
  return `${origin}${CUSTOM_THEME_PATH}?t=${encodeTheme(vars)}`;
}
