import { contrastRatio, parseColor } from './color';

/**
 * A theme's token values, in a registry item's `cssVars` shape: `theme`
 * holds `@theme` values (fonts, spacing), `light` the `:root` values and
 * `dark` the `.dark` ones (ADR-0006).
 */
export interface ThemeVars {
  /** `@theme` values, by name without `--`. */
  theme: Record<string, string>;
  /** Light mode values, by name without `--`. */
  light: Record<string, string>;
  /** Dark mode values, by name without `--`. */
  dark: Record<string, string>;
}

/** Every color token a theme sets for each mode, in shadcn's order. */
export const COLOR_TOKENS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
] as const;

/** A color token's name. */
export type ColorToken = (typeof COLOR_TOKENS)[number];

/** A pair of tokens whose contrast a theme must keep. */
export interface ContrastPair {
  /** The token drawn on top: text, a border or a ring. */
  foreground: ColorToken;
  /** The token under it. */
  background: ColorToken;
  /** The WCAG 2 ratio it needs: 4.5 for text, 3 for lines and shapes. */
  min: number;
  /** Whether the foreground is text, which `ndop build` enforces. */
  text: boolean;
}

/**
 * The pairs the theme studio checks (ADR-0023). Text pairs need 4.5:1,
 * and `ndop build` fails a theme that misses one; lines, rings and chart
 * colors need 3:1, which the studio only warns about, since shadcn's
 * hairline borders are deliberately faint.
 */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  ...(
    [
      ['foreground', 'background'],
      ['card-foreground', 'card'],
      ['popover-foreground', 'popover'],
      ['primary-foreground', 'primary'],
      ['secondary-foreground', 'secondary'],
      ['muted-foreground', 'muted'],
      ['muted-foreground', 'background'],
      ['accent-foreground', 'accent'],
      ['destructive', 'background'],
      ['sidebar-foreground', 'sidebar'],
      ['sidebar-primary-foreground', 'sidebar-primary'],
      ['sidebar-accent-foreground', 'sidebar-accent'],
    ] as const
  ).map(([foreground, background]) => ({
    foreground,
    background,
    min: 4.5,
    text: true,
  })),
  ...(
    [
      ['border', 'background'],
      ['input', 'background'],
      ['ring', 'background'],
      ['chart-1', 'background'],
      ['chart-2', 'background'],
      ['chart-3', 'background'],
      ['chart-4', 'background'],
      ['chart-5', 'background'],
      ['sidebar-border', 'sidebar'],
      ['sidebar-ring', 'sidebar'],
    ] as const
  ).map(([foreground, background]) => ({
    foreground,
    background,
    min: 3,
    text: false,
  })),
];

/** One checked pair in one mode. */
export interface ContrastResult extends ContrastPair {
  /** Which mode's values were checked. */
  mode: 'light' | 'dark';
  /** The ratio, or `undefined` when a value is missing or unreadable. */
  ratio: number | undefined;
  /** Whether the ratio meets `min`. */
  ok: boolean;
}

/**
 * Checks every {@link CONTRAST_PAIRS} pair in light and dark.
 *
 * @param vars - The theme.
 * @returns One result per pair and mode, light first.
 */
export function themeContrast(
  vars: Pick<ThemeVars, 'light' | 'dark'>,
): ContrastResult[] {
  return (['light', 'dark'] as const).flatMap((mode) =>
    CONTRAST_PAIRS.map((pair) => {
      // Dark values a theme leaves out fall back to light ones in CSS.
      const value = (token: ColorToken) =>
        vars[mode][token] ?? vars.light[token];
      const foreground = parseColor(value(pair.foreground) ?? '');
      const background = parseColor(value(pair.background) ?? '');
      const ratio =
        foreground && background
          ? contrastRatio(foreground, background)
          : undefined;
      return {
        ...pair,
        mode,
        ratio,
        ok: ratio !== undefined && ratio >= pair.min,
      };
    }),
  );
}

/** A font a theme can use, from Fontsource's variable packages. */
export interface ThemeFont {
  /** Stable id, used in theme URLs. */
  id: string;
  /** Display name, which is also its Google Fonts family. */
  name: string;
  /** Which `@theme` token it sets. */
  role: 'sans' | 'mono';
  /** The npm package that ships it. */
  package: string;
  /** The family name the package declares. */
  family: string;
}

/** The fonts the theme studio offers (ADR-0023). */
export const THEME_FONTS: readonly ThemeFont[] = (
  [
    ['geist', 'Geist', 'sans'],
    ['inter', 'Inter', 'sans'],
    ['manrope', 'Manrope', 'sans'],
    ['figtree', 'Figtree', 'sans'],
    ['dm-sans', 'DM Sans', 'sans'],
    ['ibm-plex-sans', 'IBM Plex Sans', 'sans'],
    ['space-grotesk', 'Space Grotesk', 'sans'],
    ['outfit', 'Outfit', 'sans'],
    ['plus-jakarta-sans', 'Plus Jakarta Sans', 'sans'],
    ['geist-mono', 'Geist Mono', 'mono'],
    ['jetbrains-mono', 'JetBrains Mono', 'mono'],
    ['fira-code', 'Fira Code', 'mono'],
  ] as const
).map(([id, name, role]) => ({
  id,
  name,
  role,
  package: `@fontsource-variable/${id}`,
  family: `${name} Variable`,
}));

/** System fonts after a sans theme font, as Ndop's default theme has. */
const SANS_FALLBACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";

/** System fonts after a mono theme font. */
const MONO_FALLBACK =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

/**
 * The `font-sans` or `font-mono` value for a font.
 *
 * @param font - The font.
 * @returns A font stack, the font first.
 */
export function fontStack(font: ThemeFont): string {
  return `'${font.family}', ${font.role === 'sans' ? SANS_FALLBACK : MONO_FALLBACK}`;
}

/**
 * Which of {@link THEME_FONTS} a `font-sans` or `font-mono` value starts
 * with.
 *
 * @param stack - The value.
 * @returns The font, if it's one of them.
 */
export function fontOf(stack: string | undefined): ThemeFont | undefined {
  const first = stack
    ?.split(',')[0]
    ?.trim()
    .replace(/^['"]|['"]$/g, '');
  return THEME_FONTS.find((font) => font.family === first);
}
