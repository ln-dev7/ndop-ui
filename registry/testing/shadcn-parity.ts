import { readFileSync } from 'fs';
import { join } from 'path';

const vendor = join(import.meta.dirname, '../vendor/shadcn/new-york-v4');

/**
 * Reads the vendored shadcn source of an item (ADR-0014).
 *
 * @param item - Registry item name, such as `button`.
 * @returns The TSX source.
 */
function shadcnSource(item: string): string {
  const json = JSON.parse(readFileSync(join(vendor, `${item}.json`), 'utf-8'));
  return (json.files as { content: string }[]).map((f) => f.content).join('\n');
}

/**
 * Returns the index just after the parenthesis that closes the one at
 * `open`, skipping parentheses inside string literals.
 *
 * @param text - Source text.
 * @param open - Index of an opening parenthesis.
 * @returns Index after the matching closing parenthesis.
 */
function closingParen(text: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === quote && text[i - 1] !== '\\') quote = null;
    } else if (char === '"' || char === "'" || char === '`') {
      quote = char;
    } else if (char === '(') {
      depth++;
    } else if (char === ')' && --depth === 0) {
      return i + 1;
    }
  }
  return text.length;
}

/**
 * Collects the class strings in a shadcn source: string literals inside
 * `cn(…)` and `cva(…)` calls, except object keys, and `className="…"`
 * attributes. Single words without `-`, `:` or `[` are skipped, which drops
 * variant names such as `"default"`.
 *
 * @param item - Registry item name.
 * @returns Unique class strings, in source order.
 */
export function shadcnClassStrings(item: string): string[] {
  const source = shadcnSource(item);
  const found = new Set<string>();
  for (const call of source.matchAll(/\b(?:cn|cva)\(/g)) {
    const start = call.index + call[0].length - 1;
    const body = source.slice(start, closingParen(source, start));
    // Keys are matched too, then skipped, so the scan never restarts on a
    // closing quote and pairs it with the next opening one.
    for (const literal of body.matchAll(/"([^"]*)"(\s*:)?/g)) {
      if (!literal[2]) found.add(literal[1] ?? '');
    }
  }
  for (const attr of source.matchAll(/className="([^"]*)"/g)) {
    found.add(attr[1] ?? '');
  }
  return [...found].filter((value) => /[\s:\-[]/.test(value));
}

/**
 * Expected Ndop classes for a shadcn class string: the same string, a
 * documented replacement, or `null` when Ndop drops it.
 */
export type ParityExceptions = Record<string, string | null>;

/**
 * Lists shadcn class strings that don't appear verbatim in an Ndop item's
 * source, after applying its documented exceptions.
 *
 * @param item - Registry item name.
 * @param ndopSource - The Ndop item's TypeScript source.
 * @param exceptions - Documented changes, keyed by exact substring of a
 *   shadcn class string.
 * @returns Missing class strings; empty when the item matches.
 */
export function missingShadcnClasses(
  item: string,
  ndopSource: string,
  exceptions: ParityExceptions = {},
): string[] {
  const missing: string[] = [];
  for (const original of shadcnClassStrings(item)) {
    let expected: string | null = original;
    for (const [from, to] of Object.entries(exceptions)) {
      if (expected?.includes(from)) {
        expected = to === null ? null : expected.replace(from, to);
      }
    }
    if (expected !== null && !ndopSource.includes(expected.trim())) {
      missing.push(expected);
    }
  }
  return missing;
}

/**
 * Reads an Ndop registry item's source.
 *
 * @param path - Path relative to the registry root, such as
 *   `ui/button/button.ts`.
 * @returns The source text.
 */
export function registrySource(path: string): string {
  return readFileSync(join(import.meta.dirname, '..', path), 'utf-8');
}
