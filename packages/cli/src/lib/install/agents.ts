import { posix } from 'node:path';
import type { NdopConfig, NdopLock } from '@ndop/schema';
import { insertJsonc, parseJsonc } from '../edit/json';
import { CliError } from '../errors';
import { sha256, type PlanBuilder } from '../plan/plan';
import {
  aliasPrefix,
  LOCK_FILE,
  readLock,
  serializeLock,
} from './project-files';

/** Coding agents `--agent` accepts (ADR-0017). */
export const AGENTS = ['claude-code', 'cursor', 'copilot'] as const;

/** A coding agent whose context files the CLI writes. */
export type Agent = (typeof AGENTS)[number];

/** Opens the section the CLI owns in a shared file. */
export const SECTION_START = '<!-- ndop:start -->';

/** Closes the section the CLI owns in a shared file. */
export const SECTION_END = '<!-- ndop:end -->';

/** The command that runs the Ndop MCP server (ADR-0009). */
const MCP_SERVER = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@ndop/mcp'],
} as const;

/** Files that only exist for the agents listed, and how they're written. */
const FILES: {
  path: string;
  agent?: Agent;
  kind: 'section' | 'skill' | 'rule';
}[] = [
  { path: 'AGENTS.md', kind: 'section' },
  { path: 'CLAUDE.md', agent: 'claude-code', kind: 'section' },
  { path: '.claude/skills/ndop/SKILL.md', agent: 'claude-code', kind: 'skill' },
  { path: '.cursor/rules/ndop.mdc', agent: 'cursor', kind: 'rule' },
  {
    path: '.github/copilot-instructions.md',
    agent: 'copilot',
    kind: 'section',
  },
];

/**
 * Where each agent reads project MCP servers, and the key it lists them
 * under, as each tool documents it.
 */
const MCP_FILES: { path: string; agent: Agent; key: string }[] = [
  { path: '.mcp.json', agent: 'claude-code', key: 'mcpServers' },
  { path: '.cursor/mcp.json', agent: 'cursor', key: 'mcpServers' },
  { path: '.vscode/mcp.json', agent: 'copilot', key: 'servers' },
];

/** What reveals that a project already uses an agent. */
const SIGNS: Record<Agent, string[]> = {
  'claude-code': ['CLAUDE.md', '.claude'],
  cursor: ['.cursor', '.cursorrules'],
  copilot: ['.github/copilot-instructions.md'],
};

/**
 * Something that can tell whether a path exists: the project file system.
 */
interface ExistsReader {
  exists(path: string): Promise<boolean>;
}

/**
 * The agents a project already uses, from their files (ADR-0017):
 * `CLAUDE.md` or `.claude/` for Claude Code, `.cursor/` for Cursor and
 * `.github/copilot-instructions.md` for Copilot.
 *
 * @param fs - The project.
 * @returns The agents found, in {@link AGENTS} order.
 */
export async function detectAgents(fs: ExistsReader): Promise<Agent[]> {
  const found: Agent[] = [];
  for (const agent of AGENTS) {
    for (const sign of SIGNS[agent]) {
      if (await fs.exists(sign)) {
        found.push(agent);
        break;
      }
    }
  }
  return found;
}

/**
 * Parses `--agent` values: agent names, repeated or comma-separated, or
 * `none`.
 *
 * @param values - The option's values.
 * @returns The agents, or `false` for `none`.
 * @throws {@link CliError} for unknown names, or `none` with others.
 */
export function parseAgents(values: readonly string[]): Agent[] | false {
  const names = values
    .flatMap((value) => value.split(','))
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.includes('none')) {
    if (names.length > 1) {
      throw new CliError("--agent none can't be combined with other agents.");
    }
    return false;
  }
  for (const name of names) {
    if (!(AGENTS as readonly string[]).includes(name)) {
      throw new CliError(
        `Unknown agent "${name}". Use ${AGENTS.join(', ')} or none.`,
      );
    }
  }
  return [...new Set(names)] as Agent[];
}

/**
 * Stages the agent context files for the agents `ndop.json` lists
 * (ADR-0017): the Ndop section of `AGENTS.md` and the agents' shared files,
 * between {@link SECTION_START} and {@link SECTION_END}; the files Ndop
 * owns outright, unless the user edited them; and, when `mcp` is set, the
 * `ndop` server in each agent's MCP configuration. Shared files are staged
 * unformatted, since formatting would also change the user's text. The
 * content comes from the lockfile and the stylesheet, so it's always true
 * for the project.
 *
 * @param builder - The plan being built, after the items are staged.
 * @param config - The project's configuration.
 * @param aliasBase - Folder the import alias points at, if mapped.
 */
export async function planAgentFiles(
  builder: PlanBuilder,
  config: NdopConfig,
  aliasBase: string | undefined,
): Promise<void> {
  if (config.agents === undefined || config.agents === false) return;
  const agents: readonly string[] = config.agents;
  const lock = await readLock(builder);
  const before = serializeLock(lock);
  const facts: Facts = {
    config,
    aliasBase,
    lock,
    tokens: tokenNames((await builder.read(config.tailwind.css)) ?? ''),
  };

  for (const file of FILES) {
    if (file.agent && !agents.includes(file.agent)) continue;
    if (file.kind === 'section') {
      await stageSection(builder, file.path, section(facts));
    } else {
      const content =
        file.kind === 'skill' ? skillFile(facts) : cursorRule(facts);
      await stageOwned(builder, lock, file.path, content);
    }
  }

  if (config.mcp) {
    for (const file of MCP_FILES) {
      if (agents.includes(file.agent)) {
        await stageMcpServer(builder, file.path, file.key);
      }
    }
  }

  const after = serializeLock(lock);
  if (after !== before) {
    await builder.stage(LOCK_FILE, after);
  }
}

/** What the generated guidance is written from. */
interface Facts {
  config: NdopConfig;
  aliasBase: string | undefined;
  lock: NdopLock;
  tokens: { colors: string[]; other: string[] };
}

/**
 * Replaces the Ndop section of a shared file, or appends it; text outside
 * the markers is never changed.
 *
 * @param builder - The plan.
 * @param path - Project-relative path.
 * @param block - The section, markers included.
 */
async function stageSection(
  builder: PlanBuilder,
  path: string,
  block: string,
): Promise<void> {
  const current = await builder.read(path);
  if (current === undefined) {
    await builder.stage(path, `${block}\n`, { format: false });
    return;
  }
  const starts = current.split(SECTION_START).length - 1;
  const ends = current.split(SECTION_END).length - 1;
  const start = current.indexOf(SECTION_START);
  const end = current.indexOf(SECTION_END);
  if (starts === 0 && ends === 0) {
    const kept = current.trimEnd();
    await builder.stage(path, `${kept}${kept ? '\n\n' : ''}${block}\n`, {
      format: false,
    });
  } else if (starts === 1 && ends === 1 && start < end) {
    await builder.stage(
      path,
      current.slice(0, start) + block + current.slice(end + SECTION_END.length),
      { format: false },
    );
  } else {
    builder.warn(
      `${path} has unbalanced ${SECTION_START} and ${SECTION_END} markers, so its Ndop section wasn't updated. Leave one pair, or none.`,
    );
  }
}

/**
 * Writes a file Ndop owns outright, unless the user changed it since Ndop
 * last wrote it; records its hash in the lockfile.
 *
 * @param builder - The plan.
 * @param lock - The lockfile being updated.
 * @param path - Project-relative path.
 * @param content - The file's text.
 */
async function stageOwned(
  builder: PlanBuilder,
  lock: NdopLock,
  path: string,
  content: string,
): Promise<void> {
  const current = await builder.read(path);
  const recorded = lock.agentFiles?.[path];
  if (
    current === undefined ||
    current === content ||
    (recorded !== undefined && sha256(current) === recorded)
  ) {
    await builder.stage(path, content, { format: false });
    lock.agentFiles = { ...lock.agentFiles, [path]: sha256(content) };
  } else {
    builder.skip(
      path,
      'It has local changes. Delete it to get the generated one back.',
    );
  }
}

/**
 * Adds the `ndop` server to an agent's MCP configuration, keeping the file's
 * other servers, comments and layout. An existing `ndop` entry is left
 * as the user set it.
 *
 * @param builder - The plan.
 * @param path - Project-relative path.
 * @param key - The property servers are listed under.
 */
async function stageMcpServer(
  builder: PlanBuilder,
  path: string,
  key: string,
): Promise<void> {
  const current = (await builder.read(path)) ?? '{}\n';
  const parsed = parseJsonc<
    Record<string, Record<string, unknown> | undefined>
  >(current, path);
  if (parsed[key]?.['ndop'] !== undefined) return;
  await builder.stage(path, insertJsonc(current, [key, 'ndop'], MCP_SERVER), {
    format: false,
  });
}

/**
 * The tokens a stylesheet's `:root` rules define: colors, and the rest.
 *
 * @param css - The Tailwind stylesheet.
 * @returns Token names without `--`, sorted.
 */
export function tokenNames(css: string): { colors: string[]; other: string[] } {
  const colors = new Set<string>();
  const other = new Set<string>();
  for (const rule of css.matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const [, name = '', value = ''] of (rule[1] ?? '').matchAll(
      /--([a-z0-9-]+)\s*:\s*([^;]+);/g,
    )) {
      (/^(oklch|oklab|rgb|hsl|lab|lch|color|#)/.test(value.trim())
        ? colors
        : other
      ).add(name);
    }
  }
  return { colors: [...colors].sort(), other: [...other].sort() };
}

/**
 * The guidance every agent file carries, as Markdown that Prettier leaves
 * unchanged.
 *
 * @param facts - The project's configuration, lockfile and tokens.
 * @param heading - The level of its subheadings.
 * @returns The lines.
 */
function guidance(facts: Facts, heading: string): string[] {
  const { config, lock, tokens } = facts;
  const prefix = aliasPrefix(config.importAlias ?? '@/');
  const docs = config.mcp
    ? 'call the `get_component` MCP tool'
    : config.registry === undefined
      ? 'read `https://ndop.dev/docs/components/<name>.md`'
      : 'read its page in your registry';
  const installed = Object.entries(lock.items)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) =>
      item.registry === '@ndop'
        ? `\`${item.name}\` ${item.version}`
        : `\`${key}\` ${item.version}`,
    );
  const folder = (alias: string) =>
    facts.aliasBase !== undefined && alias.startsWith(`${facts.aliasBase}/`)
      ? `\`${alias}\` (\`${prefix}${posix.relative(facts.aliasBase, alias)}/…\`)`
      : `\`${alias}\``;
  return [
    'This app uses [Ndop UI](https://ndop.dev): accessible Angular components installed as source files you own. The ndop CLI writes this section and refreshes it on `ndop add`; keep your own notes outside it.',
    `${heading} Workflow`,
    [
      '1. For any button, field, dialog or other control, use an installed component before writing your own markup. If one is missing, run `npx ndop add <name>`; never copy component code by hand.',
      `2. Before using a component, ${docs}. Use its selectors, inputs and nesting exactly; never guess an API.`,
      '3. Give every form field a visible label with the `label` component (`<label ndLabel>`); a placeholder or `aria-label` alone is not a label.',
      '4. Style with theme tokens (`bg-primary`, `text-muted-foreground`, `border-border`), never palette colors such as `bg-zinc-900`, and with logical utilities (`ms-`, `pe-`, `start-`, `text-start`), never `ml-`, `pr-`, `left-` or `text-left`.',
      `5. Change how a component looks in its own file under \`${config.aliases.ui}\`. Don't edit \`@ndop/primitives\` or import its private paths.`,
      '6. Run `npx ndop verify <files> --json` on the files you changed, fix every problem it reports, and repeat until it passes. If it says `@ndop/verify` is missing, install it as a dev dependency first.',
    ].join('\n'),
    `${heading} Installed`,
    installed.length
      ? `${installed.join(', ')}.`
      : 'Nothing yet; add components with `npx ndop add <name>`.',
    `Components are in ${folder(config.aliases.ui)}, helpers in ${folder(config.aliases.lib)} and blocks in ${folder(config.aliases.blocks)}.`,
    `${heading} Tokens`,
    tokens.colors.length || tokens.other.length
      ? [
          ...(tokens.colors.length
            ? [
                `Colors, as \`bg-*\`, \`text-*\` and \`border-*\` utilities: ${tokens.colors.map((name) => `\`${name}\``).join(', ')}.`,
              ]
            : []),
          ...(tokens.other.length
            ? [
                `Others: ${tokens.other.map((name) => `\`${name}\``).join(', ')}.`,
              ]
            : []),
        ].join('\n\n')
      : `The theme's tokens are in \`${config.tailwind.css}\`.`,
    `${heading} MCP server`,
    config.mcp
      ? 'The `ndop` MCP server is set up for this project: `get_project_context` describes it, `search_components` finds components, `get_component` documents one, `list_blocks` and `get_block` offer whole sections, `add_items` installs them, and `verify` checks your files.'
      : 'To let your agent search and read the Ndop docs directly, run `npx ndop init --mcp`.',
  ];
}

/**
 * The Ndop section of a shared file, markers included.
 *
 * @param facts - What it's written from.
 * @returns The section.
 */
function section(facts: Facts): string {
  return [
    SECTION_START,
    '## Ndop UI',
    ...guidance(facts, '###'),
    SECTION_END,
  ].join('\n\n');
}

/**
 * The Claude Code skill, `.claude/skills/ndop/SKILL.md`.
 *
 * @param facts - What it's written from.
 * @returns The file.
 */
function skillFile(facts: Facts): string {
  return `${[
    "---\nname: ndop\ndescription: Builds and changes this Angular app's UI with its Ndop UI components. Use when adding or editing screens, forms, dialogs, buttons or other controls, or choosing colors and spacing.\n---",
    '# Ndop UI',
    ...guidance(facts, '##'),
  ].join('\n\n')}\n`;
}

/**
 * The Cursor rule, `.cursor/rules/ndop.mdc`, applied to every request.
 *
 * @param facts - What it's written from.
 * @returns The file.
 */
function cursorRule(facts: Facts): string {
  return `${[
    "---\ndescription: How to build this app's UI with its Ndop UI components.\nalwaysApply: true\n---",
    '# Ndop UI',
    ...guidance(facts, '##'),
  ].join('\n\n')}\n`;
}
