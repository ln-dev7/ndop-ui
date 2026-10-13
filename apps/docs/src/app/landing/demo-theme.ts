import type { ThemeVars } from '@ndop/schema/theme';

/**
 * A theme's tokens as custom properties for one element, so a theme can
 * restyle part of a page without touching the rest (ADR-0026, "Landing
 * page"). Each value that differs between modes becomes
 * `light-dark(light, dark)`, which follows the element's `color-scheme`:
 * set `color-scheme` from the site's mode on that element and the theme
 * follows light and dark in CSS alone, so the server's render is already
 * right and switching modes needs no script.
 *
 * Dark values a theme leaves out fall back to light ones, as in CSS.
 * Values that are the same in both modes, such as the radius, stay as
 * they are: `light-dark()` only accepts colors.
 *
 * @param vars - The theme's values.
 * @returns Custom properties, by name with `--`, for a `[style]` binding.
 *
 * @example
 * ```ts
 * demoTokens({ theme: {}, light: { primary: 'red' }, dark: { primary: 'pink' } });
 * // { '--primary': 'light-dark(red, pink)' }
 * ```
 */
export function demoTokens(vars: ThemeVars): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [token, light] of Object.entries(vars.light)) {
    const dark = vars.dark[token] ?? light;
    tokens[`--${token}`] =
      dark === light ? light : `light-dark(${light}, ${dark})`;
  }
  const spacing = vars.theme['spacing'];
  if (spacing !== undefined) tokens['--spacing'] = spacing;
  return tokens;
}
