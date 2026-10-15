import { posix } from 'node:path';
import type { NdopConfig, NdopLock } from '@ndop/schema';
import { insertJsonc, parseJsonc } from '../edit/json';
import { isColorValue } from '../edit/stylesheet';
import { CliError } from '../errors';
import { sha256, type PlanBuilder } from '../plan/plan';
import { CLI_PACKAGE, cliCommand } from '../run-command';
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

/** How each agent is named in prompts and in the agent files. */
export const AGENT_LABELS: Record<Agent, string> = {
  'claude-code': 'Claude Code',
  cursor: 'Cursor',
  copilot: 'GitHub Copilot',
};

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

/**
 * What reveals that a project already uses an agent. A `.vscode` folder
 * alone isn't a sign of Copilot: `ng new` creates one in every app.
 */
const SIGNS: Record<Agent, string[]> = {
  'claude-code': ['CLAUDE.md', '.claude'],
  cursor: ['.cursor', '.cursorrules'],
  copilot: [
    '.github/copilot-instructions.md',
    '.github/instructions',
    '.vscode/mcp.json',
  ],
};

/**
 * Something that can tell whether a path exists: the project file system.
 */
interface ExistsReader {
  exists(path: string): Promise<boolean>;
}

/**
 * The agents a project already uses, from their files (ADR-0017,
 * amendment 1): `CLAUDE.md` or `.claude/` for Claude Code, `.cursor/` for
 * Cursor, and `.github/copilot-instructions.md`, `.github/instructions/`
 * or `.vscode/mcp.json` for Copilot.
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
 * `ndop` server in each agent's MCP configuration. Only the files of an
 * agent the server is registered for tell it to use the MCP tools;
 * `AGENTS.md`, which any agent may read, points to `ndop list` and
 * `ndop view` (amendment 1). Shared files are staged
 * unformatted, since formatting would also change the user's text. The
 * content comes from the lockfile, the stylesheet and `package.json`, so
 * it's always true for the project: its commands run the project's own
 * `ndop` when `@ndop/cli` is a dependency, or will be once the plan is
 * applied, and `npx @ndop/cli` otherwise (ADR-0031).
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
    cli: cliCommand(await builder.dependsOn(CLI_PACKAGE)),
  };

  for (const file of FILES) {
    if (file.agent && !agents.includes(file.agent)) continue;
    const reader: Reader = file.agent
      ? { agent: file.agent, mcp: Boolean(config.mcp) }
      : {
          mcpAgents: config.mcp
            ? AGENTS.filter((agent) => agents.includes(agent))
            : [],
        };
    if (file.kind === 'section') {
      await stageSection(builder, file.path, section(facts, reader));
    } else {
      const content =
        file.kind === 'skill'
          ? skillFile(facts, reader)
          : cursorRule(facts, reader);
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

/**
 * Who reads a file: one agent, and whether the MCP server is registered
 * for it; or any agent, as `AGENTS.md`, with the agents it's registered
 * for.
 */
type Reader = { agent: Agent; mcp: boolean } | { mcpAgents: Agent[] };

/** What the generated guidance is written from. */
interface Facts {
  config: NdopConfig;
  aliasBase: string | undefined;
  lock: NdopLock;
  tokens: ThemeTokens;
  /** How to run the CLI in this project, such as `npx ndop`. */
  cli: string;
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

/** A theme's token names, grouped as the agent files list them. */
export interface ThemeTokens {
  /** Color tokens, without `--`, such as `primary`. */
  colors: string[];
  /** Font utilities the theme defines, such as `font-sans`. */
  fonts: string[];
  /** Every other token, without `--`, such as `radius`. */
  other: string[];
}

/**
 * The tokens a stylesheet defines: its `:root` rules' variables, split into
 * colors and the rest, and the `--font-*` variables of its `@theme`
 * blocks, which Tailwind turns into `font-*` utilities.
 *
 * @param css - The Tailwind stylesheet.
 * @returns Token names, sorted.
 */
export function tokenNames(css: string): ThemeTokens {
  const colors = new Set<string>();
  const fonts = new Set<string>();
  const other = new Set<string>();
  for (const rule of css.matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const [, name = '', value = ''] of (rule[1] ?? '').matchAll(
      /--([a-z0-9-]+)\s*:\s*([^;]+);/g,
    )) {
      (isColorValue(value) ? colors : other).add(name);
    }
  }
  for (const rule of css.matchAll(/@theme\b[^{]*\{([^}]*)\}/g)) {
    for (const [, name = ''] of (rule[1] ?? '').matchAll(
      /--(font-[a-z0-9-]+)\s*:/g,
    )) {
      fonts.add(name);
    }
  }
  return {
    colors: [...colors].sort(),
    fonts: [...fonts].sort(),
    other: [...other].sort(),
  };
}

/**
 * The guidance every agent file carries, as Markdown that Prettier leaves
 * unchanged (ADR-0017, amendment 1). Its search and read steps name the
 * MCP tools only for an agent the server is registered for, and
 * `ndop list` and `ndop view` otherwise.
 *
 * @param facts - The project's configuration, lockfile and tokens.
 * @param reader - Who reads the file.
 * @param heading - The level of its subheadings.
 * @returns The lines.
 */
function guidance(facts: Facts, reader: Reader, heading: string): string[] {
  const { config, lock, tokens, cli } = facts;
  const prefix = aliasPrefix(config.importAlias ?? '@/');
  const mcp = 'agent' in reader && reader.mcp;
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
  const code = (names: string[]) =>
    names.map((name) => `\`${name}\``).join(', ');
  const tokenLines = [
    ...(tokens.colors.length
      ? [
          `Colors, as \`bg-*\`, \`text-*\` and \`border-*\` utilities or \`var(--name)\`: ${code(tokens.colors)}.`,
        ]
      : []),
    ...(tokens.fonts.length ? [`Fonts: ${code(tokens.fonts)}.`] : []),
    ...(tokens.other.length ? [`Others: ${code(tokens.other)}.`] : []),
  ];
  const mcpAgents = 'mcpAgents' in reader ? reader.mcpAgents : [];
  return [
    'This app uses [Ndop UI](https://ndop.dev): accessible Angular components installed as source files you own. The ndop CLI writes this section and refreshes it on `ndop add`; keep your own notes outside it.',
    `${heading} Workflow`,
    [
      mcp
        ? '1. Build UI from the registry. Before writing any component, layout or screen, look for it with the `search_components` and `list_blocks` MCP tools (blocks are whole screens) and install what fits with `add_items`. Never hand-build or copy what the registry has.'
        : `1. Build UI from the registry. Before writing any component, layout or screen, look for it in \`${cli} list\` (every component, and blocks for whole screens) and install what fits with \`${cli} add <names> --yes\`. Never hand-build or copy what the registry has.`,
      mcp
        ? `2. Before using an item, read it with the \`get_component\` or \`get_block\` MCP tool (if the tools are unavailable, \`${cli} list\` and \`${cli} view <name>\` do the same). Use its selectors, inputs and nesting exactly; never guess an API.`
        : `2. Before using an item, read it with \`${cli} view <name>\`. Use its selectors, inputs and nesting exactly; never guess an API.`,
      '3. Give every form field a visible label with the `label` component (`<label ndLabel>`); a placeholder or `aria-label` alone is not a label.',
      '4. Take every color, radius and font from the theme tokens below, in templates, stylesheets and inline styles alike; never write color values or define CSS variables of your own. Use logical utilities (`ms-`, `pe-`, `start-`, `text-start`), not `ml-`, `pr-`, `left-` or `text-left`.',
      `5. Change how a component looks in its own file under \`${config.aliases.ui}\`. Don't edit \`@ndop/primitives\` or import its private paths.`,
      `6. Run \`${cli} verify <files> --json\` on the files you changed, fix every problem it reports, and repeat until it passes. If it says \`@ndop/verify\` is missing, install it as a dev dependency first.`,
      `7. When styles, icons or a build fail in a way that points at the setup (missing tokens, providers, packages or aliases), run \`${cli} doctor --json\`; \`${cli} doctor --fix --yes\` applies its safe fixes.`,
    ].join('\n'),
    `${heading} Installed`,
    installed.length
      ? `${installed.join(', ')}.`
      : `Nothing yet; add components with \`${cli} add <names> --yes\`.`,
    `Components are in ${folder(config.aliases.ui)}, helpers in ${folder(config.aliases.lib)} and blocks in ${folder(config.aliases.blocks)}.`,
    `${heading} Tokens`,
    tokenLines.length
      ? tokenLines.join('\n\n')
      : `The theme's tokens are in \`${config.tailwind.css}\`.`,
    ...(mcp
      ? []
      : [
          `${heading} MCP server`,
          mcpAgents.length
            ? `The \`ndop\` MCP server is registered for ${listed(mcpAgents.map((agent) => AGENT_LABELS[agent]))}. If you have its tools, they can replace \`ndop list\` and \`ndop view\`.`
            : `To let your agent search and read the registry through the \`ndop\` MCP server, run \`${cli} init --mcp\`.`,
        ]),
  ];
}

/**
 * Joins names as a sentence lists them: `a, b and c`.
 *
 * @param names - At least one name.
 * @returns The list.
 */
function listed(names: readonly string[]): string {
  return names.length > 1
    ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
    : (names[0] ?? '');
}

/**
 * The Ndop section of a shared file, markers included.
 *
 * @param facts - What it's written from.
 * @param reader - Who reads the file.
 * @returns The section.
 */
function section(facts: Facts, reader: Reader): string {
  return [
    SECTION_START,
    '## Ndop UI',
    ...guidance(facts, reader, '###'),
    SECTION_END,
  ].join('\n\n');
}

/**
 * The Claude Code skill, `.claude/skills/ndop/SKILL.md`.
 *
 * @param facts - What it's written from.
 * @param reader - Claude Code.
 * @returns The file.
 */
function skillFile(facts: Facts, reader: Reader): string {
  return `${[
    "---\nname: ndop\ndescription: Builds and changes this Angular app's UI from the Ndop UI registry. Use when adding or editing any screen, layout, form or control, or choosing colors, fonts and spacing.\n---",
    '# Ndop UI',
    ...guidance(facts, reader, '##'),
  ].join('\n\n')}\n`;
}

/**
 * The Cursor rule, `.cursor/rules/ndop.mdc`, applied to every request.
 *
 * @param facts - What it's written from.
 * @param reader - Cursor.
 * @returns The file.
 */
function cursorRule(facts: Facts, reader: Reader): string {
  return `${[
    "---\ndescription: How to build this app's UI with its Ndop UI components.\nalwaysApply: true\n---",
    '# Ndop UI',
    ...guidance(facts, reader, '##'),
  ].join('\n\n')}\n`;
}
