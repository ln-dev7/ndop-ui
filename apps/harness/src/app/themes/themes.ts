import {
  loadedFontPackages,
  missingFonts,
  parseThemeCss,
  type ParsedTheme,
} from './theme-css';

// The stylesheets' text, bundled at build time: the registry's sources are
// what the sheets show, so they need no registry build first.
const SOURCES = import.meta.glob<string>(
  '../../../../../registry/themes/*/theme.css',
  { query: '?raw', import: 'default', eager: true },
);
const STYLES = import.meta.glob<string>('../../styles.css', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * Every registry theme's parsed stylesheet, by name, for the theme sheets
 * at `/themes/<name>` (ADR-0023, amendment 1).
 */
export const THEMES: Readonly<Record<string, ParsedTheme>> = Object.fromEntries(
  Object.entries(SOURCES).map(([path, source]) => [
    /\/themes\/([^/]+)\/theme\.css$/.exec(path)?.[1] ?? path,
    parseThemeCss(source),
  ]),
);

/**
 * The font packages the harness's stylesheet loads, directly or through
 * the theme it imports.
 */
export const LOADED_FONT_PACKAGES: readonly string[] = loadedFontPackages(
  parseThemeCss(Object.values(STYLES)[0] ?? '').imports,
  THEMES,
);

/**
 * Why a theme's sheet can't show it as installed: each of its fonts the
 * harness doesn't load.
 *
 * @param name - A theme in {@link THEMES}.
 * @returns One message per missing font; empty when nothing is missing.
 */
export function themeProblems(name: string): string[] {
  const theme = THEMES[name];
  return theme ? missingFonts(name, theme.vars, LOADED_FONT_PACKAGES) : [];
}
