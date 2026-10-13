import { fontOf, THEME_FONTS, type ThemeVars } from '@ndop/schema/theme';

/** A theme stylesheet's parts that a theme sheet needs. */
export interface ParsedTheme {
  /** Token values, in a registry item's `cssVars` shape. */
  vars: ThemeVars;
  /** The stylesheet's `@import` specifiers, in source order. */
  imports: string[];
}

/**
 * Font families every browser has, which a theme can name without a
 * package.
 */
const SYSTEM_FAMILIES = new Set([
  '-apple-system',
  'BlinkMacSystemFont',
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'sans-serif',
  'serif',
  'monospace',
]);

/**
 * Reads a theme stylesheet (`registry/themes/<name>/theme.css`) into its
 * token values and imports. `ndop build` reads the same file with PostCSS
 * and rejects anything else in it, so a top-level scan of its blocks is
 * enough here, and keeps PostCSS out of the harness's browser bundle.
 *
 * @param source - Stylesheet text.
 * @returns The `@theme`, `:root` and `.dark` values, and the imports.
 */
export function parseThemeCss(source: string): ParsedTheme {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars: ThemeVars = { theme: {}, light: {}, dark: {} };
  const imports = [...css.matchAll(/@import\s+(['"])([^'"]+)\1/g)].map(
    (match) => match[2] as string,
  );
  for (const { prelude, body } of topLevelBlocks(css)) {
    if (prelude === '@theme') {
      vars.theme = declarations(body);
    } else if (prelude === ':root') {
      vars.light = declarations(body);
    } else if (prelude === '.dark') {
      vars.dark = declarations(body);
    }
  }
  return { vars, imports };
}

/**
 * The top-level `prelude { body }` blocks of a stylesheet, skipping
 * statements such as `@import`.
 *
 * @param css - Stylesheet text without comments.
 * @returns Each block's trimmed prelude and its body.
 */
function topLevelBlocks(css: string): { prelude: string; body: string }[] {
  const blocks: { prelude: string; body: string }[] = [];
  let depth = 0;
  let start = 0;
  let prelude = '';
  for (let index = 0; index < css.length; index++) {
    const char = css[index];
    if (char === ';' && depth === 0) {
      start = index + 1;
    } else if (char === '{') {
      if (depth === 0) {
        prelude = css.slice(start, index).trim();
        start = index + 1;
      }
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        blocks.push({ prelude, body: css.slice(start, index) });
        start = index + 1;
      }
    }
  }
  return blocks;
}

/**
 * A block's custom properties, without the leading `--`, as `cssVars`
 * stores them.
 *
 * @param body - The block's declarations.
 * @returns Property names to values, in source order.
 */
function declarations(body: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const declaration of body.split(';')) {
    const match = /^\s*--([\w-]+)\s*:([\s\S]*)$/.exec(declaration);
    if (match) {
      // Long values wrap across lines in the stylesheet; tokens are one line.
      values[match[1] as string] = (match[2] as string)
        .trim()
        .replace(/\s+/g, ' ');
    }
  }
  return values;
}

/**
 * A theme sheet's stylesheet: the theme's values scoped to the element
 * with `data-theme-sheet="<name>"`, light by default and dark under the
 * same two conditions as `@ndop/core`'s `dark:` variant (a `.dark`
 * ancestor, or system mode under a dark OS preference), so the sheet
 * follows the page's mode as an installed theme would.
 *
 * @param name - The theme's name.
 * @param vars - The theme's values.
 * @returns CSS text.
 */
export function themeSheetCss(name: string, vars: ThemeVars): string {
  const scope = `[data-theme-sheet='${name}']`;
  const block = (selector: string, values: Record<string, string>) =>
    `${selector} {\n${Object.entries(values)
      .map(([token, value]) => `  --${token}: ${value};`)
      .join('\n')}\n}`;
  return [
    block(scope, { ...vars.theme, ...vars.light }),
    block(`.dark ${scope}, .dark${scope}`, vars.dark),
    `@media (prefers-color-scheme: dark) {\n${block(
      `[data-ndop-theme='system'] ${scope}`,
      vars.dark,
    )}\n}`,
  ].join('\n');
}

/**
 * The font packages a stylesheet loads: its own `@import`s, and those of
 * the theme stylesheets it imports.
 *
 * @param imports - The stylesheet's `@import` specifiers.
 * @param themes - Parsed theme stylesheets, by theme name.
 * @returns Package names, such as `@fontsource-variable/geist`.
 */
export function loadedFontPackages(
  imports: readonly string[],
  themes: Readonly<Record<string, ParsedTheme>>,
): string[] {
  return imports.flatMap((specifier) => {
    const theme = /\/themes\/([^/]+)\/theme\.css$/.exec(specifier)?.[1];
    return theme ? (themes[theme]?.imports ?? []) : [specifier];
  });
}

/**
 * What stops a theme sheet from showing the theme's fonts: each `@theme`
 * font whose family the harness doesn't load.
 *
 * @param name - The theme's name, for the messages.
 * @param vars - The theme's values.
 * @param loaded - The font packages the harness loads.
 * @returns One message per missing font, saying how to load it.
 */
export function missingFonts(
  name: string,
  vars: ThemeVars,
  loaded: readonly string[],
): string[] {
  const families = new Set(
    THEME_FONTS.filter((font) => loaded.includes(font.package)).map(
      (font) => font.family,
    ),
  );
  return (['font-sans', 'font-mono'] as const).flatMap((token) => {
    const stack = vars.theme[token];
    const family = stack
      ?.split(',')[0]
      ?.trim()
      .replace(/^['"]|['"]$/g, '');
    if (!family || families.has(family) || SYSTEM_FAMILIES.has(family)) {
      return [];
    }
    const font = fontOf(stack);
    return [
      font
        ? `The ${name} theme's --${token} is ${family}, which the harness doesn't load: add @import '${font.package}'; to apps/harness/src/styles.css.`
        : `The ${name} theme's --${token} is ${family}, which isn't a font the harness can load: use one of @ndop/schema's THEME_FONTS.`,
    ];
  });
}
