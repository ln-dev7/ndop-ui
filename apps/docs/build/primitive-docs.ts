import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  PrimitivePageData,
  PrimitiveSummary,
} from '../src/app/components/component-data';
// Vite bundles this file with its config, and that bundler resolves
// neither tsconfig paths nor unbuilt workspace packages, so types and the
// renderer are imported by path.
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  withoutTsdocLinks,
  type Metadata,
} from '../../../packages/metadata/src/lib/markdown';
import { inline, partData } from './part-data';

/** A primitive's reference, as `primitives:api` writes it. */
type PrimitiveReference = PrimitiveSummary & {
  importPath: string;
  pattern?: { name: string; url: string };
  parts: Metadata['parts'];
  keyboard: Metadata['keyboard'];
  focus: Metadata['focus'];
  rtl?: string;
};

/** What the primitive builders need. */
export interface PrimitiveTools {
  /** Absolute workspace root. */
  workspace: string;
  /** Highlights code with the docs' Shiki setup. */
  highlight: (code: string, lang: string) => Promise<string>;
  /** Styled items by name, to link the one built on a primitive. */
  components: ReadonlyMap<string, { title: string }>;
  /** Base URL of the source on GitHub. */
  repository: string;
}

/**
 * Every primitive, from `dist/primitives-api/index.json`, which the
 * `primitives:api` target writes before the docs build.
 *
 * @param workspace - Absolute workspace root.
 * @returns The primitives, by title.
 */
export function readPrimitives(workspace: string): PrimitiveSummary[] {
  return (
    JSON.parse(
      readFileSync(join(workspace, 'dist/primitives-api/index.json'), 'utf-8'),
    ) as PrimitiveSummary[]
  ).sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * One primitive's reference page (ADR-0016, amendment 12).
 *
 * @param name - Entry point name, such as `dialog`.
 * @param tools - Workspace, highlighter, styled items and repository.
 * @returns The page data.
 */
export async function primitivePage(
  name: string,
  tools: PrimitiveTools,
): Promise<PrimitivePageData> {
  const reference = readReference(tools.workspace, name);
  const component = tools.components.get(name);
  return {
    name,
    title: reference.title,
    description: reference.description,
    importPath: reference.importPath,
    importHtml: await tools.highlight(importOf(reference), 'ts'),
    ...(reference.pattern ? { pattern: reference.pattern } : {}),
    accessibility: {
      keyboard: await Promise.all(
        reference.keyboard.map(async (row) => ({
          keys: row.keys,
          actionHtml: await inline(row.action),
        })),
      ),
      focusHtml: await Promise.all(reference.focus.map(inline)),
      ...(reference.rtl ? { rtlHtml: await inline(reference.rtl) } : {}),
    },
    parts: await Promise.all(rootFirst(reference.parts).map(partData)),
    ...(component ? { component: { name, title: component.title } } : {}),
    source: `${tools.repository}/tree/master/packages/primitives/${name}`,
  };
}

/**
 * A primitive page's `.md` twin (ADR-0016, amendment 6).
 *
 * @param name - Entry point name.
 * @param workspace - Absolute workspace root.
 * @returns The Markdown.
 */
export function primitiveMarkdown(name: string, workspace: string): string {
  const reference = readReference(workspace, name);
  const lines = [
    `# ${reference.title} primitive`,
    '',
    reference.description,
    '',
    '```ts',
    importOf(reference),
    '```',
  ];
  if (reference.pattern) {
    lines.push(
      '',
      `Implements the [${reference.pattern.name}](${reference.pattern.url}) pattern of the WAI-ARIA Authoring Practices.`,
    );
  }
  if (reference.keyboard.length) {
    lines.push('', '## Keyboard', '', '| Key | Action |', '| --- | ------ |');
    for (const row of reference.keyboard) {
      lines.push(
        `| ${row.keys.map((key) => `\`${key}\``).join(' or ')} | ${row.action} |`,
      );
    }
  }
  if (reference.focus.length) {
    lines.push(
      '',
      '## Focus',
      '',
      ...reference.focus.map((rule) => `- ${rule}`),
    );
  }
  if (reference.rtl) {
    lines.push('', '## Right-to-left', '', reference.rtl);
  }
  lines.push('', '## API reference');
  for (const part of rootFirst(reference.parts)) {
    lines.push(
      '',
      `### ${part.name}`,
      '',
      `\`${part.selector}\`: ${part.description}`,
    );
    const members = [
      ...part.inputs.map((member) => ({ ...member, kind: 'input' })),
      ...part.models.map((member) => ({ ...member, kind: 'model' })),
      ...part.outputs.map((member) => ({ ...member, kind: 'output' })),
    ];
    if (members.length) {
      lines.push(
        '',
        '| Name | Kind | Type | Description |',
        '| ---- | ---- | ---- | ----------- |',
      );
      for (const member of members) {
        lines.push(
          `| \`${member.name}\` | ${member.kind} | \`${member.type.replace(/\|/g, '\\|')}\` | ${member.description} |`,
        );
      }
    }
  }
  return `${withoutTsdocLinks(lines.join('\n'))}\n`;
}

/**
 * Reads one primitive's reference.
 *
 * @param workspace - Absolute workspace root.
 * @param name - Entry point name.
 * @returns Its reference.
 */
function readReference(workspace: string, name: string): PrimitiveReference {
  return JSON.parse(
    readFileSync(
      join(workspace, 'dist/primitives-api', `${name}.json`),
      'utf-8',
    ),
  ) as PrimitiveReference;
}

/**
 * The import of every part of a primitive, wrapped one name per line when
 * it doesn't fit 80 columns.
 *
 * @param reference - The primitive.
 * @returns One `import` statement.
 */
function importOf(reference: PrimitiveReference): string {
  const names = rootFirst(reference.parts).map((part) => part.name);
  const line = `import { ${names.join(', ')} } from '${reference.importPath}';`;
  // Wrapped as Prettier would, so the code frame doesn't scroll sideways.
  return line.length <= 80
    ? line
    : `import {\n${names.map((name) => `  ${name},`).join('\n')}\n} from '${reference.importPath}';`;
}

/**
 * Parts with the ones that need no other first, so the root reads first.
 *
 * @param parts - Parts in extraction order.
 * @returns The same parts, roots first, otherwise by name.
 */
function rootFirst<T extends { name: string; requires?: string[] }>(
  parts: readonly T[],
): T[] {
  return [...parts].sort(
    (a, b) =>
      Number(Boolean(a.requires?.length)) -
        Number(Boolean(b.requires?.length)) || a.name.localeCompare(b.name),
  );
}
