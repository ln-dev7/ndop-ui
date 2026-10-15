/** A color literal found in a CSS value. */
export interface ColorLiteral {
  /** The literal as written, such as `#18332d` or `rgb(0 0 0 / 50%)`. */
  text: string;
  /** Offset of the literal in the value. */
  offset: number;
}

/**
 * CSS named colors (CSS Color 4). `transparent` and `currentColor` aren't
 * here: they carry no color of their own, so they never bypass the theme.
 */
const NAMED_COLORS = new Set(
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'.split(
    ' ',
  ),
);

/**
 * Properties whose values are, or contain, colors, so a bare word in them
 * can be a named color. Elsewhere `red` or `tan` is more likely an
 * identifier, such as an animation name.
 */
const COLOR_PROPERTY =
  /^(?:-webkit-)?(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|border-image(?:-source)?|outline(?:-color)?|fill|stroke|(?:box|text)-shadow|caret-color|accent-color|column-rule(?:-color)?|text-decoration(?:-color)?|text-emphasis(?:-color)?|text-fill-color|text-stroke(?:-color)?|tap-highlight-color|stop-color|flood-color|lighting-color|scrollbar-color|(?:backdrop-)?filter|mask(?:-image)?|list-style(?:-image)?)$/;

/** Color functions; any of them with a literal argument is a raw color. */
const COLOR_FUNCTION =
  /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;

const HEX = /(?<![\w&-])#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{3,4})(?![\w-])/gi;

const WORD = /(?<![\w-])[a-z]+(?![\w(-])/gi;

/**
 * Whether a property takes colors, so named colors in it count. Custom
 * properties do: their value can be anything, colors included.
 *
 * @param property - A CSS property, such as `background-color` or `--ink`.
 * @returns True for color properties.
 */
export function isColorProperty(property: string): boolean {
  const name = property.trim().toLowerCase();
  return name.startsWith('--') || COLOR_PROPERTY.test(name);
}

/**
 * A value with its strings and `url()` contents blanked out, keeping
 * offsets, so nothing quoted or linked is mistaken for a color.
 *
 * @param value - A CSS value.
 * @returns The masked value, the same length.
 */
function masked(value: string): string {
  return value
    .replace(/(["'])(?:\\.|(?!\1)[^\\])*\1/g, (text) => ' '.repeat(text.length))
    .replace(/url\([^)]*\)/gi, (text) => `url(${' '.repeat(text.length - 5)})`);
}

/**
 * Where a parenthesized group that opens at `open` closes.
 *
 * @param value - The text.
 * @param open - Offset of the `(`.
 * @returns Offset just after the matching `)`, or the text's end.
 */
function closing(value: string, open: number): number {
  let depth = 0;
  for (let index = open; index < value.length; index++) {
    if (value[index] === '(') depth++;
    if (value[index] === ')' && --depth === 0) return index + 1;
  }
  return value.length;
}

/**
 * The color literals in a CSS value: hex colors, color functions with
 * literal arguments (`rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`,
 * `oklab()`, `oklch()`, `color()`) and, in color properties, named colors.
 * Theme references stay allowed: `var(--token)`, `color-mix()` over
 * tokens, relative colors built from a `var()`, `transparent`,
 * `currentColor` and the global keywords.
 *
 * @param value - The value, such as `1px solid #e5e5e5`.
 * @param property - The property it's set on, which decides whether bare
 *   words can be named colors.
 * @returns Each literal and its offset in the value.
 */
export function colorLiterals(value: string, property: string): ColorLiteral[] {
  const text = masked(value);
  const found: ColorLiteral[] = [];
  const covered: [number, number][] = [];
  for (const match of text.matchAll(COLOR_FUNCTION)) {
    const end = closing(text, match.index + match[0].length - 1);
    covered.push([match.index, end]);
    if (!/var\(/i.test(text.slice(match.index, end))) {
      found.push({ text: value.slice(match.index, end), offset: match.index });
    }
  }
  const inside = (offset: number) =>
    covered.some(([start, end]) => offset >= start && offset < end);
  for (const match of text.matchAll(HEX)) {
    if (!inside(match.index)) {
      found.push({ text: match[0], offset: match.index });
    }
  }
  if (isColorProperty(property)) {
    for (const match of text.matchAll(WORD)) {
      if (!inside(match.index) && NAMED_COLORS.has(match[0].toLowerCase())) {
        found.push({ text: match[0], offset: match.index });
      }
    }
  }
  return found.sort((a, b) => a.offset - b.offset);
}
