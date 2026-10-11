import type { BlockCode, BlockSummary } from '../src/app/blocks/block-data';
// Vite bundles this file with its config, and that bundler resolves
// neither tsconfig paths nor unbuilt workspace packages, so the renderer
// shared with the MCP server (ADR-0009) is imported by path.
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  defaultTarget,
  withDependencies,
  type BuiltItem,
  type RegistryReader,
} from '../../../packages/metadata/src/lib/markdown';

/** A built item with the block fields the gallery reads. */
type BlockItem = BuiltItem & { categories?: string[]; docs?: string };

/**
 * The gallery's blocks, in the registry's order, from the built registry
 * (ADR-0022).
 *
 * @param read - Reads a built registry file.
 * @returns Every block's summary.
 */
export function blockSummaries(read: RegistryReader): BlockSummary[] {
  return read<{ items: BlockItem[] }>('index.json')
    .items.filter((item) => item.type === 'registry:block')
    .map((summary) => {
      const item = read<BlockItem>(`${summary.name}.json`);
      const installed = withDependencies(item, read);
      return {
        name: item.name,
        title: item.title,
        description: item.description,
        category: item.categories?.[0] ?? '',
        version: item.version,
        command: `npx ndop add ${item.name}`,
        ...(item.docs ? { route: item.docs } : {}),
        components: (item.registryDependencies ?? [])
          .map((name) => read<BuiltItem>(`${name}.json`))
          .filter((dependency) => dependency.type === 'registry:ui')
          .map((dependency) => ({
            name: dependency.name,
            title: dependency.title,
          }))
          .sort((a, b) => a.title.localeCompare(b.title)),
        packages: [
          ...new Set(installed.flatMap((entry) => entry.dependencies ?? [])),
        ].sort(),
      };
    });
}

/**
 * A block's files, highlighted for its Code tab.
 *
 * @param name - Block name.
 * @param read - Reads a built registry file.
 * @param highlight - Highlights code with the docs' Shiki setup.
 * @returns The block's code.
 */
export async function blockCode(
  name: string,
  read: RegistryReader,
  highlight: (code: string, lang: string, meta?: string) => Promise<string>,
): Promise<BlockCode> {
  const item = read<BlockItem>(`${name}.json`);
  return {
    files: await Promise.all(
      (item.files ?? []).map(async (file) => {
        const target = defaultTarget(file.target);
        return {
          target,
          html: await highlight(
            file.content ?? '',
            'angular-ts',
            `title="${target}"`,
          ),
        };
      }),
    ),
  };
}

/**
 * A block as plain Markdown: its `.md` twin at `/blocks/<name>.md`, listed
 * in `llms.txt` (ADR-0022).
 *
 * @param summary - The block's summary.
 * @param read - Reads a built registry file.
 * @returns Its Markdown.
 */
export function blockMarkdown(
  summary: BlockSummary,
  read: RegistryReader,
): string {
  const item = read<BlockItem>(`${summary.name}.json`);
  const files = (item.files ?? []).map((file) =>
    [
      `### ${defaultTarget(file.target)}`,
      '```ts',
      (file.content ?? '').trimEnd(),
      '```',
    ].join('\n'),
  );
  return (
    [
      `# ${summary.title}`,
      summary.description,
      `Version ${summary.version}, in the ${summary.category} category.`,
      '## Installation',
      ['```bash', summary.command, '```'].join('\n'),
      ...(summary.route ? [summary.route] : []),
      ...(summary.components.length
        ? [
            '## Components',
            summary.components
              .map(
                (component) =>
                  `- [${component.title}](/docs/components/${component.name}.md)`,
              )
              .join('\n'),
          ]
        : []),
      '## Files',
      ...files,
    ].join('\n\n') + '\n'
  );
}
