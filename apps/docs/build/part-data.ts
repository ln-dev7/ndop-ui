import { marked } from 'marked';
import type {
  MemberData,
  PartData,
} from '../src/app/components/component-data';
// Vite bundles this file with its config, and that bundler resolves
// neither tsconfig paths nor unbuilt workspace packages, so the renderer
// shared with the MCP server (ADR-0009) is imported by path.
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  withoutTsdocLinks,
  type Member,
  type Metadata,
} from '../../../packages/metadata/src/lib/markdown';

/**
 * One part's API reference.
 *
 * @param part - The part's metadata.
 * @returns Its page data.
 */
export async function partData(
  part: Metadata['parts'][number],
): Promise<PartData> {
  const member = async (entry: Member): Promise<MemberData> => ({
    name: entry.name,
    type: entry.type,
    ...(entry.default === undefined ? {} : { default: entry.default }),
    ...(entry.values ? { values: entry.values } : {}),
    ...(entry.required ? { required: true } : {}),
    descriptionHtml: await inline(entry.description),
  });
  return {
    name: part.name,
    selector: part.selector,
    descriptionHtml: await inline(part.description),
    source: part.source ?? 'item',
    ...(part.role ? { role: part.role } : {}),
    ariaAttributes: part.ariaAttributes ?? [],
    inputs: await Promise.all(part.inputs.map(member)),
    models: await Promise.all(part.models.map(member)),
    outputs: await Promise.all(part.outputs.map(member)),
    dataAttributes: part.dataAttributes ?? [],
  };
}

/**
 * Renders a Markdown block.
 *
 * @param markdown - Markdown from metadata.
 * @returns HTML.
 */
export function block(markdown: string): Promise<string> {
  return Promise.resolve(marked.parse(withoutTsdocLinks(markdown)));
}

/**
 * Renders inline Markdown.
 *
 * @param markdown - Markdown from metadata.
 * @returns HTML.
 */
export function inline(markdown: string): Promise<string> {
  return Promise.resolve(marked.parseInline(withoutTsdocLinks(markdown)));
}
