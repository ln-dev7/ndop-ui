import {
  McpServer,
  ResourceTemplate,
  type CallToolResult,
} from '@modelcontextprotocol/server';
import {
  addItems,
  projectContext,
  projectRoot,
  registryMetadata,
  RUN_CLI,
  type Catalog,
  type DoctorResult,
  type IndexEntry,
} from '@ndop/cli/api';
import type { Metadata } from '@ndop/metadata';
import { verify, type StepName, type VerifyResult } from '@ndop/verify';
import { isAbsolute, relative, resolve } from 'node:path';
import type { RegistryItem } from '@ndop/schema';
import * as z from 'zod';
import { searchComponents, type SearchDocument } from './search';
import { themeTokens, tokensMarkdown } from './tokens';

/** Steps the `verify` tool can skip. */
const STEPS = ['usage', 'build', 'lint', 'render'] as const;

const cwdInput = z
  .string()
  .min(1)
  .describe("The app's folder, holding ndop.json, or a folder inside it.");

/**
 * Resolves paths inside a project, refusing any outside it.
 *
 * @param cwd - The project folder the tool was given.
 * @param paths - Paths relative to it.
 * @returns The project root, and the paths relative to `cwd`.
 * @throws When a path leaves the project.
 */
async function insideProject(
  cwd: string,
  paths: readonly string[],
): Promise<string> {
  const root = await projectRoot(cwd);
  for (const path of paths) {
    const inside = relative(root, resolve(cwd, path));
    if (inside.startsWith('..') || isAbsolute(inside)) {
      throw new Error(`${path} is outside the project at ${root}.`);
    }
  }
  return root;
}

/**
 * Verify's result as text: problems, then the steps.
 *
 * @param result - The result.
 * @returns The text.
 */
function verifyText(result: VerifyResult): string {
  return [
    result.ok
      ? 'Verified: no errors.'
      : `${result.problems.filter((problem) => problem.severity === 'error').length} errors. Fix them, then run verify again.`,
    ...result.problems.map(
      (problem) =>
        `- ${problem.severity} ${problem.file}:${problem.line}:${problem.column} ${problem.rule}: ${problem.message}${problem.fix ? ` Fix: ${problem.fix}` : ''}`,
    ),
    `Steps: ${result.steps.map((step) => `${step.name} ${step.skipped ? `skipped (${step.skipped})` : step.ok ? 'ok' : 'failed'}`).join('; ')}.`,
    ...(result.screenshots.length
      ? [`Screenshots: ${result.screenshots.join(', ')}.`]
      : []),
  ].join('\n');
}

const verifyOutput = z.object({
  ok: z.boolean(),
  steps: z.array(z.record(z.string(), z.unknown())),
  problems: z.array(z.record(z.string(), z.unknown())),
  screenshots: z.array(z.string()),
});

/** Options of {@link createNdopServer}. */
export interface NdopServerOptions {
  /** The registry to serve. */
  catalog: Catalog;
  /** The server's version, reported to clients. */
  version: string;
}

/** What every client is told about using the server. */
const INSTRUCTIONS = `Ndop UI: accessible Angular components installed as source files into the user's app.
Start with get_project_context. Build UI from the registry: before writing any component, layout or screen, look for it with search_components and list_blocks (blocks are whole screens), and never hand-build what the registry has. Read get_component for each one you use: it has the exact selectors, inputs, required nesting, keyboard behavior and a minimal correct usage. Never guess an Ndop API. Install what you need with add_items. Take every color, radius and font from the theme tokens (ndop://tokens), in templates, stylesheets and inline styles alike; never write color values or define CSS variables of your own. After writing, run verify on your files and fix every problem until it passes. The build-screen prompt walks through a whole screen.`;

const fileShape = z.object({
  target: z
    .string()
    .describe(
      'Where the file goes, with {ui} and {lib} for ndop.json aliases.',
    ),
  content: z.string(),
});

const nameInput = (what: string) =>
  z.object({
    name: z.string().min(1).describe(`The ${what}'s registry name.`),
  });

/**
 * Creates the Ndop MCP server (ADR-0009) over a registry: its read-only
 * tools (`search_components`, `get_component`, `get_example`,
 * `list_blocks`, `get_block`), its project tools (`get_project_context`,
 * `add_items`, `validate_usage`, `verify`), the `ndop://components/{name}` and
 * `ndop://tokens` resources, and the `build-screen` prompt. Errors a
 * caller can fix, such as an unknown name, come back as tool errors that
 * say how.
 *
 * @param options - The registry and the version to report.
 * @returns The server, ready to connect to a transport.
 *
 * @example
 * ```ts
 * serveStdio(() => createNdopServer({ catalog, version: '0.1.0' }));
 * ```
 */
export function createNdopServer(options: NdopServerOptions): McpServer {
  const { catalog } = options;
  const server = new McpServer(
    { name: 'ndop', title: 'Ndop UI', version: options.version },
    { instructions: INSTRUCTIONS },
  );
  const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

  server.registerTool(
    'search_components',
    {
      title: 'Search components',
      description:
        "Finds Ndop components by name, purpose or other words for them ('modal', 'confirm before deleting'). With no match, returns every component with its description, so you can pick.",
      inputSchema: z.object({
        query: z.string().describe('What you need, in a few words.'),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      outputSchema: z.object({
        matched: z.boolean(),
        results: z.array(
          z.object({
            name: z.string(),
            title: z.string(),
            description: z.string(),
            score: z.number().optional(),
          }),
        ),
      }),
      annotations: readOnly,
    },
    ({ query, limit }) =>
      result(async () => {
        const documents = await searchDocuments(catalog);
        const hits = searchComponents(documents, query, limit ?? 8);
        const results = hits.length
          ? hits
          : documents.map(({ name, title, description }) => ({
              name,
              title,
              description,
            }));
        return {
          text: [
            hits.length
              ? `Components matching "${query}":`
              : `No component matched "${query}". Every component:`,
            ...results.map(
              (hit) => `- ${hit.name} (${hit.title}): ${hit.description}`,
            ),
            'Read get_component before using one.',
          ].join('\n'),
          structured: { matched: hits.length > 0, results },
        };
      }),
  );

  server.registerTool(
    'get_component',
    {
      title: 'Get component',
      description:
        "A component's documentation: installation, minimal usage, examples, keyboard and focus behavior, every part's selector, inputs and required nesting, and do and don't notes. Read it before using the component.",
      inputSchema: nameInput('component'),
      outputSchema: z.object({
        name: z.string(),
        version: z.string(),
        metadata: z
          .record(z.string(), z.unknown())
          .describe('The component metadata, as metadata/<name>.json.'),
      }),
      annotations: readOnly,
    },
    ({ name }) =>
      result(async () => {
        const [item, metadata, text] = await Promise.all([
          catalog.item(name, 'registry:ui'),
          catalog.metadata(name),
          catalog.markdown(name),
        ]);
        return {
          text,
          structured: { name, version: item.version, metadata },
        };
      }),
  );

  server.registerTool(
    'get_example',
    {
      title: 'Get example',
      description:
        "A tested example's full source, the components it demonstrates and the items it needs. Example names are listed in each component's get_component result.",
      inputSchema: nameInput('example'),
      outputSchema: z.object({
        name: z.string(),
        title: z.string(),
        description: z.string(),
        demonstrates: z.array(z.string()),
        registryDependencies: z.array(z.string()),
        files: z.array(fileShape),
      }),
      annotations: readOnly,
    },
    ({ name }) =>
      result(async () => {
        const item = await catalog.item(name, 'registry:primitive-usage');
        const demonstrates = (await catalog.ofType('registry:ui'))
          .filter((entry) => entry.ndop?.examples?.includes(name))
          .map((entry) => entry.name);
        const files = filesOf(item);
        return {
          text: [
            `# ${item.title}`,
            item.description,
            demonstrates.length
              ? `Demonstrates: ${demonstrates.join(', ')}.`
              : '',
            ...files.map(
              (file) =>
                `\`${file.target}\`:\n\n\`\`\`ts\n${file.content}\n\`\`\``,
            ),
          ]
            .filter(Boolean)
            .join('\n\n'),
          structured: {
            name,
            title: item.title,
            description: item.description,
            demonstrates,
            registryDependencies: item.registryDependencies ?? [],
            files,
          },
        };
      }),
  );

  server.registerTool(
    'list_blocks',
    {
      title: 'List blocks',
      description:
        'Page-level compositions (blocks) the registry offers, such as a settings form, optionally in one category.',
      inputSchema: z.object({
        category: z
          .string()
          .optional()
          .describe('Only blocks in this category.'),
      }),
      outputSchema: z.object({
        blocks: z.array(
          z.object({
            name: z.string(),
            title: z.string(),
            description: z.string(),
            categories: z.array(z.string()),
          }),
        ),
      }),
      annotations: readOnly,
    },
    ({ category }) =>
      result(async () => {
        const blocks = (await catalog.ofType('registry:block'))
          .filter((entry) => !category || entry.categories?.includes(category))
          .map((entry) => ({
            name: entry.name,
            title: entry.title,
            description: entry.description,
            categories: entry.categories ?? [],
          }));
        return {
          text: blocks.length
            ? blocks
                .map(
                  (block) =>
                    `- ${block.name} (${block.title}): ${block.description}`,
                )
                .join('\n')
            : category
              ? `The registry has no blocks in "${category}". Call list_blocks without a category to see them all.`
              : 'The registry has no blocks. Compose the screen from components (search_components).',
          structured: { blocks },
        };
      }),
  );

  server.registerTool(
    'get_block',
    {
      title: 'Get block',
      description:
        "A block's files and everything it needs: the registry items it depends on, transitively, and their npm packages.",
      inputSchema: nameInput('block'),
      outputSchema: z.object({
        name: z.string(),
        title: z.string(),
        description: z.string(),
        files: z.array(fileShape),
        registryDependencies: z.array(z.string()),
        dependencies: z.array(z.string()),
      }),
      annotations: readOnly,
    },
    ({ name }) =>
      result(async () => {
        const item = await catalog.item(name, 'registry:block');
        const installed = await catalog.withDependencies(item);
        const files = filesOf(item);
        const registryDependencies = installed
          .slice(1)
          .map((entry) => entry.name);
        const dependencies = [
          ...new Set(installed.flatMap((entry) => entry.dependencies ?? [])),
        ];
        return {
          text: [
            `# ${item.title}`,
            item.description,
            registryDependencies.length
              ? `Install with: ${RUN_CLI} add ${name} (adds ${registryDependencies.join(', ')}).`
              : `Install with: ${RUN_CLI} add ${name}.`,
            ...files.map(
              (file) =>
                `\`${file.target}\`:\n\n\`\`\`ts\n${file.content}\n\`\`\``,
            ),
          ].join('\n\n'),
          structured: {
            name,
            title: item.title,
            description: item.description,
            files,
            registryDependencies,
            dependencies,
          },
        };
      }),
  );

  server.registerTool(
    'get_project_context',
    {
      title: 'Get project context',
      description:
        "What's set up in the user's app: ndop.json (aliases, registry), the installed items and versions, which of their files the user edited or still have conflicts from ndop update, the theme's token names, and what ndop doctor finds wrong with the setup. Call it first.",
      inputSchema: z.object({ cwd: cwdInput }),
      outputSchema: z.looseObject({ root: z.string() }),
      annotations: readOnly,
    },
    ({ cwd }) =>
      result(async () => {
        const context = await projectContext(cwd);
        const edited = context.items.flatMap((item) =>
          item.files
            .filter((file) => file.state !== 'unchanged')
            .map((file) => `${file.path} (${file.state})`),
        );
        const conflicted = context.items.flatMap((item) =>
          item.files
            .filter((file) => file.state === 'conflicted')
            .map((file) => file.path),
        );
        return {
          text: [
            `Project at ${context.root}.`,
            `Components go in ${context.config.aliases.ui}, helpers in ${context.config.aliases.lib}, blocks in ${context.config.aliases.blocks}; import them through ${context.config.importAlias ?? '@/'}.`,
            `Installed: ${context.items.map((item) => `${item.name} ${item.version}`).join(', ') || 'nothing yet'}.`,
            edited.length
              ? `Edited since installed: ${edited.join(', ')}.`
              : '',
            conflicted.length
              ? `ndop update left conflict markers in ${conflicted.join(', ')}: resolve them, then run ${RUN_CLI} update --continue.`
              : '',
            `Color tokens: ${context.tokens.colors.join(', ')}.`,
            ...doctorLines(context.doctor),
          ]
            .filter(Boolean)
            .join('\n'),
          structured: { ...context },
        };
      }),
  );

  server.registerTool(
    'add_items',
    {
      title: 'Add items',
      description:
        "Installs components or blocks into the user's app, with everything they depend on, as `ndop add` does: writes their files, installs npm packages and updates the lockfile. Never overwrites a file the user edited. With dryRun, returns the diffs and writes nothing.",
      inputSchema: z.object({
        names: z.array(z.string().min(1)).min(1).describe('Item names.'),
        cwd: cwdInput,
        dryRun: z.boolean().optional(),
      }),
      outputSchema: z.looseObject({ ok: z.boolean() }),
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    ({ names, cwd, dryRun }) =>
      result(async () => {
        const added = await addItems({
          cwd,
          names,
          ...(dryRun ? { dryRun } : {}),
        });
        if (!added.ok) {
          throw new Error(added.errors.map((error) => error.message).join(' '));
        }
        return {
          text: [
            dryRun
              ? 'Dry run; nothing was written.'
              : added.applied
                ? 'Installed.'
                : 'Already installed; nothing changed.',
            ...added.files.map((file) => `- ${file.action} ${file.path}`),
            ...added.skipped.map(
              (file) => `- kept ${file.path}: ${file.reason}`,
            ),
            ...(added.dependencies.length
              ? [`npm packages: ${added.dependencies.join(', ')}.`]
              : []),
            ...added.warnings,
            ...(added.diffs ?? []).map((diff) => diff.patch),
          ].join('\n'),
          structured: { ...added },
        };
      }),
  );

  server.registerTool(
    'validate_usage',
    {
      title: 'Validate usage',
      description:
        "Checks a file's templates against the components' metadata, in a second: unknown selectors and inputs, invalid values, missing required inputs, wrong nesting, components that aren't installed. verify runs this and more.",
      inputSchema: z.object({
        file: z.string().min(1).describe('The file, relative to cwd.'),
        cwd: cwdInput,
      }),
      outputSchema: verifyOutput,
      annotations: readOnly,
    },
    ({ file, cwd }) =>
      result(async () => {
        await insideProject(cwd, [file]);
        const checked = await verify({
          cwd,
          paths: [file],
          metadata: await registryMetadata(cwd),
          skip: ['build', 'lint', 'render'],
        });
        return { text: verifyText(checked), structured: { ...checked } };
      }),
  );

  server.registerTool(
    'verify',
    {
      title: 'Verify',
      description:
        "Runs ndop verify on files or folders: checks usage against the metadata, builds them with the app's build (type errors), lints them with Ndop's rules, and renders them in Chromium for axe accessibility checks and light and dark screenshots. Returns every problem with its file, line, rule and fix. Run it after every change until it passes.",
      inputSchema: z.object({
        paths: z
          .array(z.string().min(1))
          .min(1)
          .describe('Files or folders, relative to cwd.'),
        cwd: cwdInput,
        skip: z.array(z.enum(STEPS)).optional().describe('Steps to skip.'),
      }),
      outputSchema: verifyOutput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ paths, cwd, skip }) =>
      result(async () => {
        await insideProject(cwd, paths);
        const checked = await verify({
          cwd,
          paths,
          metadata: await registryMetadata(cwd),
          ...(skip ? { skip: skip as StepName[] } : {}),
        });
        return { text: verifyText(checked), structured: { ...checked } };
      }),
  );

  server.registerResource(
    'component',
    new ResourceTemplate('ndop://components/{name}', {
      list: async () => ({
        resources: (await catalog.ofType('registry:ui')).map((entry) => ({
          uri: `ndop://components/${entry.name}`,
          name: entry.name,
          title: entry.title,
          description: entry.description,
          mimeType: 'text/markdown',
        })),
      }),
      complete: {
        name: async (value) =>
          (await catalog.ofType('registry:ui'))
            .map((entry) => entry.name)
            .filter((name) => name.startsWith(value)),
      },
    }),
    {
      title: 'Component documentation',
      description: "A component's documentation as Markdown.",
      mimeType: 'text/markdown',
    },
    async (uri, { name }) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: await catalog.markdown(String(name)),
        },
      ],
    }),
  );

  server.registerResource(
    'tokens',
    'ndop://tokens',
    {
      title: 'Theme tokens',
      description:
        "The theme's design tokens, what each is for, and how to use them.",
      mimeType: 'text/markdown',
    },
    async (uri) => {
      const themes = await catalog.ofType('registry:theme');
      const entry =
        themes.find((theme) => theme.name === 'default') ?? themes[0];
      if (!entry) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/markdown',
              text: 'The registry has no theme.',
            },
          ],
        };
      }
      const theme = await catalog.item(entry.name, 'registry:theme');
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: tokensMarkdown(theme.title, themeTokens(theme)),
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'build-screen',
    {
      title: 'Build a screen',
      description:
        'Builds a screen from Ndop blocks and components, verified until it passes.',
      argsSchema: z.object({
        description: z.string().describe('The screen to build, in a sentence.'),
      }),
    },
    ({ description }) => ({
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: buildScreenPrompt(description) },
        },
      ],
    }),
  );

  return server;
}

/**
 * The `build-screen` prompt's text.
 *
 * @param description - The screen to build.
 * @returns The instructions.
 */
export function buildScreenPrompt(description: string): string {
  return `Build this screen in the Angular app, with Ndop UI: ${description}

1. Call get_project_context to see what's installed, the import aliases and the tokens.
2. Call list_blocks; if a block fits, read it with get_block and start from it.
3. Otherwise call search_components for each part of the screen, then get_component for every component you'll use. Follow its usage, required nesting and agent notes exactly; never guess a selector or input.
4. Call add_items with every block and component the screen needs that isn't installed yet.
5. Write the screen as a standalone component, built from the installed blocks and components, with labels on every form control, and theme tokens (ndop://tokens) for every color, radius and font, with no color values or CSS variables of your own.
6. Call verify with the files you wrote. Fix every problem it reports, then verify again, until it passes.`;
}

/**
 * Index entries and metadata of every component, for search.
 *
 * @param catalog - The registry.
 * @returns One document per component.
 */
async function searchDocuments(catalog: Catalog): Promise<SearchDocument[]> {
  const components = await catalog.ofType('registry:ui');
  const titles = new Map(
    (await catalog.index()).map((entry) => [entry.name, entry.title]),
  );
  return Promise.all(
    components.map(async (entry: IndexEntry) => {
      let metadata: Metadata | undefined;
      try {
        metadata = await catalog.metadata(entry.name);
      } catch {
        // Search still finds a component by name and description when its
        // metadata can't be read; get_component reports the problem.
      }
      return {
        name: entry.name,
        title: entry.title,
        description: entry.description,
        ...(metadata ? { metadata } : {}),
        exampleTitles: (entry.ndop?.examples ?? []).flatMap(
          (example) => titles.get(example) ?? [],
        ),
      };
    }),
  );
}

/**
 * An item's files, as installed.
 *
 * @param item - A built item.
 * @returns Each file's target and content.
 */
function filesOf(item: RegistryItem): { target: string; content: string }[] {
  return (item.files ?? []).map((file) => ({
    target: file.target,
    content: (file.content ?? '').trimEnd(),
  }));
}

/**
 * Runs a tool and shapes its result: the text for agents that read text,
 * the same result as structured content, and a tool error, with its
 * message, when the call fails.
 *
 * @param run - The tool's work.
 * @returns The tool result.
 */
async function result(
  run: () => Promise<{ text: string; structured: Record<string, unknown> }>,
): Promise<CallToolResult> {
  try {
    const { text, structured } = await run();
    return {
      content: [{ type: 'text', text }],
      structuredContent: structured,
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: (error as Error).message }],
      isError: true,
    };
  }
}

/**
 * What `ndop doctor` found, for an agent: one line per check that isn't
 * `ok`, with its fix.
 *
 * @param result - The doctor result.
 * @returns The lines; none when every check is `ok`.
 */
function doctorLines(result: DoctorResult): string[] {
  const found = result.checks.filter((check) => check.status !== 'ok');
  if (found.length === 0) return [];
  return [
    `ndop doctor found problems with the setup; fix them before writing UI (${RUN_CLI} doctor --fix applies the safe fixes):`,
    ...found.map(
      (check) =>
        `- ${check.title} (${check.status}): ${check.message}${check.details ? ` ${check.details.join(' ')}` : ''}${check.fix ? ` Fix: ${check.fix}` : ''}`,
    ),
  ];
}
