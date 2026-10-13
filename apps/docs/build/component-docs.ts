import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
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
  type BuiltItem,
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
import { blockCode, blockMarkdown, blockSummaries } from './block-docs';
import { themeSummaries } from './theme-docs';
import { landingData } from './landing-data';
import { block, inline, partData } from './part-data';
import {
  primitiveMarkdown,
  primitivePage,
  readPrimitives,
} from './primitive-docs';
import { searchIndex, type IndexedComponent } from './search-index';
// By path, for the same reason as the renderer above.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { BLOCK_CATEGORIES } from '../../../registry/categories';
// By path, for the same reason: the theme URL handler shared with the
// site's Pages Function and `serve-site` (ADR-0023).
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  CUSTOM_THEME_PATH,
  customThemeResponse,
} from '../../../packages/schema/src/theme';

const INDEX_ID = 'virtual:ndop/components';
const PAGE_PREFIX = 'virtual:ndop/component/';
const SEARCH_ID = 'virtual:ndop/search-index';
const CHANGELOG_PREFIX = 'virtual:ndop/changelog/';
const SNAPSHOTS_PREFIX = 'virtual:ndop/snapshots/';
const PRIMITIVES_ID = 'virtual:ndop/primitives';
const PRIMITIVE_PREFIX = 'virtual:ndop/primitive/';
const BLOCKS_ID = 'virtual:ndop/blocks';
const BLOCK_CODE_PREFIX = 'virtual:ndop/block-code/';
const THEMES_ID = 'virtual:ndop/themes';
const LANDING_ID = 'virtual:ndop/landing';
const REPOSITORY = 'https://github.com/ndop-ui/ui';

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
  /** Gzipped bytes the Angular CDK adds to an item, when it pulls any in. */
  cdkSize?: (name: string) => number | undefined;
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
 * build (amendment 6), as is the built registry itself, at `/r/`;
 * `virtual:ndop/primitives` lists the headless primitives and loads each
 * reference page's data from `virtual:ndop/primitive/<name>`, from what
 * `primitives:api` extracted (amendment 12); `virtual:ndop/blocks` lists
 * the blocks and loads each one's component and, from
 * `virtual:ndop/block-code/<name>`, its highlighted code (ADR-0022);
 * `virtual:ndop/themes` lists the themes, and the dev server answers theme
 * URLs as the site's Pages Function does (ADR-0023); and
 * `virtual:ndop/landing` holds the landing page's data (ADR-0026). The
 * registry must be built first
 * (`registry:build`), which the docs' targets depend on.
 *
 * @param options - Where the workspace and the guides are.
 * @returns The Vite plugin.
 */
export function componentDocs(options: ComponentDocsOptions): Plugin {
  const registry = join(options.workspace, 'dist/registry/r');
  let highlighter: Promise<Highlighter> | undefined;
  // Block thumbnails are photographed after prerendering (ADR-0026), which
  // only a build does; the dev server shows placeholders instead.
  let serving = false;
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
  // What each item adds to an app, from `size:check` (ADR-0021): its own
  // code, and with the Angular CDK it pulls in.
  // Unit tests load this plugin without having measured anything.
  const report = join(options.workspace, 'dist/size/report.json');
  const sizes = new Map(
    (existsSync(report)
      ? (JSON.parse(readFileSync(report, 'utf-8')) as {
          name: string;
          gzip: number;
          withCdk: number;
        }[])
      : []
    ).map((row) => [row.name, row]),
  );
  // Metadata's own bundle size is a quicker estimate that `ndop build`
  // makes for any registry; the docs, their twins included, show the
  // measured one instead.
  const read = <T>(file: string): T => {
    const data = JSON.parse(readFileSync(join(registry, file), 'utf-8')) as T;
    const measured = file.match(/^metadata\/(.+)\.json$/)?.[1];
    const size = measured === undefined ? undefined : sizes.get(measured);
    return size ? ({ ...data, bundleSize: { gzip: size.gzip } } as T) : data;
  };

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
    const primitives = readPrimitives(options.workspace);
    twins.push(
      ...primitives.map(
        (primitive) =>
          [
            `/docs/primitives/${primitive.name}.md`,
            primitiveMarkdown(primitive.name, options.workspace),
          ] as const,
      ),
    );
    // Changelogs have twins too, but stay out of llms-full.txt, which is
    // for using the components, not their history.
    const changelogs = components.map(
      (item) =>
        [
          `/docs/components/${item.name}/changelog.md`,
          changelogMarkdown(item.name, read),
        ] as const,
    );
    // Blocks are mostly code, so they stay out of llms-full.txt too.
    const blocks = blockSummaries(read);
    const blockTwins = blocks.map(
      (summary) =>
        [`/blocks/${summary.name}.md`, blockMarkdown(summary, read)] as const,
    );
    const markdown = 'text/markdown; charset=utf-8';
    const text = 'text/plain; charset=utf-8';
    return new Map([
      ...[...twins, ...changelogs, ...blockTwins].map(
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
            primitives.map((primitive) => ({
              title: primitive.title,
              url: `/docs/primitives/${primitive.name}`,
              description: primitive.description,
            })),
            blocks.map((summary) => ({
              title: summary.title,
              url: `/blocks/${summary.name}`,
              description: summary.description,
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

  // The built registry, served at /r/ with the site (ADR-0012), including
  // its license and third-party notices (ADR-0014, amendment 2).
  const registryFiles = (): Map<string, { type: string; body: string }> =>
    new Map(
      readdirSync(registry, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => {
          const file = join(entry.parentPath, entry.name);
          const path = `/r/${relative(registry, file).split(sep).join('/')}`;
          return [
            path,
            {
              type: path.endsWith('.json')
                ? 'application/json'
                : 'text/plain; charset=utf-8',
              body: readFileSync(file, 'utf-8'),
            },
          ] as const;
        }),
    );

  return {
    name: 'ndop:component-docs',
    configResolved(config) {
      serving = config.command === 'serve';
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = request.url?.split(/[?#]/)[0] ?? '';
        if (path === CUSTOM_THEME_PATH) {
          const theme = customThemeResponse(
            new URL(request.url ?? '', 'http://localhost').searchParams.get(
              't',
            ),
          );
          response.writeHead(theme.status, theme.headers);
          response.end(theme.body);
          return;
        }
        const served = path.startsWith('/r/')
          ? registryFiles()
          : path.endsWith('.md') || path.startsWith('/llms')
            ? machineReadable()
            : undefined;
        const file = served?.get(path);
        if (!file) return next();
        response.setHeader('Content-Type', file.type);
        response.end(file.body);
      });
    },
    generateBundle() {
      // Once, with the browser build, whose output is the site's static
      // files; the server build has no use for them.
      if (this.environment.config.consumer !== 'client') return;
      for (const [path, file] of [...machineReadable(), ...registryFiles()]) {
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
        id === PRIMITIVES_ID ||
        id.startsWith(PRIMITIVE_PREFIX) ||
        id.startsWith(CHANGELOG_PREFIX) ||
        id.startsWith(SNAPSHOTS_PREFIX) ||
        id === BLOCKS_ID ||
        id.startsWith(BLOCK_CODE_PREFIX) ||
        id === THEMES_ID ||
        id === LANDING_ID
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
        const blocks = blockSummaries(read).map((summary) => ({
          ...summary,
          category:
            BLOCK_CATEGORIES.find((c) => c.slug === summary.category)?.title ??
            summary.category,
        }));
        return `export const entries = ${JSON.stringify(searchIndex(options.guides, components, blocks))};`;
      }
      if (id === `\0${LANDING_ID}`) {
        const data = await landingData({
          read,
          highlight,
          workspace: options.workspace,
          gzip: (name) => sizes.get(name)?.gzip,
          thumbnails: !serving,
        });
        return `export const landing = ${JSON.stringify(data)};`;
      }
      if (id === `\0${THEMES_ID}`) {
        return `export const themes = ${JSON.stringify(themeSummaries(read))};`;
      }
      if (id === `\0${BLOCKS_ID}`) {
        const blocks = blockSummaries(read);
        return [
          `export const blocks = ${JSON.stringify(blocks)};`,
          // By file path: the `@/` alias only resolves from files the
          // tsconfig covers, which a virtual module is not.
          `export const blockComponents = {${blocks
            .map((summary) => {
              const exported = read<BuiltItem>(`${summary.name}.json`).angular
                ?.exports?.[0];
              const file = join(
                options.workspace,
                'registry/blocks',
                summary.name,
                `${summary.name}.ts`,
              );
              return `${JSON.stringify(summary.name)}: () => import(${JSON.stringify(file)}).then((m) => m.${exported})`;
            })
            .join(',')}};`,
          `export const blockCode = {${blocks
            .map(
              (summary) =>
                `${JSON.stringify(summary.name)}: () => import(${JSON.stringify(BLOCK_CODE_PREFIX + summary.name)})`,
            )
            .join(',')}};`,
        ].join('\n');
      }
      if (id.startsWith(`\0${BLOCK_CODE_PREFIX}`)) {
        const name = id.slice(BLOCK_CODE_PREFIX.length + 1);
        return `export default ${JSON.stringify(await blockCode(name, read, highlight))};`;
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
            group: item.categories?.[0] ?? '',
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
        return [
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
      if (id === `\0${PRIMITIVES_ID}`) {
        const primitives = readPrimitives(options.workspace);
        return [
          `export const primitives = ${JSON.stringify(primitives)};`,
          `export const primitivePages = {${primitives
            .map(
              (primitive) =>
                `${JSON.stringify(primitive.name)}: () => import(${JSON.stringify(PRIMITIVE_PREFIX + primitive.name)})`,
            )
            .join(',')}};`,
        ].join('\n');
      }
      if (id.startsWith(`\0${PRIMITIVE_PREFIX}`)) {
        const name = id.slice(PRIMITIVE_PREFIX.length + 1);
        const index = read<{ items: BuiltItem[] }>('index.json');
        const page = await primitivePage(name, {
          workspace: options.workspace,
          highlight: (code, lang) => highlight(code, lang),
          components: new Map(
            index.items
              .filter((item) => item.type === 'registry:ui')
              .map((item) => [item.name, { title: item.title }]),
          ),
          repository: REPOSITORY,
        });
        return `export default ${JSON.stringify(page)};`;
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
          cdkSize: (item) => {
            const size = sizes.get(item);
            return size && size.withCdk > size.gzip
              ? size.withCdk - size.gzip
              : undefined;
          },
        });
        return `export default ${JSON.stringify(page)};`;
      }
      return undefined;
    },
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
  const cdkSize = tools.cdkSize?.(name);
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
    ...(cdkSize ? { cdkSize } : {}),
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
