import type { Command } from 'commander';
import { pc } from '../colors';
import { CliError } from '../errors';
import type { IndexEntry } from '../registry/catalog';
import { DEFAULT_NAMESPACE } from '../registry/client';
import { RUN_CLI } from '../run-command';
import { table } from '../terminal';
import {
  browseContext,
  displayName,
  installedVersion,
  parseType,
  TYPE_NAMES,
  typeNames,
  type ItemType,
} from './browse';
import type { CommandEnvironment } from './environment';
import { outputOf } from './run';

/** Options `ndop list` accepts. */
interface ListOptions {
  cwd: string;
  registry?: string;
  type?: string;
  json?: boolean;
}

/** One item `ndop list` found. */
export interface ListedItem {
  /** Its registry's namespace, such as `@ndop`. */
  registry: string;
  /** Its name in that registry. */
  name: string;
  /** Its type, such as `registry:ui`. */
  type: string;
  /** Display title. */
  title: string;
  /** Its latest version. */
  version: string;
  /** One sentence. */
  description: string;
  /** Its categories, such as `auth` for a block. */
  categories: string[];
  /** The version `ndop.lock.json` records, when it's installed. */
  installed?: string;
}

/** The machine-readable outcome of `ndop list`, printed with `--json`. */
export interface ListResult {
  /** Whether the default registry could be read. */
  ok: boolean;
  /** Always `list`. */
  command: 'list';
  /**
   * The items found: by type, then registry, the default one first, then
   * name. Examples only with `--type example`.
   */
  items: ListedItem[];
  /** Registries that couldn't be read, other than the default one. */
  warnings: string[];
  /** What went wrong, when `ok` is false. */
  errors: { message: string; file?: string }[];
}

/** Item types in the order `ndop list` groups them. */
const TYPE_ORDER = Object.keys(TYPE_NAMES);

/**
 * Registers `ndop list [words...]`: the items of the registries a project
 * installs from (RFC-0001), Ndop's and every one in `ndop.json`'s
 * `registries`, grouped by type with their latest version, description
 * and, in a project, the version installed. Words filter by name, title,
 * description and category. Examples are listed only with
 * `--type example`, since every component has several. It works outside a
 * project too, on the default registry.
 *
 * @param program - The root `ndop` program.
 * @param environment - Injected outside world.
 * @returns The program, for chaining.
 *
 * @example
 * ```sh
 * npx @ndop/cli list
 * npx @ndop/cli list --type block
 * npx @ndop/cli list date --json
 * ```
 */
export function registerListCommand(
  program: Command,
  environment: CommandEnvironment,
): Command {
  program
    .command('list')
    .description("List the registries' components, blocks and themes.")
    .argument('[words...]', 'only items whose name or description has them')
    .option(
      '--type <type>',
      `only items of this type: ${Object.values(TYPE_NAMES)
        .map((names) => names.short)
        .join(', ')}`,
    )
    .option('--cwd <path>', 'project root', '.')
    .option('--registry <url>', 'registry URL template containing {name}')
    .option('--json', 'print one JSON result and nothing else')
    .action(async function (
      this: Command,
      words: string[],
      options: ListOptions,
    ) {
      const output = outputOf(this);
      const { result, hidden } = await runList(words, options, environment);
      if (!result.ok) process.exitCode = 1;
      if (options.json) {
        output.out(`${JSON.stringify(result, null, 2)}\n`);
      } else if (!result.ok) {
        output.err(
          result.errors
            .map(
              (error) =>
                `${pc.red('✗')} ${error.file ? `${error.file}: ` : ''}${error.message}\n`,
            )
            .join(''),
        );
      } else {
        output.out(report(result, words, hidden, environment.columns));
      }
    });
  return program;
}

/**
 * Runs `ndop list` without printing anything.
 *
 * @param words - Words every item listed must contain.
 * @param options - Command options.
 * @param environment - Injected outside world.
 * @returns The result, where expected failures are errors, and how many
 *   examples matched but weren't listed.
 */
async function runList(
  words: readonly string[],
  options: ListOptions,
  environment: CommandEnvironment,
): Promise<{ result: ListResult; hidden: number }> {
  const result: ListResult = {
    ok: true,
    command: 'list',
    items: [],
    warnings: [],
    errors: [],
  };
  let hidden = 0;
  try {
    const type = options.type ? parseType(options.type) : undefined;
    const context = await browseContext(options, environment);
    const found: ListedItem[] = [];
    for (const namespace of Object.keys(context.sources)) {
      let entries: IndexEntry[];
      try {
        entries = await context.catalog(namespace).index();
      } catch (error) {
        if (!(error instanceof CliError) || namespace === DEFAULT_NAMESPACE) {
          throw error;
        }
        result.warnings.push(`${namespace}: ${error.message}`);
        continue;
      }
      for (const entry of entries) {
        if (!matches(entry, words)) continue;
        if (type ? entry.type !== type : isExample(entry.type)) {
          if (!type && isExample(entry.type)) hidden++;
          continue;
        }
        const installed = installedVersion(context.lock, {
          registry: namespace,
          name: entry.name,
        });
        found.push({
          registry: namespace,
          name: entry.name,
          type: entry.type,
          title: entry.title,
          version: entry.version,
          description: entry.description,
          categories: entry.categories ?? [],
          ...(installed ? { installed } : {}),
        });
      }
    }
    const namespaces = Object.keys(context.sources);
    result.items = found.sort(
      (a, b) =>
        rank(a.type) - rank(b.type) ||
        namespaces.indexOf(a.registry) - namespaces.indexOf(b.registry) ||
        a.name.localeCompare(b.name),
    );
  } catch (error) {
    if (!(error instanceof CliError)) throw error;
    result.ok = false;
    result.errors.push({
      message: error.message,
      ...(error.file ? { file: error.file } : {}),
    });
  }
  return { result, hidden };
}

/**
 * Whether an item is an example, which `ndop list` leaves out unless asked.
 *
 * @param type - The item's type.
 * @returns Whether it's `registry:primitive-usage`.
 */
function isExample(type: string): boolean {
  return type === ('registry:primitive-usage' satisfies ItemType);
}

/**
 * Where a type's group goes; types Ndop doesn't know go last.
 *
 * @param type - An item type.
 * @returns Its position.
 */
function rank(type: string): number {
  const index = TYPE_ORDER.indexOf(type);
  return index === -1 ? TYPE_ORDER.length : index;
}

/**
 * Whether an index entry has every word, ignoring case, in its name,
 * title, description or categories.
 *
 * @param entry - The entry.
 * @param words - The words; none matches everything.
 * @returns Whether it matches.
 */
function matches(entry: IndexEntry, words: readonly string[]): boolean {
  const text = [
    entry.name,
    entry.title,
    entry.description,
    ...(entry.categories ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return words.every((word) => text.includes(word.toLowerCase()));
}

/**
 * Prints the items, one group per type, each item on one line: its name,
 * version, installed version in a project, and description, cut to the
 * terminal's width.
 *
 * @param result - The result.
 * @param words - The filter, to say when nothing matched.
 * @param hidden - Examples that matched but weren't listed.
 * @param width - The terminal's width, when known.
 * @returns Text to print.
 */
function report(
  result: ListResult,
  words: readonly string[],
  hidden: number,
  width: number | undefined,
): string {
  const lines: string[] = [];
  if (result.items.length === 0) {
    lines.push(
      words.length
        ? `No items match "${words.join(' ')}".`
        : 'The registry lists no such items.',
    );
  }
  const project = result.items.some((item) => item.installed);
  // One table for every group, so their columns line up.
  const rows = table(
    result.items.map((item) => [
      displayName(item),
      pc.dim(item.version),
      ...(project ? [installedCell(item)] : []),
      item.description,
    ]),
    { indent: 2, overflow: 'cut', ...(width === undefined ? {} : { width }) },
  );
  result.items.forEach((item, index) => {
    if (index === 0 || result.items[index - 1]?.type !== item.type) {
      if (lines.length) lines.push('');
      const count = result.items.filter(({ type }) => type === item.type);
      lines.push(pc.bold(`${typeNames(item.type).many} (${count.length})`));
    }
    lines.push(rows[index] ?? '');
  });
  lines.push('');
  if (hidden > 0) {
    lines.push(
      `${hidden} ${hidden === 1 ? 'example' : 'examples'} not listed; add --type example to list them.`,
    );
  }
  lines.push(`Run ${RUN_CLI} view <name> for an item's API and examples.`);
  for (const warning of result.warnings) {
    lines.push(`${pc.yellow('!')} ${warning}`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * The installed column of `ndop list`.
 *
 * @param item - A listed item.
 * @returns Nothing, `installed`, or the older version installed.
 */
function installedCell(item: ListedItem): string {
  if (!item.installed) return '';
  return item.installed === item.version
    ? pc.green('installed')
    : pc.yellow(`${item.installed} installed`);
}
