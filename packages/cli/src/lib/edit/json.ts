import {
  applyEdits,
  format,
  modify,
  parse,
  type ParseError,
} from 'jsonc-parser';
import { CliError } from '../errors';

/**
 * Parses JSON with comments and trailing commas, as `tsconfig.json` and
 * `angular.json` allow.
 *
 * @param text - File text.
 * @param file - Project-relative path, for errors.
 * @returns The parsed value.
 * @throws {@link CliError} when the text isn't valid JSONC.
 */
export function parseJsonc<T>(text: string, file: string): T {
  const errors: ParseError[] = [];
  const value = parse(text, errors, { allowTrailingComma: true }) as T;
  if (errors.length > 0) {
    throw new CliError(`Can't parse ${file}.`, file);
  }
  return value;
}

/**
 * Sets one value in a JSONC document, keeping its comments and formatting.
 *
 * @param text - File text.
 * @param path - Property path, such as `['compilerOptions', 'paths', '@/*']`.
 * @param value - New value.
 * @returns The edited text.
 */
export function setJsonc(
  text: string,
  path: (string | number)[],
  value: unknown,
): string {
  return applyEdits(
    text,
    modify(text, path, value, {
      formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' },
    }),
  );
}

/**
 * Adds a value to a JSONC document, formatting only the inserted text, so
 * the rest of the user's file keeps its exact layout; {@link setJsonc}
 * formats the whole enclosing object.
 *
 * @param text - File text.
 * @param path - Property path of the new value, such as
 *   `['mcpServers', 'ndop']`.
 * @param value - The value.
 * @returns The edited text.
 */
export function insertJsonc(
  text: string,
  path: (string | number)[],
  value: unknown,
): string {
  const [edit] = modify(text, path, value, {});
  if (!edit) return text;
  const edited = applyEdits(text, [edit]);
  // The range takes in the brace or comma on each side, so an insertion
  // into an empty object also gets its own lines.
  return applyEdits(
    edited,
    format(
      edited,
      { offset: Math.max(edit.offset - 1, 0), length: edit.content.length + 2 },
      { insertSpaces: true, tabSize: 2, eol: '\n' },
    ),
  );
}
