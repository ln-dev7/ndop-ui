import type { RegistryItem } from '../registry-item.schema';
import { parseColor } from './color';
import { fontOf, type ThemeVars } from './tokens';

/** What {@link themeItem} names the item. */
export interface ThemeItemOptions {
  /** Item name. */
  name: string;
  /** Display name. */
  title: string;
  /** One sentence. */
  description: string;
  /** Semantic version. */
  version: string;
}

/**
 * The npm packages a theme's fonts come from.
 *
 * @param vars - The theme.
 * @returns Package names, such as `@fontsource-variable/inter`.
 */
export function themePackages(vars: ThemeVars): string[] {
  return [vars.theme['font-sans'], vars.theme['font-mono']]
    .map(fontOf)
    .flatMap((font) => (font ? [font.package] : []));
}

/**
 * A theme as a `registry:theme` item, in the shape `ndop build` emits for a
 * theme stylesheet, so `ndop add`, `ndop init --theme` and the shadcn CLI
 * install it (ADR-0023).
 *
 * @param vars - The theme.
 * @param options - The item's name, title, description and version.
 * @returns The item.
 */
export function themeItem(
  vars: ThemeVars,
  options: ThemeItemOptions,
): RegistryItem {
  const packages = themePackages(vars);
  return {
    $schema: 'https://ndop.dev/schema/registry-item.json',
    name: options.name,
    type: 'registry:theme',
    version: options.version,
    title: options.title,
    description: options.description,
    ...(packages.length
      ? {
          dependencies: packages,
          css: Object.fromEntries(
            packages.map((name) => [`@import "${name}"`, {}]),
          ),
        }
      : {}),
    cssVars: vars,
  };
}

/**
 * A theme as the stylesheet to paste into the Tailwind CSS file: package
 * imports, `@theme`, `:root`, `.dark`, and the dark values again for
 * `data-ndop-theme="system"` under a dark system preference (ADR-0006).
 *
 * @param vars - The theme.
 * @returns The CSS.
 */
export function themeCss(vars: ThemeVars): string {
  const block = (
    selector: string,
    values: Record<string, string>,
    indent = '',
  ) =>
    [
      `${indent}${selector} {`,
      ...Object.entries(values).map(
        ([token, value]) => `${indent}  --${token}: ${value};`,
      ),
      `${indent}}`,
    ].join('\n');
  return (
    [
      themePackages(vars)
        .map((name) => `@import '${name}';`)
        .join('\n'),
      Object.keys(vars.theme).length ? block('@theme', vars.theme) : '',
      block(':root', vars.light),
      block('.dark', vars.dark),
      [
        '@media (prefers-color-scheme: dark) {',
        block("[data-ndop-theme='system']", vars.dark, '  '),
        '}',
      ].join('\n'),
    ]
      .filter(Boolean)
      .join('\n\n') + '\n'
  );
}

/** A W3C Design Tokens token. */
interface DesignToken {
  $type: 'color' | 'dimension' | 'fontFamily';
  $value: unknown;
}

/**
 * A theme in the W3C Design Tokens format (DTCG 2025.10): `light` and
 * `dark` groups of color tokens in OKLCH, the radius and spacing as
 * dimensions, and the fonts as font families, for design tools.
 *
 * @param vars - The theme.
 * @returns The tokens document.
 */
export function themeTokens(vars: ThemeVars): Record<string, unknown> {
  const dimension = (value: string): DesignToken | undefined => {
    const match = /^([\d.]+)(rem|px)$/.exec(value.trim());
    return match
      ? {
          $type: 'dimension',
          $value: { value: Number(match[1]), unit: match[2] },
        }
      : undefined;
  };
  const mode = (values: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(values).flatMap(
        ([token, value]): [string, DesignToken][] => {
          const color = parseColor(value);
          if (color) {
            return [
              [
                token,
                {
                  $type: 'color',
                  $value: {
                    colorSpace: 'oklch',
                    components: [color.l, color.c, color.h],
                    alpha: color.alpha,
                  },
                },
              ],
            ];
          }
          const size = dimension(value);
          return size ? [[token, size]] : [];
        },
      ),
    );
  const fonts = Object.fromEntries(
    (['font-sans', 'font-mono'] as const).flatMap((token) => {
      const stack = vars.theme[token];
      return stack
        ? [
            [
              token,
              {
                $type: 'fontFamily',
                $value: stack
                  .split(',')
                  .map((family) => family.trim().replace(/^['"]|['"]$/g, '')),
              },
            ],
          ]
        : [];
    }),
  );
  const spacing = vars.theme['spacing']
    ? dimension(vars.theme['spacing'])
    : undefined;
  return {
    light: mode(vars.light),
    dark: mode(vars.dark),
    ...fonts,
    ...(spacing ? { spacing } : {}),
  };
}
