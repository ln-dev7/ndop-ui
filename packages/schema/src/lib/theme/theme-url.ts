import { parseColor } from './color';
import {
  COLOR_TOKENS,
  fontOf,
  fontStack,
  THEME_FONTS,
  type ThemeVars,
} from './tokens';

/** `@theme` tokens a theme URL may set besides fonts. */
const SIZE_TOKENS = ['spacing'] as const;

/** Light and dark tokens a theme URL may set besides colors. */
const MODE_SIZE_TOKENS = ['radius'] as const;

/** A length in `rem`, the only unit sizes take. */
const REM = /^(?:\d+\.?\d*|\.\d+)rem$/;

/**
 * The compact form a theme URL carries: fonts by id, everything else by
 * token.
 */
interface EncodedTheme {
  /** Format version. */
  v: 1;
  /** Font ids by role. */
  f?: { sans?: string; mono?: string };
  /** `@theme` sizes. */
  t?: Record<string, string>;
  /** Light values. */
  l: Record<string, string>;
  /** Dark values. */
  d: Record<string, string>;
}

/**
 * Encodes a theme for the `t` parameter of a theme URL
 * (`/r/themes/custom.json?t=…`, ADR-0023): compact JSON in base64url.
 *
 * @param vars - The theme.
 * @returns The parameter's value.
 */
export function encodeTheme(vars: ThemeVars): string {
  const encoded: EncodedTheme = { v: 1, l: vars.light, d: vars.dark };
  const sans = fontOf(vars.theme['font-sans']);
  const mono = fontOf(vars.theme['font-mono']);
  if (sans || mono) {
    encoded.f = {
      ...(sans ? { sans: sans.id } : {}),
      ...(mono ? { mono: mono.id } : {}),
    };
  }
  const sizes = Object.fromEntries(
    SIZE_TOKENS.flatMap((token) =>
      vars.theme[token] ? [[token, vars.theme[token]]] : [],
    ),
  );
  if (Object.keys(sizes).length) encoded.t = sizes;
  const bytes = new TextEncoder().encode(JSON.stringify(encoded));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes a theme URL's `t` parameter. Anything a theme URL can't hold is
 * refused rather than dropped: unknown tokens, values that aren't colors
 * or `rem` lengths, and fonts outside {@link THEME_FONTS}. What it returns
 * is safe to write into a stylesheet.
 *
 * @param text - The parameter's value.
 * @returns The theme, or the problem.
 */
export function decodeTheme(
  text: string,
): { vars: ThemeVars } | { problem: string } {
  let encoded: EncodedTheme;
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    encoded = JSON.parse(new TextDecoder().decode(bytes)) as EncodedTheme;
  } catch {
    return { problem: "The theme parameter isn't encoded JSON." };
  }
  if (typeof encoded !== 'object' || encoded === null || encoded.v !== 1) {
    return { problem: 'Unknown theme format.' };
  }

  const vars: ThemeVars = { theme: {}, light: {}, dark: {} };
  for (const [role, id] of Object.entries(encoded.f ?? {})) {
    const font = THEME_FONTS.find(
      (entry) => entry.id === id && entry.role === role,
    );
    if (!font) return { problem: `Unknown ${role} font "${String(id)}".` };
    vars.theme[`font-${role}`] = fontStack(font);
  }
  for (const [token, value] of Object.entries(encoded.t ?? {})) {
    if (!(SIZE_TOKENS as readonly string[]).includes(token)) {
      return { problem: `Unknown token "${token}".` };
    }
    if (typeof value !== 'string' || !REM.test(value)) {
      return { problem: `"${token}" must be a length in rem.` };
    }
    vars.theme[token] = value;
  }
  for (const [mode, values] of [
    ['light', encoded.l],
    ['dark', encoded.d],
  ] as const) {
    if (typeof values !== 'object' || values === null) {
      return { problem: `The theme has no ${mode} values.` };
    }
    for (const [token, value] of Object.entries(values)) {
      const problem = checkValue(token, value);
      if (problem) return { problem: `${mode} ${problem}` };
      vars[mode][token] = (value as string).trim();
    }
  }
  return { vars };
}

/**
 * Checks one light or dark value.
 *
 * @param token - Its token.
 * @param value - Its value.
 * @returns What's wrong, or `undefined` when it's fine.
 */
function checkValue(token: string, value: unknown): string | undefined {
  if (typeof value !== 'string') return `"${token}" isn't text.`;
  if ((MODE_SIZE_TOKENS as readonly string[]).includes(token)) {
    return REM.test(value.trim())
      ? undefined
      : `"${token}" must be a length in rem.`;
  }
  if (!(COLOR_TOKENS as readonly string[]).includes(token)) {
    return `has an unknown token "${token}".`;
  }
  return parseColor(value) ? undefined : `"${token}" isn't a color.`;
}
