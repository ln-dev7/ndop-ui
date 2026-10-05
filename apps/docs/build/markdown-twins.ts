import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Where the docs are published; `llms.txt` links are absolute. */
export const SITE = 'https://ndop.dev';

/** A guide, read from `guides/<section>/<page>.md`. */
export interface Guide {
  /** Route, such as `/docs/getting-started/installation`. */
  url: string;
  /** From the front matter. */
  title: string;
  /** From the front matter. */
  description: string;
  /** Position in its section. */
  order: number;
  /** The Markdown after the front matter. */
  body: string;
}

/**
 * Every guide, in navigation order.
 *
 * @param guides - Absolute path of the guides folder.
 * @returns The guides.
 */
export function readGuides(guides: string): Guide[] {
  return readdirSync(guides, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((section) =>
      readdirSync(join(guides, section.name))
        .filter((file) => file.endsWith('.md'))
        .map((file) =>
          parseGuide(
            readFileSync(join(guides, section.name, file), 'utf-8'),
            `/docs/${section.name}/${file.slice(0, -'.md'.length)}`,
          ),
        )
        .sort((a, b) => a.order - b.order),
    );
}

/**
 * Splits a guide into its front matter and body.
 *
 * @param markdown - The file.
 * @param url - Its route.
 * @returns The guide.
 */
export function parseGuide(markdown: string, url: string): Guide {
  const front = /^---\n([\s\S]*?)\n---\n/.exec(markdown);
  const field = (name: string) =>
    new RegExp(`^${name}:\\s*(.*)$`, 'm').exec(front?.[1] ?? '')?.[1]?.trim() ??
    '';
  return {
    url,
    title: field('title'),
    description: field('description'),
    order: Number(field('order')) || 0,
    body: markdown.slice(front?.[0].length ?? 0).trim(),
  };
}

/**
 * The docs' own Markdown as plain Markdown that any reader understands:
 * fence options become plain language tags, a `title="…"` becomes a line
 * naming the file, and `:::steps` blocks become numbered headings.
 *
 * @param markdown - Docs Markdown.
 * @returns Plain Markdown.
 */
export function plainMarkdown(markdown: string): string {
  return markdown
    .replace(
      /^([ \t]*)(`{3,}|~{3,})(\w[\w-]*)?([^\n]*)$/gm,
      (
        whole,
        indent: string,
        fence: string,
        lang: string | undefined,
        meta: string,
      ) => {
        if (lang === undefined && !meta.trim()) return whole;
        const title = /title="([^"]+)"/.exec(meta)?.[1];
        const opening = `${indent}${fence}${lang ?? ''}`;
        return title ? `${indent}\`${title}\`:\n\n${opening}` : opening;
      },
    )
    .replace(
      /^:::steps[ \t]*\n([\s\S]*?)\n:::[ \t]*$/gm,
      (_whole, steps: string) => {
        let step = 0;
        return steps
          .trim()
          .replace(
            /^###\s+(.+)$/gm,
            (_heading, title: string) => `### ${++step}. ${title}`,
          );
      },
    );
}

/**
 * A guide's `.md` twin.
 *
 * @param guide - The guide.
 * @returns Its Markdown.
 */
export function guideMarkdown(guide: Guide): string {
  return `# ${guide.title}\n\n> ${guide.description}\n\n${plainMarkdown(guide.body)}\n`;
}

/** An entry of `llms.txt`. */
export interface LlmsLink {
  /** Its title. */
  title: string;
  /** Its route, without `.md`. */
  url: string;
  /** One sentence. */
  description: string;
}

/**
 * `/llms.txt` (llmstxt.org): what Ndop UI is, then a link to every page's
 * Markdown twin.
 *
 * @param guides - The guides, in order.
 * @param components - The components, in order.
 * @returns The file.
 */
export function llmsTxt(guides: LlmsLink[], components: LlmsLink[]): string {
  const list = (links: LlmsLink[]) =>
    links
      .map(
        (link) =>
          `- [${link.title}](${SITE}${link.url}.md): ${link.description}`,
      )
      .join('\n');
  return (
    [
      '# Ndop UI',
      '> Accessible Angular components you install as source files: Tailwind-styled directives on headless, signals-first primitives, with a CLI that adds them to your app and merges upstream fixes into the files you changed.',
      `Every page is also available as Markdown at its URL plus \`.md\`. ${SITE}/llms-full.txt has all of them in one file.`,
      '## Guides',
      list(guides),
      '## Components',
      list(components),
    ].join('\n\n') + '\n'
  );
}

/**
 * `/llms-full.txt`: every page's Markdown twin, in navigation order.
 *
 * @param twins - The twins.
 * @returns The file.
 */
export function llmsFullTxt(twins: string[]): string {
  return twins.map((twin) => twin.trimEnd()).join('\n\n---\n\n') + '\n';
}
