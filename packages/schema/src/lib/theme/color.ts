/**
 * A color in OKLCH: lightness 0–1, chroma 0 and up, hue in degrees, and
 * alpha 0–1.
 */
export interface Oklch {
  /** Perceived lightness, 0 (black) to 1 (white). */
  l: number;
  /** Chroma, 0 for grays; sRGB colors stay under about 0.37. */
  c: number;
  /** Hue angle in degrees, 0–360. */
  h: number;
  /** Opacity, 0–1. */
  alpha: number;
}

/** A color in gamma-encoded sRGB, each channel 0–1. */
type Rgb = [r: number, g: number, b: number];

const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`;
const OKLCH = new RegExp(
  String.raw`^oklch\(\s*(${NUMBER})(%?)\s+(${NUMBER}|none)\s+(${NUMBER}|none)(?:deg)?\s*(?:\/\s*(${NUMBER})(%?)\s*)?\)$`,
  'i',
);

/**
 * Reads a CSS color in the two forms Ndop themes use: `oklch(L C H)`, with
 * an optional `/ alpha`, and hex (`#rgb`, `#rrggbb`, with or without
 * alpha).
 *
 * @param value - The CSS value.
 * @returns The color, or `undefined` for anything else.
 *
 * @example
 * ```ts
 * parseColor('oklch(1 0 0 / 10%)'); // { l: 1, c: 0, h: 0, alpha: 0.1 }
 * ```
 */
export function parseColor(value: string): Oklch | undefined {
  const text = value.trim();
  const match = OKLCH.exec(text);
  if (match) {
    const [, l = '0', lPercent, c = '0', h = '0', alpha, alphaPercent] = match;
    const color: Oklch = {
      l: Number(l) / (lPercent ? 100 : 1),
      c: c === 'none' ? 0 : Number(c),
      h: h === 'none' ? 0 : Number(h),
      alpha: alpha === undefined ? 1 : Number(alpha) / (alphaPercent ? 100 : 1),
    };
    return [color.l, color.c, color.h, color.alpha].every(Number.isFinite) &&
      color.l >= 0 &&
      color.l <= 1 &&
      color.c >= 0 &&
      color.alpha >= 0 &&
      color.alpha <= 1
      ? { ...color, h: ((color.h % 360) + 360) % 360 }
      : undefined;
  }
  return hexToOklch(text);
}

/**
 * Writes a color as `oklch(...)`, rounded as shadcn's themes are.
 *
 * @param color - The color.
 * @returns CSS, such as `oklch(0.205 0 0)` or `oklch(1 0 0 / 10%)`.
 */
export function formatOklch(color: Oklch): string {
  const round = (value: number, digits: number) =>
    Number(value.toFixed(digits));
  const parts = [round(color.l, 3), round(color.c, 3), round(color.h, 3)];
  if (parts[1] === 0) parts[2] = 0;
  const alpha = color.alpha < 1 ? ` / ${round(color.alpha * 100, 1)}%` : '';
  return `oklch(${parts.join(' ')}${alpha})`;
}

/**
 * Converts a color to sRGB, clipping channels outside the gamut.
 *
 * @param color - The color.
 * @returns Gamma-encoded channels, each 0–1.
 */
function toRgb(color: Oklch): Rgb {
  const hue = (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(hue);
  const b = color.c * Math.sin(hue);
  const l = (color.l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (color.l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (color.l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear: Rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return linear.map((channel) => {
    const v = Math.min(1, Math.max(0, channel));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  }) as Rgb;
}

/**
 * Writes a color as `#rrggbb`, ignoring alpha, for a hex field.
 *
 * @param color - The color.
 * @returns The hex code, clipped to sRGB.
 */
export function toHex(color: Oklch): string {
  return `#${toRgb(color)
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/**
 * Reads a hex color into OKLCH.
 *
 * @param text - `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`.
 * @returns The color, or `undefined` when it isn't hex.
 */
function hexToOklch(text: string): Oklch | undefined {
  const match = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(text);
  if (!match?.[1]) return undefined;
  let digits = match[1];
  if (digits.length <= 4) {
    digits = [...digits].map((digit) => digit + digit).join('');
  }
  const channel = (index: number) =>
    parseInt(digits.slice(index * 2, index * 2 + 2), 16) / 255;
  const [r, g, b] = [0, 1, 2]
    .map(channel)
    .map((v) =>
      v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
    ) as Rgb;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lab = {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
  const chroma = Math.hypot(lab.a, lab.b);
  return {
    l: lab.l,
    c: chroma < 1e-4 ? 0 : chroma,
    h:
      chroma < 1e-4
        ? 0
        : ((((Math.atan2(lab.b, lab.a) * 180) / Math.PI) % 360) + 360) % 360,
    alpha: digits.length === 8 ? channel(3) : 1,
  };
}

/**
 * The WCAG 2 contrast ratio of a foreground over a background. A
 * translucent foreground is blended over the background first, as a
 * border or an overlay is seen.
 *
 * @param foreground - Text or line color.
 * @param background - The opaque color under it.
 * @returns The ratio, 1 to 21.
 *
 * @example
 * ```ts
 * contrastRatio(parseColor('#000')!, parseColor('#fff')!); // 21
 * ```
 */
export function contrastRatio(foreground: Oklch, background: Oklch): number {
  const back = toRgb(background);
  const front = toRgb(foreground).map(
    (channel, index) =>
      channel * foreground.alpha + (back[index] ?? 0) * (1 - foreground.alpha),
  ) as Rgb;
  const [lighter, darker] = [luminance(front), luminance(back)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG 2 relative luminance.
 *
 * @param rgb - Gamma-encoded sRGB.
 * @returns Luminance, 0–1.
 */
function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  ) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
