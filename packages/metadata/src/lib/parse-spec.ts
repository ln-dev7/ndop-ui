import type { ComponentMetadata } from '@ndop/schema';

/**
 * The parts of a primitive's `spec.md` that feed metadata, tests and docs.
 * Field shapes match `metadata.json` (ADR-0002, `@ndop/schema`).
 */
export interface ParsedSpec {
  /** Name from the `# <Name>: accessibility contract` heading. */
  title: string;
  /** Linked WAI-ARIA pattern, when the section contains a link. */
  pattern?: NonNullable<ComponentMetadata['pattern']>;
  /** Rows of the "Parts, roles and attributes" table. */
  parts: SpecPart[];
  /** Rows of the "Keyboard map" table. Empty when the table has no rows. */
  keyboard: ComponentMetadata['keyboard'];
  /** Bullets of "Focus behavior", without empty ones. */
  focus: ComponentMetadata['focus'];
  /** Text of "RTL behavior". */
  rtl: string;
}

/**
 * One row of a spec's parts table.
 */
export interface SpecPart {
  /** Part name, such as `DialogTrigger`. */
  name: string;
  /** Attribute selector, such as `[ndDialogTrigger]`. */
  selector: string;
  /** ARIA role, or an empty string. */
  role: string;
  /** ARIA attributes the part manages. */
  ariaAttributes: string[];
  /** Data attributes the part exposes. */
  dataAttributes: string[];
}

/**
 * Sections every `spec.md` must have, in the order the primitive generator
 * writes them.
 */
const REQUIRED_SECTIONS = [
  'WAI-ARIA pattern',
  'Parts, roles and attributes',
  'Keyboard map',
  'Focus behavior',
  'RTL behavior',
] as const;

/**
 * Parses a primitive's `spec.md` (the accessibility contract written before
 * code) into structured data. Keyboard tests are driven by the result, so a
 * key in the spec without a test fails CI, and Phase 3's metadata extractor
 * merges it into `metadata/<name>.json`.
 *
 * @param markdown - Contents of a `spec.md` file.
 * @returns The parsed contract.
 * @throws If the title or a required section is missing, or a keyboard row
 *   has no key.
 *
 * @example
 * ```ts
 * const spec = parseSpec(readFileSync('packages/primitives/dialog/spec.md', 'utf-8'));
 * spec.keyboard; // [{ keys: ['Escape'], action: 'Closes the dialog.' }, …]
 * ```
 */
export function parseSpec(markdown: string): ParsedSpec {
  const title = /^# (.+?): accessibility contract\s*$/m.exec(markdown)?.[1];
  if (!title) {
    throw new Error(
      'spec.md must start with "# <Name>: accessibility contract".',
    );
  }

  const sections = splitSections(markdown);
  for (const name of REQUIRED_SECTIONS) {
    if (!sections.has(name)) {
      throw new Error(`spec.md is missing the "## ${name}" section.`);
    }
  }

  const link = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/.exec(
    sections.get('WAI-ARIA pattern') ?? '',
  );

  return {
    title,
    ...(link?.[1] && link[2]
      ? { pattern: { name: link[1], url: link[2] } }
      : {}),
    parts: tableRows(sections.get('Parts, roles and attributes') ?? '').map(
      ([name = '', selector = '', role = '', aria = '', data = '']) => ({
        name,
        // A part matching several elements lists one code span per selector.
        selector: codeList(selector).join(', ') || stripCode(selector),
        role: role.replace(/`/g, ''),
        ariaAttributes: codeList(aria),
        dataAttributes: codeList(data),
      }),
    ),
    keyboard: tableRows(sections.get('Keyboard map') ?? '').map(
      ([keys = '', action = '']) => {
        const parsed = codeList(keys);
        if (parsed.length === 0) {
          throw new Error(`Keyboard map row "${action}" lists no key.`);
        }
        return { keys: parsed, action };
      },
    ),
    focus: bullets(sections.get('Focus behavior') ?? '').filter(
      (text) => !text.endsWith(':'),
    ),
    rtl: (sections.get('RTL behavior') ?? '').replace(/\s+/g, ' ').trim(),
  };
}

/**
 * Splits a document into its `## ` sections.
 *
 * @param markdown - The whole document.
 * @returns Section bodies keyed by heading.
 */
function splitSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  let current: string | undefined;
  let body: string[] = [];
  for (const line of markdown.split('\n')) {
    const heading = /^## (.+?)\s*$/.exec(line);
    if (heading?.[1]) {
      if (current) sections.set(current, body.join('\n'));
      current = heading[1];
      body = [];
    } else if (current) {
      body.push(line);
    }
  }
  if (current) sections.set(current, body.join('\n'));
  return sections;
}

/**
 * Reads the body rows of the first Markdown table in a section, skipping
 * the header and separator rows.
 *
 * @param section - A section body.
 * @returns Trimmed cells per row.
 */
function tableRows(section: string): string[][] {
  const rows = section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));
  return rows
    .slice(2)
    .map((row) =>
      row
        .slice(1, row.endsWith('|') ? -1 : undefined)
        .split('|')
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.some((cell) => cell.length > 0));
}

/**
 * Reads the inline-code items of a cell, such as "`Enter`, `Space`".
 *
 * @param cell - A table cell.
 * @returns The code spans, in order.
 */
function codeList(cell: string): string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '');
}

/**
 * Reads a section's bullet list, joining each bullet's wrapped lines.
 *
 * @param section - A section body.
 * @returns One string per non-empty bullet.
 */
function bullets(section: string): string[] {
  const items: string[] = [];
  for (const line of section.split('\n')) {
    const bullet = /^- (.*)$/.exec(line.trim());
    if (bullet) {
      items.push(bullet[1]?.trim() ?? '');
    } else if (line.trim() && items.length > 0 && /^\s/.test(line)) {
      items[items.length - 1] = `${items[items.length - 1]} ${line.trim()}`;
    }
  }
  return items.filter((text) => text.length > 0);
}

/**
 * Removes surrounding backticks from a single code span.
 *
 * @param cell - A table cell.
 * @returns The cell text without backticks.
 */
function stripCode(cell: string): string {
  return cell.replace(/^`|`$/g, '');
}
