import { readFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative } from 'node:path';
import { ndopPlugin, stylesheetTools, type RuleSetting } from './lint';
import type { Problem } from './types';
import { exists } from './workspace';

/** The rule stylesheet problems are reported under, the same as in templates. */
const RULE = 'ndop/no-raw-colors';

/** Stylesheet syntaxes where `//` starts a comment. */
const LINE_COMMENTS = new Set(['.scss', '.sass', '.less']);

/** The outcome of checking stylesheets. */
export interface StylesheetCheck {
  /** Colors outside the theme, as problems. */
  problems: Problem[];
  /** How to fix them, naming the theme's color tokens when known. */
  fix: string;
}

/**
 * How to fix a raw color: the token utilities, and the project's own color
 * tokens when its Tailwind stylesheet, or a stylesheet it imports, defines
 * them.
 *
 * @param tokens - Color token names without `--`.
 * @param entry - Project-relative path of the Tailwind stylesheet.
 * @returns The fix text.
 */
export function colorFix(tokens: readonly string[], entry?: string): string {
  const how =
    "Use the theme's color tokens: as utilities (`bg-primary`, `text-muted-foreground`, `border-border`) in templates, as `var(--primary)` in CSS.";
  if (tokens.length) {
    return `${how} This project's color tokens: ${tokens.join(', ')}.`;
  }
  return entry ? `${how} The theme's tokens are in ${entry}.` : how;
}

/**
 * The project's Tailwind stylesheet, from `ndop.json`.
 *
 * @param root - Workspace root.
 * @returns Its project-relative path, if `ndop.json` names one.
 */
async function tailwindEntry(root: string): Promise<string | undefined> {
  try {
    const config = JSON.parse(
      await readFile(join(root, 'ndop.json'), 'utf-8'),
    ) as { tailwind?: { css?: string } };
    return config.tailwind?.css;
  } catch {
    return undefined;
  }
}

/**
 * Where an imported stylesheet is, for relative specifiers. Packages
 * (`tailwindcss`, `@ndop/core/styles.css`) aren't app code, so they're
 * skipped.
 *
 * @param from - Absolute path of the importing stylesheet.
 * @param specifier - The import's specifier.
 * @returns The candidates, most likely first; empty for packages.
 */
function importCandidates(from: string, specifier: string): string[] {
  if (!specifier.startsWith('.')) return [];
  const path = join(dirname(from), specifier);
  if (extname(path)) return [path];
  const extension = extname(from);
  const partial = join(
    dirname(path),
    `_${path.slice(dirname(path).length + 1)}`,
  );
  return [`${path}${extension}`, `${partial}${extension}`, `${path}.css`];
}

/**
 * Line and column, 1-based, of an offset.
 *
 * @param text - The file.
 * @param offset - The offset.
 * @returns Its position.
 */
function position(
  text: string,
  offset: number,
): { line: number; column: number } {
  const before = text.slice(0, offset).split('\n');
  return {
    line: before.length,
    column: (before.at(-1)?.length ?? 0) + 1,
  };
}

/**
 * Applies `ndop/no-raw-colors` to stylesheets (ADR-0018 amendment 1),
 * which ESLint doesn't parse: the project's Tailwind stylesheet from
 * `ndop.json`, the checked components' `styleUrl`s, and every stylesheet
 * they import with a relative path. In the Tailwind stylesheet and the
 * stylesheets it imports, the theme's own blocks may define color tokens;
 * anywhere else, a custom property holding a color is a palette beside the
 * theme's.
 *
 * @param root - Workspace root.
 * @param stylesheets - Project-relative stylesheets of the checked
 *   components.
 * @param setting - How the project's ESLint config sets the rule for an
 *   absolute stylesheet path: `off` skips the file, `warning` reports
 *   warnings. Errors for every file by default.
 * @returns The problems, and the fix they share.
 */
export async function checkStylesheets(
  root: string,
  stylesheets: readonly string[],
  setting: (file: string) => Promise<RuleSetting> = async () => 'error',
): Promise<StylesheetCheck> {
  const plugin = stylesheetTools();
  const messages = ndopPlugin().rules['no-raw-colors'].meta.messages;
  const fill = (template: string, data: Record<string, string>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => data[key] ?? '');
  const entry = await tailwindEntry(root);
  const seen = new Set<string>();
  const problems: Problem[] = [];
  const tokens = new Set<string>();

  // The Tailwind stylesheet's imports are read before any component's, so
  // a theme file a component also imports still counts as the theme's.
  const check = async (start: readonly string[], theme: boolean) => {
    const queue = [...start];
    while (queue.length) {
      const path = queue.shift() as string;
      if (seen.has(path)) continue;
      seen.add(path);
      const file = relative(root, path);
      if (file.startsWith('..') || !(await exists(path))) continue;
      const css = await readFile(path, 'utf-8');
      const lineComments = LINE_COMMENTS.has(extname(path));
      if (theme) {
        for (const token of plugin.themeColors(css)) tokens.add(token);
      }
      const severity = await setting(path);
      if (severity !== 'off') {
        for (const color of plugin.stylesheetColors(css, {
          theme,
          lineComments,
        })) {
          problems.push({
            file,
            ...position(css, color.offset),
            rule: RULE,
            severity,
            message:
              color.kind === 'palette'
                ? fill(messages.palette, {
                    name: color.text,
                    color: color.color ?? '',
                  })
                : color.kind === 'class'
                  ? fill(messages.raw, { token: color.text })
                  : fill(messages.literal, { color: color.text }),
          });
        }
      }
      for (const specifier of plugin.stylesheetImports(css, lineComments)) {
        for (const candidate of importCandidates(path, specifier)) {
          if (await exists(candidate)) {
            queue.push(candidate);
            break;
          }
        }
      }
    }
  };
  if (entry) await check([join(root, entry)], true);
  await check(
    stylesheets.map((path) => (isAbsolute(path) ? path : join(root, path))),
    false,
  );
  const fix = colorFix([...tokens].sort(), entry);
  return {
    problems: problems.map((problem) => ({ ...problem, fix })),
    fix,
  };
}
