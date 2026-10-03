import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';
import ts from 'typescript';
import type { Plugin } from 'vite';
import type {
  ComponentPageData,
  ComponentSummary,
  ExampleData,
  MemberData,
  PartData,
} from '../src/app/components/component-data';
import { LANGUAGES, THEMES, transformers } from '../src/highlight/shiki';

const INDEX_ID = 'virtual:ndop/components';
const PAGE_PREFIX = 'virtual:ndop/component/';
const REPOSITORY = 'https://github.com/valerymelou/ndop';

/** The shapes of the built registry files this plugin reads. */
interface BuiltItem {
  name: string;
  type: string;
  version: string;
  title: string;
  description: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files?: { path: string; target: string; content: string }[];
  angular?: { ssr: boolean; zoneless: boolean; exports?: string[] };
  ndop?: { examples?: string[] };
}

/** The metadata fields this plugin reads (`@ndop/schema`'s metadata v1). */
interface Metadata {
  intro: string;
  agentNotes: { do: string[]; dont: string[] };
  pattern?: { name: string; url: string };
  bundleSize?: { gzip: number };
  keyboard: { keys: string[]; action: string }[];
  focus: string[];
  rtl?: string;
  parts: {
    name: string;
    selector: string;
    description: string;
    source?: string;
    role?: string;
    ariaAttributes?: string[];
    inputs: Member[];
    models: Member[];
    outputs: Member[];
    dataAttributes?: { name: string; values?: string[] }[];
  }[];
}

/** One input, model or output in the metadata. */
interface Member {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  description: string;
}

/** Options of {@link componentDocs}. */
export interface ComponentDocsOptions {
  /** Absolute workspace root. */
  workspace: string;
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
 * Generates the component pages' data from the built registry (ADR-0016):
 * `virtual:ndop/components` lists the components and loads each page's
 * data from `virtual:ndop/component/<name>`, with Markdown rendered and
 * code highlighted here, at build time. The registry must be built first
 * (`registry:build`), which the docs' targets depend on.
 *
 * @param options - Where the workspace and the built registry are.
 * @returns The Vite plugin.
 */
export function componentDocs(options: ComponentDocsOptions): Plugin {
  const registry = join(options.workspace, 'dist/registry/r');
  let highlighter: Promise<Highlighter> | undefined;
  const highlight = async (code: string, lang: string, meta = '') => {
    highlighter ??= createHighlighter({
      langs: LANGUAGES,
      themes: Object.values(THEMES),
    });
    return (await highlighter).codeToHtml(code, {
      lang,
      themes: THEMES,
      defaultColor: false,
      meta: { __raw: meta },
      transformers: transformers(),
    });
  };
  const read = <T>(file: string): T =>
    JSON.parse(readFileSync(join(registry, file), 'utf-8')) as T;

  return {
    name: 'ndop:component-docs',
    resolveId(id) {
      return id === INDEX_ID || id.startsWith(PAGE_PREFIX)
        ? `\0${id}`
        : undefined;
    },
    async load(id) {
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
        return [
          `export const components = ${JSON.stringify(components)};`,
          `export const examples = {${loaders.join(',')}};`,
          `export const pages = {${components
            .map(
              (component) =>
                `${JSON.stringify(component.name)}: () => import(${JSON.stringify(PAGE_PREFIX + component.name)})`,
            )
            .join(',')}};`,
        ].join('\n');
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
  const mainSource = examples[0]?.files?.[0]?.content ?? '';
  const usage = usageOf(mainSource);
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
              file.content,
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
 * An item and every item it depends on, transitively, each once: what a
 * manual install copies.
 *
 * @param item - The item.
 * @param read - Reads a built registry file.
 * @returns The item first, then its dependencies.
 */
function withDependencies(
  item: BuiltItem,
  read: <T>(file: string) => T,
): BuiltItem[] {
  const seen = new Map<string, BuiltItem>([[item.name, item]]);
  const queue = [...(item.registryDependencies ?? [])];
  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    if (seen.has(name)) continue;
    const dependency = read<BuiltItem>(`${name}.json`);
    seen.set(name, dependency);
    queue.push(...(dependency.registryDependencies ?? []));
  }
  return [...seen.values()];
}

/**
 * A file's target with the default `ndop.json` aliases filled in, as a
 * reader copying by hand would place it.
 *
 * @param target - Target with `{ui}` or `{lib}`.
 * @returns The path.
 */
export function defaultTarget(target: string): string {
  return target.replace('{ui}', 'src/app/ui').replace('{lib}', 'src/app/lib');
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
 * Turns TSDoc's inline `{@link Target}` and `{@link Target | text}` into
 * code spans, since the descriptions come from TSDoc comments.
 *
 * @param markdown - Markdown from metadata.
 * @returns The Markdown, without TSDoc tags.
 */
export function withoutTsdocLinks(markdown: string): string {
  return markdown.replace(
    /\{@link\s+([^}|\s]+)\s*(?:\|\s*([^}]+?)\s*)?\}/g,
    (_match, target: string, text?: string) => `\`${text ?? target}\``,
  );
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
 * The smallest correct usage of an item, taken from its main example: the
 * imports of the item's parts and the component's template.
 *
 * @param source - The main example's source.
 * @returns The imports and the template, ready to highlight.
 */
export function usageOf(source: string): { imports: string; template: string } {
  const file = ts.createSourceFile(
    'example.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = file.statements
    .filter(
      (statement): statement is ts.ImportDeclaration =>
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text.startsWith('@/ui/'),
    )
    .map((statement) => statement.getText(file))
    .join('\n');
  let template = '';
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(file) === 'template' &&
      ts.isNoSubstitutionTemplateLiteral(node.initializer)
    ) {
      template = dedent(node.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { imports, template };
}

/**
 * Removes a block's common indentation and its blank first and last lines.
 *
 * @param text - Indented text.
 * @returns The text, flush left.
 */
function dedent(text: string): string {
  const lines = text.replace(/^\n+|\s+$/g, '').split('\n');
  const indent = Math.min(
    ...lines
      .filter((line) => line.trim())
      .map((line) => /^ */.exec(line)?.[0].length ?? 0),
  );
  return lines.map((line) => line.slice(indent)).join('\n');
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
