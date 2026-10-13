import type { Command } from 'commander';
import { withoutTsdocLinks, type Member, type Metadata } from '@ndop/metadata';
import type { RegistryItem } from '@ndop/schema';
import { pc } from '../colors';
import { CliError } from '../errors';
import { parseRef } from '../registry/client';
import { table, wrap } from '../terminal';
import {
  browseContext,
  displayName,
  docsUrl,
  installCommand,
  installedVersion,
  typeNames,
} from './browse';
import type { CommandEnvironment } from './environment';
import { outputOf } from './run';

/** Options `ndop view` accepts. */
interface ViewOptions {
  cwd: string;
  registry?: string;
  code?: boolean;
  json?: boolean;
}

/** An example of an item, as `ndop view` shows it. */
export interface ViewedExample {
  /** Its item name. */
  name: string;
  /** Display title. */
  title: string;
  /** One sentence. */
  description: string;
  /** Its files and their source, with `--code`. */
  files?: { target: string; content: string }[];
}

/** One item `ndop view` shows. */
export interface ViewedItem {
  /** Its registry's namespace, such as `@ndop`. */
  registry: string;
  /** Its name in that registry. */
  name: string;
  /** The command that installs it. */
  install: string;
  /** Its documentation page; only Ndop's own items have one. */
  docs?: string;
  /** The version `ndop.lock.json` records, when it's installed. */
  installed?: string;
  /** The item at its latest version, with its files' content. */
  item: RegistryItem;
  /** A component's `metadata/<name>.json`: its API, keyboard map and focus rules. */
  metadata?: Metadata;
  /** Its examples, the main one first. */
  examples: ViewedExample[];
  /** For an example, the components that show it. */
  demonstrates?: string[];
}

/** The machine-readable outcome of `ndop view`, printed with `--json`. */
export interface ViewResult {
  /** Whether every item was found. */
  ok: boolean;
  /** Always `view`. */
  command: 'view';
  /** The items found, in the order asked for. */
  items: ViewedItem[];
  /** What went wrong, such as an unknown name, with the closest ones. */
  errors: { message: string; file?: string }[];
}

/** The widest `ndop view` wraps text when the terminal's width is unknown. */
const DEFAULT_WIDTH = 80;

/**
 * Registers `ndop view <items...>`: an item's description, version,
 * dependencies and files, and for a component its usage, API (every
 * part's selector, inputs, models, outputs and data attributes), keyboard
 * map, focus rules and examples, from its metadata (RFC-0001, ADR-0007),
 * with the command that installs it and its docs page. `--code` adds the
 * examples' source, or an example's own. It reads the registry the way `ndop add` does and
 * works outside a project.
 *
 * @param program - The root `ndop` program.
 * @param environment - Injected outside world.
 * @returns The program, for chaining.
 *
 * @example
 * ```sh
 * npx @ndop/cli view dialog
 * npx @ndop/cli view button --code
 * npx @ndop/cli view @acme/data-table --json
 * ```
 */
export function registerViewCommand(
  program: Command,
  environment: CommandEnvironment,
): Command {
  program
    .command('view')
    .description(
      "Show an item's API, keyboard map and examples, and how to add it.",
    )
    .argument('<items...>', 'item names, bare or @namespace/name')
    .option(
      '--code',
      'also print the source of its examples, or of the example',
    )
    .option('--cwd <path>', 'project root', '.')
    .option('--registry <url>', 'registry URL template containing {name}')
    .option('--json', 'print one JSON result and nothing else')
    .action(async function (
      this: Command,
      names: string[],
      options: ViewOptions,
    ) {
      const output = outputOf(this);
      const result = await runView(names, options, environment);
      if (!result.ok) process.exitCode = 1;
      if (options.json) {
        output.out(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      const width = environment.columns ?? DEFAULT_WIDTH;
      if (result.items.length) {
        output.out(
          result.items
            .map((item) => report(item, width, Boolean(options.code)))
            .join('\n'),
        );
      }
      if (!result.ok) {
        output.err(
          result.errors
            .map(
              (error) =>
                `${pc.red('✗')} ${error.file ? `${error.file}: ` : ''}${error.message}\n`,
            )
            .join(''),
        );
      }
    });
  return program;
}

/**
 * Runs `ndop view` without printing anything.
 *
 * @param names - Items asked for.
 * @param options - Command options.
 * @param environment - Injected outside world.
 * @returns The result; expected failures, such as an unknown name, are
 *   errors in it, and the other items are still shown.
 */
async function runView(
  names: readonly string[],
  options: ViewOptions,
  environment: CommandEnvironment,
): Promise<ViewResult> {
  const result: ViewResult = {
    ok: true,
    command: 'view',
    items: [],
    errors: [],
  };
  const fail = (error: unknown) => {
    if (!(error instanceof CliError)) throw error;
    result.ok = false;
    result.errors.push({
      message: error.message,
      ...(error.file ? { file: error.file } : {}),
    });
  };
  let context: Awaited<ReturnType<typeof browseContext>>;
  try {
    context = await browseContext(options, environment);
  } catch (error) {
    fail(error);
    return result;
  }
  for (const text of names) {
    try {
      const ref = parseRef(text);
      if (ref.url || ref.version) {
        throw new CliError(
          `ndop view shows the latest version of an item by name, such as button or @acme/data-table; "${text}" isn't one.`,
        );
      }
      const catalog = context.catalog(ref.registry);
      const item = await catalog.item(ref.name);
      const registry = await catalog.registry();
      const metadata =
        item.type === 'registry:ui' && item.ndop?.metadata
          ? await catalog.metadata(ref.name)
          : undefined;
      const examples = await Promise.all(
        (metadata?.examples ?? item.ndop?.examples ?? []).map(
          async (name): Promise<ViewedExample> => {
            const entry = registry.items.find(
              (candidate) => candidate.name === name,
            );
            const example = options.code ? await catalog.item(name) : undefined;
            return {
              name,
              title: entry?.title ?? name,
              description: entry?.description ?? '',
              ...(example
                ? {
                    files: (example.files ?? []).map((file) => ({
                      target: file.target,
                      content: file.content ?? '',
                    })),
                  }
                : {}),
            };
          },
        ),
      );
      const docs = docsUrl(registry, item);
      const installed = installedVersion(context.lock, ref);
      result.items.push({
        registry: ref.registry,
        name: ref.name,
        install: installCommand(ref),
        ...(docs ? { docs } : {}),
        ...(installed ? { installed } : {}),
        item,
        ...(metadata ? { metadata } : {}),
        examples,
        ...(item.type === 'registry:primitive-usage'
          ? {
              demonstrates: registry.items
                .filter(
                  (entry) =>
                    entry.type === 'registry:ui' &&
                    entry.ndop?.examples?.includes(ref.name),
                )
                .map((entry) => entry.name),
            }
          : {}),
      });
    } catch (error) {
      fail(error);
    }
  }
  return result;
}

/**
 * Metadata or registry text as terminal prose: TSDoc links as code
 * spans, and the line breaks of hard-wrapped comments as spaces, keeping
 * paragraph breaks.
 *
 * @param text - Markdown from metadata or an item.
 * @returns Paragraphs, one per line.
 */
function prose(text: string): string {
  return withoutTsdocLinks(text)
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' '))
    .join('\n');
}

/**
 * Wraps prose to the width, indented.
 *
 * @param text - Paragraphs, one per line.
 * @param width - The terminal's width.
 * @param indent - Spaces before each line.
 * @returns The lines.
 */
function paragraph(text: string, width: number, indent = 0): string[] {
  const pad = ' '.repeat(indent);
  return wrap(text, Math.max(20, width - indent)).map((line) =>
    line ? `${pad}${line}` : '',
  );
}

/**
 * Prints one item: a summary, then a section per kind of detail it has.
 *
 * @param viewed - The item.
 * @param width - The terminal's width.
 * @param code - Whether to print examples' source, an example's own
 *   files included.
 * @returns Text to print.
 */
function report(viewed: ViewedItem, width: number, code: boolean): string {
  const { item, metadata } = viewed;
  const options = { width, indent: 2 } as const;
  const sections: string[][] = [];
  const section = (title: string, lines: string[]) => {
    if (lines.length) sections.push([pc.bold(title), ...lines]);
  };

  const facts: string[][] = [['Install', viewed.install]];
  if (viewed.docs) facts.push(['Docs', viewed.docs]);
  if (viewed.installed) {
    facts.push([
      'Installed',
      viewed.installed === item.version
        ? viewed.installed
        : `${viewed.installed}; ${item.version} is the latest`,
    ]);
  }
  if (metadata?.pattern) {
    facts.push([
      'Pattern',
      `${metadata.pattern.name}, ${metadata.pattern.url}`,
    ]);
  }
  if (item.angular) {
    facts.push([
      'Angular',
      [
        `${item.angular.minVersion} or later`,
        ...(item.angular.ssr ? ['SSR'] : []),
        ...(item.angular.zoneless ? ['zoneless'] : []),
      ].join(', '),
    ]);
  }
  if (metadata?.bundleSize) {
    facts.push([
      'Size',
      `${(metadata.bundleSize.gzip / 1000).toFixed(1)} kB gzip`,
    ]);
  }
  if (viewed.demonstrates?.length) {
    facts.push(['Shows', viewed.demonstrates.join(', ')]);
  }
  sections.push([
    `${pc.bold(item.title)}  ${pc.dim(`${displayName(viewed)} ${item.version}, ${typeNames(item.type).one}`)}`,
    ...paragraph(prose(item.description), width),
    ...(metadata?.intro
      ? ['', ...paragraph(prose(metadata.intro), width)]
      : []),
    '',
    ...table(facts, options),
  ]);

  section(
    'Dependencies',
    table(
      [
        ...(item.dependencies?.length
          ? [['npm', item.dependencies.join(', ')]]
          : []),
        ...(item.registryDependencies?.length
          ? [['registry', item.registryDependencies.join(', ')]]
          : []),
      ],
      options,
    ),
  );
  section(
    'Files',
    (item.files ?? []).flatMap((file) =>
      code && item.type === 'registry:primitive-usage'
        ? [
            pc.dim(`  ${file.target}`),
            ...(file.content ?? '').trimEnd().split('\n'),
          ]
        : [`  ${file.target}`],
    ),
  );
  if (item.docs) section('Notes', paragraph(prose(item.docs), width, 2));
  if (metadata?.usage) {
    section('Usage', [
      ...indented(metadata.usage.imports),
      '',
      ...indented(metadata.usage.template),
    ]);
  }
  if (metadata) {
    section(
      'API',
      metadata.parts.flatMap((part, index) => [
        ...(index > 0 ? [''] : []),
        `  ${pc.bold(part.name)}  ${pc.cyan(part.selector)}`,
        ...paragraph(prose(part.description), width, 4),
        ...table(
          [
            ...(part.requires?.length
              ? [['Inside', part.requires.join(', ')]]
              : []),
            ...(part.role ? [['Role', part.role]] : []),
            ...(part.source && part.source !== 'item'
              ? [['From', part.source]]
              : []),
            ...part.inputs.map((member) =>
              memberRow(member, `[${member.name}]`),
            ),
            ...part.models.map((member) =>
              memberRow(member, `[(${member.name})]`),
            ),
            ...part.outputs.map((member) =>
              memberRow(member, `(${member.name})`),
            ),
            ...(part.dataAttributes?.length
              ? [
                  [
                    'Data',
                    part.dataAttributes
                      .map((attribute) =>
                        attribute.values?.length
                          ? `${attribute.name} (${attribute.values.join(', ')})`
                          : attribute.name,
                      )
                      .join(', '),
                  ],
                ]
              : []),
          ],
          { width, indent: 4 },
        ),
      ]),
    );
    section(
      'Keyboard',
      table(
        metadata.keyboard.map((row) => [
          row.keys.join(' or '),
          prose(row.action),
        ]),
        options,
      ),
    );
    section(
      'Focus',
      metadata.focus.flatMap((rule) =>
        wrap(prose(rule), Math.max(20, width - 4)).map(
          (line, index) => `${index === 0 ? '  - ' : '    '}${line}`,
        ),
      ),
    );
    if (metadata.rtl) {
      section('Right to left', paragraph(prose(metadata.rtl), width, 2));
    }
  }
  if (viewed.examples.length) {
    section('Examples', [
      ...table(
        viewed.examples.map((example) => [
          example.name,
          prose(example.description),
        ]),
        options,
      ),
      ...(code
        ? viewed.examples.flatMap((example) =>
            (example.files ?? []).flatMap((file) => [
              '',
              pc.dim(`  ${example.name}: ${file.target}`),
              ...file.content.trimEnd().split('\n'),
            ]),
          )
        : ['', '  Add --code to print their source.']),
    ]);
  }
  return `${sections.map((lines) => lines.join('\n')).join('\n\n')}\n`;
}

/**
 * A binding's row in the API table: its binding, then its type, default
 * and whether it's required, then its description.
 *
 * @param member - An input, model or output.
 * @param binding - How a template binds it, such as `[variant]`.
 * @returns The row's cells.
 */
function memberRow(member: Member, binding: string): string[] {
  const type = [
    member.type,
    ...(member.default === undefined ? [] : [`= ${member.default}`]),
    ...(member.required ? ['(required)'] : []),
  ].join(' ');
  return [binding, `${type}\n${prose(member.description)}`];
}

/**
 * Code indented by two spaces, as-is otherwise.
 *
 * @param code - Source text.
 * @returns Its lines.
 */
function indented(code: string): string[] {
  return code.split('\n').map((line) => (line ? `  ${line}` : ''));
}
