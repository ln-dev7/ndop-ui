import { stripVTControlCharacters } from 'node:util';

/**
 * The narrowest a table's last column gets, so its text stays readable
 * in a narrow terminal even if lines then overflow.
 */
const MIN_LAST_COLUMN = 20;

/**
 * Whether the CLI may ask questions: standard input and output are both
 * terminals and the `CI` variable isn't set, as CI services set it
 * (ADR-0011, amendment 3). A terminal an agent drives can be a TTY too,
 * so the agent files tell agents to pass `--yes`.
 *
 * @param stdinTty - Whether standard input is a terminal.
 * @param stdoutTty - Whether standard output is a terminal.
 * @param env - Environment variables.
 * @returns Whether prompts are allowed.
 *
 * @example
 * ```ts
 * canPrompt(true, true, {}); // true
 * canPrompt(true, true, { CI: 'true' }); // false
 * ```
 */
export function canPrompt(
  stdinTty: boolean | undefined,
  stdoutTty: boolean | undefined,
  env: Record<string, string | undefined>,
): boolean {
  const ci = env['CI'];
  return (
    Boolean(stdinTty && stdoutTty) &&
    (ci === undefined || ci === '' || ci === '0' || ci === 'false')
  );
}

/**
 * How many columns text takes in a terminal, ignoring color codes.
 *
 * @param text - One line, possibly colored.
 * @returns Its width.
 */
export function visibleWidth(text: string): number {
  return stripVTControlCharacters(text).length;
}

/**
 * Breaks text into lines of at most `width` columns, at spaces. A word
 * longer than the width gets a line of its own.
 *
 * @param text - Plain text; line breaks in it start new lines.
 * @param width - The most columns per line.
 * @returns The lines.
 *
 * @example
 * ```ts
 * wrap('Activates the button.', 12); // ['Activates', 'the button.']
 * ```
 */
export function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && line.length + 1 + word.length > width) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Cuts one line of plain text to `width` columns, ending it with `…` when
 * anything was cut.
 *
 * @param text - Plain text.
 * @param width - The most columns.
 * @returns The text, at most `width` columns wide.
 *
 * @example
 * ```ts
 * truncate('A window overlaid on the page.', 12); // 'A window ov…'
 * ```
 */
export function truncate(text: string, width: number): string {
  return text.length <= width
    ? text
    : `${text.slice(0, Math.max(0, width - 1)).trimEnd()}…`;
}

/** How {@link table} lays rows out. */
export interface TableOptions {
  /**
   * The terminal's width; without it the last column is never wrapped or
   * cut, as when output goes to a file or another program.
   */
  width?: number;
  /** Spaces before each row. */
  indent?: number;
  /**
   * What happens to a last column that doesn't fit: `wrap` continues it
   * on the next lines, under itself, and `cut` ends it with `…`.
   */
  overflow?: 'wrap' | 'cut';
}

/**
 * Aligns rows into columns two spaces apart. Every column but the last is
 * as wide as its widest cell, colors allowed; the last one, plain text,
 * gets the rest of the width. Line breaks in a last cell start new lines.
 *
 * @param rows - The cells of each row; rows may have fewer cells.
 * @param options - Width, indent and overflow.
 * @returns The lines, without trailing spaces.
 *
 * @example
 * ```ts
 * table([['Enter', 'Activates the button.']], { width: 20, indent: 2 });
 * // ['  Enter  Activates the', '         button.']
 * ```
 */
export function table(
  rows: readonly (readonly string[])[],
  options: TableOptions = {},
): string[] {
  const indent = ' '.repeat(options.indent ?? 0);
  const columns = Math.max(0, ...rows.map((row) => row.length));
  const widths = Array.from({ length: columns - 1 }, (_, column) =>
    Math.max(0, ...rows.map((row) => visibleWidth(row[column] ?? ''))),
  );
  const offset =
    indent.length + widths.reduce((sum, width) => sum + width + 2, 0);
  const room =
    options.width === undefined
      ? undefined
      : Math.max(MIN_LAST_COLUMN, options.width - offset);
  const lines: string[] = [];
  for (const row of rows) {
    const fixed = widths
      .map((width, column) => {
        const cell = row[column] ?? '';
        return `${cell}${' '.repeat(width - visibleWidth(cell))}  `;
      })
      .join('');
    const last = row.length === columns ? (row[columns - 1] ?? '') : '';
    const text =
      room === undefined
        ? last.split('\n')
        : options.overflow === 'cut'
          ? [truncate(last.replace(/\s*\n\s*/g, ' '), room)]
          : wrap(last, room);
    text.forEach((line, index) => {
      const lead = index === 0 ? fixed : ' '.repeat(offset - indent.length);
      lines.push(`${indent}${lead}${line}`.trimEnd());
    });
  }
  return lines;
}
