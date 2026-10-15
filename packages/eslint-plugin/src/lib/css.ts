import { rawColorClasses } from './classes';
import { colorLiterals } from './colors';

/** A declaration or at-rule statement in a stylesheet. */
type Statement =
  | {
      kind: 'declaration';
      /** The property, such as `color` or `--ink`. */
      property: string;
      /** Offset of the property. */
      propertyStart: number;
      /** The value, as written. */
      value: string;
      /** Offset of the value. */
      valueStart: number;
      /** Preludes of the enclosing blocks, outermost first. */
      parents: string[];
    }
  | {
      kind: 'at-rule';
      /** Name without `@`, such as `import` or `apply`. */
      name: string;
      /** Everything after the name. */
      params: string;
      /** Offset of the params. */
      paramsStart: number;
      /** Preludes of the enclosing blocks, outermost first. */
      parents: string[];
    };

/** A color in a stylesheet that doesn't come from the theme. */
export interface StylesheetColor {
  /**
   * `literal`: a color literal in a declaration. `palette`: a custom
   * property defined with a color, a palette beside the theme's. `class`:
   * a palette or arbitrary color utility in `@apply`.
   */
  kind: 'literal' | 'palette' | 'class';
  /** The color, the custom property's name or the class. */
  text: string;
  /** For `palette`, the color it holds. */
  color?: string;
  /** Offset in the stylesheet. */
  offset: number;
}

/** Options of {@link stylesheetColors}. */
export interface StylesheetColorsOptions {
  /**
   * Whether this stylesheet holds the theme: the project's Tailwind
   * stylesheet, or a stylesheet it imports by relative path. There, custom
   * properties in the top-level `:root` and `.dark` rules, the
   * `[data-ndop-theme='system']` rule under `prefers-color-scheme: dark`,
   * and `@theme` blocks are the theme's own definitions and are allowed.
   */
  theme?: boolean;
  /** Whether `//` starts a comment, as in Sass and Less. */
  lineComments?: boolean;
}

/**
 * A stylesheet with comments blanked out, keeping offsets and line breaks.
 *
 * @param css - The stylesheet.
 * @param lineComments - Whether `//` comments exist.
 * @returns The text, the same length.
 */
function withoutComments(css: string, lineComments: boolean): string {
  const blank = (text: string) => text.replace(/[^\n]/g, ' ');
  let out = '';
  let index = 0;
  while (index < css.length) {
    const char = css[index];
    if (char === '"' || char === "'") {
      let end = index + 1;
      while (end < css.length && css[end] !== char && css[end] !== '\n') {
        end += css[end] === '\\' ? 2 : 1;
      }
      out += css.slice(index, end + 1);
      index = end + 1;
    } else if (css.startsWith('/*', index)) {
      const end = css.indexOf('*/', index + 2);
      const stop = end === -1 ? css.length : end + 2;
      out += blank(css.slice(index, stop));
      index = stop;
    } else if (
      lineComments &&
      css.startsWith('//', index) &&
      css[index - 1] !== ':'
    ) {
      const end = css.indexOf('\n', index);
      const stop = end === -1 ? css.length : end;
      out += blank(css.slice(index, stop));
      index = stop;
    } else {
      out += char;
      index++;
    }
  }
  return out;
}

/**
 * Splits a stylesheet, or an inline `style` value, into declarations and
 * at-rules, with the blocks around each. A small tokenizer rather than a
 * full parser: it reads blocks, statements, strings, parentheses and
 * comments, which is all a color check needs.
 *
 * @param css - The stylesheet or declaration list.
 * @param lineComments - Whether `//` comments exist.
 * @returns The statements, in order.
 */
function statements(css: string, lineComments = false): Statement[] {
  const text = withoutComments(css, lineComments);
  const found: Statement[] = [];
  const parents: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | undefined;

  const statement = (end: number) => {
    const raw = text.slice(start, end);
    const offset = start + (raw.length - raw.trimStart().length);
    const body = raw.trim();
    if (!body) return;
    if (body.startsWith('@')) {
      const name = /^@([\w-]+)/.exec(body)?.[1] ?? '';
      const params = body.slice(name.length + 1);
      found.push({
        kind: 'at-rule',
        name,
        params: params.trimStart(),
        paramsStart:
          offset +
          name.length +
          1 +
          (params.length - params.trimStart().length),
        parents: [...parents],
      });
      return;
    }
    const colon = body.indexOf(':');
    if (colon <= 0) return;
    const value = body.slice(colon + 1);
    found.push({
      kind: 'declaration',
      property: body.slice(0, colon).trim(),
      propertyStart: offset,
      value: value.trim(),
      valueStart:
        offset + colon + 1 + (value.length - value.trimStart().length),
      parents: [...parents],
    });
  };

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      if (char === '\\') index++;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') depth++;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (depth > 0) continue;
    else if (char === ';') {
      statement(index);
      start = index + 1;
    } else if (char === '{') {
      const prelude = text.slice(start, index).trim().replace(/\s+/g, ' ');
      parents.push(prelude);
      if (prelude.startsWith('@')) {
        statement(index);
      }
      start = index + 1;
    } else if (char === '}') {
      statement(index);
      parents.pop();
      start = index + 1;
    }
  }
  statement(text.length);
  return found;
}

/**
 * Whether a declaration sits where a theme defines its tokens (ADR-0006,
 * ADR-0023).
 *
 * @param parents - Preludes of the enclosing blocks.
 * @returns True for theme blocks.
 */
function inThemeBlock(parents: readonly string[]): boolean {
  const normalized = parents.map((prelude) => prelude.replace(/"/g, "'"));
  const [first, second] = normalized;
  if (first !== undefined && /^@theme\b/.test(first)) return true;
  if (normalized.length === 1) {
    return first === ':root' || first === '.dark';
  }
  return (
    normalized.length === 2 &&
    /^@media \(prefers-color-scheme: ?dark\)$/.test(first ?? '') &&
    second === "[data-ndop-theme='system']"
  );
}

/**
 * Colors in a stylesheet, or an inline `style` value, that don't come from
 * the theme's tokens (ADR-0018 amendment 1):
 *
 * - color literals in declarations: hex, `rgb()`, `hsl()`, `hwb()`,
 *   `lab()`, `lch()`, `oklab()`, `oklch()`, `color()`, and named colors in
 *   color properties;
 * - custom properties defined with a color (`--ink: #18332d`), which start
 *   a palette beside the theme's; in the Tailwind stylesheet and the
 *   stylesheets it imports, the theme's own blocks are allowed (see
 *   {@link StylesheetColorsOptions.theme});
 * - palette and arbitrary color utilities in `@apply`.
 *
 * `var(--token)`, `color-mix()` over tokens, `transparent` and
 * `currentColor` are allowed.
 *
 * @param css - The stylesheet, or a declaration list such as a `style`
 *   attribute's value.
 * @param options - Whether it holds the theme, and its syntax.
 * @returns The colors, in order.
 *
 * @example
 * ```ts
 * stylesheetColors(':root { --ink: #18332d } .x { color: #fff }');
 * // [{ kind: 'palette', text: '--ink', color: '#18332d', offset: 9 },
 * //  { kind: 'literal', text: '#fff', offset: 35 }]
 * ```
 */
export function stylesheetColors(
  css: string,
  options: StylesheetColorsOptions = {},
): StylesheetColor[] {
  const found: StylesheetColor[] = [];
  for (const item of statements(css, options.lineComments)) {
    if (item.kind === 'at-rule') {
      if (item.name === 'apply') {
        for (const problem of rawColorClasses(item.params)) {
          found.push({
            kind: 'class',
            text: problem.token,
            offset: item.paramsStart + problem.offset,
          });
        }
      }
      continue;
    }
    const literals = colorLiterals(item.value, item.property);
    if (!literals.length) continue;
    if (item.property.startsWith('--')) {
      if (options.theme && inThemeBlock(item.parents)) continue;
      found.push({
        kind: 'palette',
        text: item.property,
        color: literals.map((literal) => literal.text).join(', '),
        offset: item.propertyStart,
      });
      continue;
    }
    for (const literal of literals) {
      found.push({
        kind: 'literal',
        text: literal.text,
        offset: item.valueStart + literal.offset,
      });
    }
  }
  return found;
}

/**
 * The stylesheets a stylesheet imports with `@import`, `@use` or
 * `@forward`, as written.
 *
 * @param css - The stylesheet.
 * @param lineComments - Whether `//` starts a comment, as in Sass.
 * @returns Each specifier, such as `./app/app.css` or `tailwindcss`.
 */
export function stylesheetImports(css: string, lineComments = false): string[] {
  return statements(css, lineComments).flatMap((item) => {
    if (
      item.kind !== 'at-rule' ||
      !['import', 'use', 'forward'].includes(item.name)
    ) {
      return [];
    }
    const specifier = /^(?:url\(\s*)?(["']?)([^"')\s]+)\1/.exec(item.params);
    return specifier?.[2] ? [specifier[2]] : [];
  });
}

/**
 * The color tokens a theme defines: custom properties holding colors in
 * the stylesheet's top-level `:root` rule, the same tokens the agent files
 * list (ADR-0017).
 *
 * @param css - The Tailwind stylesheet, or a stylesheet it imports. For a
 *   theme split across files, merge the results.
 * @returns Token names without `--`, sorted.
 */
export function themeColors(css: string): string[] {
  const names = new Set<string>();
  for (const item of statements(css)) {
    if (
      item.kind === 'declaration' &&
      item.property.startsWith('--') &&
      item.parents.length === 1 &&
      item.parents[0] === ':root' &&
      /^(?:oklch|oklab|rgb|hsl|hwb|lab|lch|color)\(|^#/i.test(item.value)
    ) {
      names.add(item.property.slice(2));
    }
  }
  return [...names].sort();
}
