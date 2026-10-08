import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';
import {
  createHighlighter,
  type Highlighter,
  type ShikiTransformer,
} from 'shiki';
import type { Plugin } from 'vite';
import type {
  ComponentPageData,
  ComponentSummary,
  ExampleData,
  MemberData,
  PartData,
  TemplatePalette,
} from '../src/app/components/component-data';
import {
  COLOR_REPLACEMENTS,
  LANGUAGES,
  THEMES,
  transformers,
} from '../src/highlight/shiki';
// Vite bundles this file with its config, and that bundler resolves
// neither tsconfig paths nor unbuilt workspace packages, so the renderer
// shared with the MCP server (ADR-0009) is imported by path.
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  componentMarkdown,
  defaultTarget,
  withDependencies,
  withoutTsdocLinks,
  type BuiltItem,
  type Member,
  type Metadata,
} from '../../../packages/metadata/src/lib/markdown';
import {
  guideMarkdown,
  llmsFullTxt,
  llmsTxt,
  readGuides,
} from './markdown-twins';
import {
  changelogMarkdown,
  changelogPage,
  previewSnapshots,
} from './changelog';
import { searchIndex, type IndexedComponent } from './search-index';

const INDEX_ID = 'virtual:ndop/components';
const PAGE_PREFIX = 'virtual:ndop/component/';
const SEARCH_ID = 'virtual:ndop/search-index';
const CHANGELOG_PREFIX = 'virtual:ndop/changelog/';
const SNAPSHOTS_PREFIX = 'virtual:ndop/snapshots/';
const REPOSITORY = 'https://github.com/valerymelou/ndop';

/** Options of {@link componentDocs}. */
export interface ComponentDocsOptions {
  /** Absolute workspace root. */
  workspace: string;
  /** Absolute path of the guides, for the search index. */
  guides: string;
}

/** What building a page's data needs. */
interface PageTools {
  /** Reads a built registry file. */
  read: <T>(file: string) => T;
  /** Highlights code with the docs' Shiki setup and a fence meta. */
  highlight: (code: string, lang: string, meta?: string) => Promise<string>;
  /** Absolute workspace root. */
  workspace: string;
}

/**
 * Generates the docs' data from the built registry, at build time
 * (ADR-0016): `virtual:ndop/components` lists the components and loads
 * each page's data from `virtual:ndop/component/<name>`, with Markdown
 * rendered and code highlighted here, each changelog page's from
 * `virtual:ndop/changelog/<name>` and the files the update preview merges
 * from `virtual:ndop/snapshots/<name>` (ADR-0020);
 * `virtual:ndop/search-index` holds the palette's index (ADR-0008); and
 * `/llms.txt`, `/llms-full.txt` and
 * every page's `.md` twin are served in development and emitted with the
 * build (amendment 6). The registry must be built first
 * (`registry:build`), which the docs' targets depend on.
 *
 * @param options - Where the workspace and the guides are.
 * @returns The Vite plugin.
 */
export function componentDocs(options: ComponentDocsOptions): Plugin {
  const registry = join(options.workspace, 'dist/registry/r');
  let highlighter: Promise<Highlighter> | undefined;
  const highlight = async (
    code: string,
    lang: string,
    meta = '',
    extra: ShikiTransformer[] = [],
  ) => {
    highlighter ??= createHighlighter({
      langs: LANGUAGES,
      themes: Object.values(THEMES),
    });
    return (await highlighter).codeToHtml(code, {
      lang,
      themes: THEMES,
      colorReplacements: COLOR_REPLACEMENTS,
      defaultColor: false,
      meta: { __raw: meta },
      transformers: [...extra, ...transformers()],
    });
  };
  const read = <T>(file: string): T =>
    JSON.parse(readFileSync(join(registry, file), 'utf-8')) as T;

  // Paths of the machine-readable docs (ADR-0016, amendment 6) and their
  // content, generated from the same data as the pages.
  const machineReadable = (): Map<string, { type: string; body: string }> => {
    const guides = readGuides(options.guides);
    const components = read<{ items: BuiltItem[] }>('index.json')
      .items.filter((item) => item.type === 'registry:ui')
      .sort((a, b) => a.title.localeCompare(b.title));
    const twins = [
      ...guides.map(
        (guide) => [`${guide.url}.md`, guideMarkdown(guide)] as const,
      ),
      ...components.map(
        (item) =>
          [
            `/docs/components/${item.name}.md`,
            componentMarkdown(item.name, read),
          ] as const,
      ),
    ];
    // Changelogs have twins too, but stay out of llms-full.txt, which is
    // for using the components, not their history.
    const changelogs = components.map(
      (item) =>
        [
          `/docs/components/${item.name}/changelog.md`,
          changelogMarkdown(item.name, read),
        ] as const,
    );
    const markdown = 'text/markdown; charset=utf-8';
    const text = 'text/plain; charset=utf-8';
    return new Map([
      ...[...twins, ...changelogs].map(
        ([path, body]) => [path, { type: markdown, body }] as const,
      ),
      [
        '/llms.txt',
        {
          type: text,
          body: llmsTxt(
            guides,
            components.map((item) => ({
              title: item.title,
              url: `/docs/components/${item.name}`,
              description: item.description,
            })),
          ),
        },
      ],
      [
        '/llms-full.txt',
        { type: text, body: llmsFullTxt(twins.map(([, body]) => body)) },
      ],
    ]);
  };

  return {
    name: 'ndop:component-docs',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = request.url?.split(/[?#]/)[0] ?? '';
        if (!path.endsWith('.md') && !path.startsWith('/llms')) return next();
        const file = machineReadable().get(path);
        if (!file) return next();
        response.setHeader('Content-Type', file.type);
        response.end(file.body);
      });
    },
    generateBundle() {
      // Once, with the browser build, whose output is the site's static
      // files; the server build has no use for them.
      if (this.environment.config.consumer !== 'client') return;
      for (const [path, file] of machineReadable()) {
        this.emitFile({
          type: 'asset',
          fileName: path.slice(1),
          source: file.body,
        });
      }
    },
    resolveId(id) {
      return id === INDEX_ID ||
        id === SEARCH_ID ||
        id.startsWith(PAGE_PREFIX) ||
        id.startsWith(CHANGELOG_PREFIX) ||
        id.startsWith(SNAPSHOTS_PREFIX)
        ? `\0${id}`
        : undefined;
    },
    async load(id) {
      if (id === `\0${SEARCH_ID}`) {
        const index = read<{ items: BuiltItem[] }>('index.json');
        const components = index.items
          .filter((item) => item.type === 'registry:ui')
          .map((item) => ({
            ...read<IndexedComponent>(`metadata/${item.name}.json`),
            title: item.title,
          }));
        return `export const entries = ${JSON.stringify(searchIndex(options.guides, components))};`;
      }
      if (id === `\0${INDEX_ID}`) {
        const index = read<{ items: BuiltItem[] }>('index.json');
        const components: ComponentSummary[] = index.items
          .filter((item) => item.type === 'registry:ui')
          .map((item) => ({
            name: item.name,
            title: item.title,
            description: item.description,
            examples: item.ndop?.examples ?? [],
          }))
          .sort((a, b) => a.title.localeCompare(b.title));
        const loaders = components.flatMap((component) =>
          component.examples.map((example) => {
            // By file path: the `@/` alias only resolves from files the
            // tsconfig covers, which a virtual module is not.
            const exported = read<BuiltItem>(`${example}.json`).angular
              ?.exports?.[0];
            return `${JSON.stringify(example)}: () => import(${JSON.stringify(join(options.workspace, 'registry/examples', `${example}.ts`))}).then((m) => m.${exported})`;
          }),
        );
        highlighter ??= createHighlighter({
          langs: LANGUAGES,
          themes: Object.values(THEMES),
        });
        const palette = templatePalette(await highlighter);
        return [
          `export const templatePalette = ${JSON.stringify(palette)};`,
          `export const components = ${JSON.stringify(components)};`,
          `export const examples = {${loaders.join(',')}};`,
          `export const pages = {${components
            .map(
              (component) =>
                `${JSON.stringify(component.name)}: () => import(${JSON.stringify(PAGE_PREFIX + component.name)})`,
            )
            .join(',')}};`,
          `export const changelogs = {${components
            .map(
              (component) =>
                `${JSON.stringify(component.name)}: () => import(${JSON.stringify(CHANGELOG_PREFIX + component.name)})`,
            )
            .join(',')}};`,
          `export const snapshots = {${components
            .map(
              (component) =>
                `${JSON.stringify(component.name)}: () => import(${JSON.stringify(SNAPSHOTS_PREFIX + component.name)})`,
            )
            .join(',')}};`,
        ].join('\n');
      }
      if (id.startsWith(`\0${CHANGELOG_PREFIX}`)) {
        const name = id.slice(CHANGELOG_PREFIX.length + 1);
        return `export default ${JSON.stringify(await changelogPage(name, { read, highlight }))};`;
      }
      if (id.startsWith(`\0${SNAPSHOTS_PREFIX}`)) {
        const name = id.slice(SNAPSHOTS_PREFIX.length + 1);
        return `export default ${JSON.stringify(previewSnapshots(name, read))};`;
      }
      if (id.startsWith(`\0${PAGE_PREFIX}`)) {
        const name = id.slice(PAGE_PREFIX.length + 1);
        const page = await pageData(name, {
          read,
          highlight,
          workspace: options.workspace,
        });
        return `export default ${JSON.stringify(page)};`;
      }
      return undefined;
    },
  };
}

/**
 * Reads the colors Shiki gives each part of an Angular template, from a
 * sample highlighted with the docs' themes.
 *
 * @param highlighter - The docs' Shiki highlighter.
 * @returns The palette.
 */
export function templatePalette(highlighter: Highlighter): TemplatePalette {
  const [line = []] = highlighter.codeToTokens('<a b="c">', {
    lang: 'angular-html',
    themes: THEMES,
    defaultColor: false,
  }).tokens;
  const style = (content: string) => {
    const token = line.find((entry) => entry.content === content);
    if (!token?.htmlStyle) {
      throw new Error(`Shiki gave no colors for "${content}" in a template.`);
    }
    return Object.entries(token.htmlStyle)
      .map(([name, value]) => `${name}:${value}`)
      .join(';');
  };
  return {
    plain: style('<'),
    tag: style('a'),
    attribute: style('b'),
    string: style('"c"'),
  };
}

/**
 * Builds one component page's data.
 *
 * @param name - Registry item name.
 * @param tools - Readers and renderers.
 * @returns The page data.
 */
async function pageData(
  name: string,
  tools: PageTools,
): Promise<ComponentPageData> {
  const item = tools.read<BuiltItem>(`${name}.json`);
  const metadata = tools.read<Metadata>(`metadata/${name}.json`);
  const exampleNames = item.ndop?.examples ?? [];
  const examples = exampleNames.map((example) =>
    tools.read<BuiltItem>(`${example}.json`),
  );
  const installed = withDependencies(item, tools.read);
  const files = installed.flatMap((entry) => entry.files ?? []);
  const dependencies = [
    ...new Set(installed.flatMap((entry) => entry.dependencies ?? [])),
  ];
  const usage = metadata.usage ?? { imports: '', template: '' };
  const itemFile = item.files?.[0]?.path ?? '';

  return {
    name,
    title: item.title,
    description: item.description,
    version: item.version,
    versions: versionsOf(tools.workspace, name),
    ...(metadata.pattern ? { pattern: metadata.pattern } : {}),
    ssr: item.angular?.ssr ?? false,
    zoneless: item.angular?.zoneless ?? false,
    ...(metadata.bundleSize ? { bundleSize: metadata.bundleSize.gzip } : {}),
    introHtml: await block(metadata.intro),
    install: {
      cliHtml: await tools.highlight(`npx ndop add ${name}`, 'bash', 'pm'),
      ...(dependencies.length
        ? {
            dependenciesHtml: await tools.highlight(
              `npm install ${dependencies.join(' ')}`,
              'bash',
              'pm',
            ),
          }
        : {}),
      files: await Promise.all(
        files.map(async (file) => {
          const target = defaultTarget(file.target);
          return {
            target,
            html: await tools.highlight(
              file.content ?? '',
              'angular-ts',
              `title="${target}" collapse`,
            ),
          };
        }),
      ),
    },
    usage: {
      importsHtml: await tools.highlight(usage.imports, 'angular-ts'),
      templateHtml: await tools.highlight(usage.template, 'angular-html'),
    },
    examples: await Promise.all(
      examples.map(
        async (example): Promise<ExampleData> => ({
          name: example.name,
          title: example.title,
          descriptionHtml: await inline(example.description),
          codeHtml: await tools.highlight(
            example.files?.[0]?.content ?? '',
            'angular-ts',
            'attached',
          ),
        }),
      ),
    ),
    accessibility: {
      keyboard: await Promise.all(
        metadata.keyboard.map(async (row) => ({
          keys: row.keys,
          actionHtml: await inline(row.action),
        })),
      ),
      focusHtml: await Promise.all(metadata.focus.map(inline)),
      ...(metadata.rtl ? { rtlHtml: await inline(metadata.rtl) } : {}),
    },
    parts: await Promise.all(metadata.parts.map(partData)),
    agentNotes: {
      doHtml: await Promise.all(metadata.agentNotes.do.map(inline)),
      dontHtml: await Promise.all(metadata.agentNotes.dont.map(inline)),
    },
    links: {
      source: `${REPOSITORY}/blob/master/registry/${itemFile}`,
      issue: `${REPOSITORY}/issues/new?title=${encodeURIComponent(`${item.title}: `)}`,
      edit: `${REPOSITORY}/edit/master/registry/${itemFile.replace(/[^/]+$/, 'docs.md')}`,
    },
    ...lastUpdated(tools.workspace, itemFile),
  };
}

/**
 * One part's API reference.
 *
 * @param part - The part's metadata.
 * @returns Its page data.
 */
async function partData(part: Metadata['parts'][number]): Promise<PartData> {
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
function block(markdown: string): Promise<string> {
  return Promise.resolve(marked.parse(withoutTsdocLinks(markdown)));
}

/**
 * Renders inline Markdown.
 *
 * @param markdown - Markdown from metadata.
 * @returns HTML.
 */
function inline(markdown: string): Promise<string> {
  return Promise.resolve(marked.parseInline(withoutTsdocLinks(markdown)));
}

/**
 * Released versions of an item, from its committed snapshots.
 *
 * @param workspace - Absolute workspace root.
 * @param name - Item name.
 * @returns Versions, newest first.
 */
function versionsOf(workspace: string, name: string): string[] {
  const prefix = `${name}@`;
  return readdirSync(join(workspace, 'registry/snapshots'))
    .filter((file) => file.startsWith(prefix))
    .map((file) => file.slice(prefix.length, -'.json'.length))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}

/**
 * When an item's file last changed, from git.
 *
 * @param workspace - Absolute workspace root.
 * @param file - Registry-relative path.
 * @returns `{ lastUpdated }`, or nothing outside a git checkout.
 */
function lastUpdated(
  workspace: string,
  file: string,
): { lastUpdated?: string } {
  try {
    const date = execFileSync(
      'git',
      ['log', '-1', '--format=%cs', '--', join('registry', file)],
      {
        cwd: workspace,
        encoding: 'utf-8',
      },
    ).trim();
    return date ? { lastUpdated: date } : {};
  } catch {
    return {};
  }
}
