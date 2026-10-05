/** A problem with one utility class in a class list. */
export interface ClassProblem {
  /** The class as written, variants included, such as `md:ml-2`. */
  token: string;
  /** Offset of the class in the class list. */
  offset: number;
  /** The logical replacement, when there is one. */
  fix?: string;
}

/** Physical sides and corners, and their logical names. */
const SIDES: Readonly<Record<string, string>> = {
  l: 's',
  r: 'e',
  left: 'start',
  right: 'end',
  tl: 'ss',
  tr: 'se',
  bl: 'es',
  br: 'ee',
};

// Physical utilities and how each becomes its logical equivalent in
// Tailwind v4, which mirrors in right-to-left layouts; every name was
// checked against Tailwind 4.3.3.
const LOGICAL: readonly [RegExp, (...parts: string[]) => string][] = [
  [
    /^(scroll-)?([mp])([lr])(-.+)$/,
    (scroll, box, side, rest) => `${scroll ?? ''}${box}${SIDES[side]}${rest}`,
  ],
  // `left-1/2` and `left-[50%]`, paired with a negative translate, center
  // an element the same way in both directions, so they aren't flagged.
  [
    /^(left|right)(-(?!1\/2$|\[50%\]$).+)$/,
    (side, rest) => `${SIDES[side]}${rest}`,
  ],
  [
    /^(text|float|clear)-(left|right)$/,
    (kind, side) => `${kind}-${SIDES[side]}`,
  ],
  [
    /^border-([lr])(-.+)?$/,
    (side, rest) => `border-${SIDES[side]}${rest ?? ''}`,
  ],
  [
    /^rounded-(l|r|tl|tr|bl|br)(-.+)?$/,
    (corner, rest) => `rounded-${SIDES[corner]}${rest ?? ''}`,
  ],
];

/** Tailwind's palette hues; any of them with a shade is a raw color. */
const HUES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

/** Utilities that take a color. */
const COLOR_UTILITIES =
  'bg|text|border(?:-[xytrblse])?|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow|inset-shadow|inset-ring|drop-shadow|text-shadow';

const PALETTE = new RegExp(
  `^(?:${COLOR_UTILITIES})-(?:${HUES})-\\d{2,3}(?:/.+)?$`,
);
const ARBITRARY_COLOR = new RegExp(
  `^(?:${COLOR_UTILITIES})-\\[(?:#|rgba?\\(|hsla?\\(|oklch\\(|oklab\\(|lab\\(|lch\\(|color\\()`,
);

/**
 * Splits a class list into classes, with their offsets.
 *
 * @param list - A `class` value.
 * @returns Each class and where it starts.
 */
function tokens(list: string): { token: string; offset: number }[] {
  return [...list.matchAll(/\S+/g)].map((match) => ({
    token: match[0],
    offset: match.index,
  }));
}

/**
 * A class's utility, without variants (`md:`, `hover:`), importance (`!`)
 * or a negative sign.
 *
 * @param token - A class.
 * @returns The prefix to keep and the bare utility.
 */
function utilityOf(token: string): { prefix: string; utility: string } {
  const variants = token.slice(0, token.lastIndexOf(':') + 1);
  const rest = token.slice(variants.length);
  const sign = /^!?-?/.exec(rest)?.[0] ?? '';
  return { prefix: variants + sign, utility: rest.slice(sign.length) };
}

/**
 * Physical utilities in a class list, with their logical replacements
 * (`ml-2` → `ms-2`, `text-left` → `text-start`, `rounded-tl-md` →
 * `rounded-ss-md`).
 *
 * @param list - A `class` value.
 * @returns The physical classes.
 */
export function physicalClasses(list: string): ClassProblem[] {
  const problems: ClassProblem[] = [];
  for (const { token, offset } of tokens(list)) {
    const { prefix, utility } = utilityOf(token);
    for (const [pattern, logical] of LOGICAL) {
      const match = pattern.exec(utility);
      if (match) {
        problems.push({
          token,
          offset,
          fix: prefix + logical(...match.slice(1).map((part) => part ?? '')),
        });
        break;
      }
    }
  }
  return problems;
}

/**
 * Palette colors and arbitrary color values in a class list, which bypass
 * the theme's tokens.
 *
 * @param list - A `class` value.
 * @returns The raw color classes.
 */
export function rawColorClasses(list: string): ClassProblem[] {
  return tokens(list)
    .filter(({ token }) => {
      const { utility } = utilityOf(token);
      return PALETTE.test(utility) || ARBITRARY_COLOR.test(utility);
    })
    .map(({ token, offset }) => ({ token, offset }));
}
