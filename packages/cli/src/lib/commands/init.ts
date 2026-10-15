import type { Command } from 'commander';
import {
  AGENT_LABELS,
  AGENTS,
  parseAgents,
  type Agent,
} from '../install/agents';
import { planInit } from '../install/init';
import type { CommandEnvironment } from './environment';
import { runWriteCommand, type WriteOptions } from './run';

/**
 * Options `ndop init` accepts.
 */
interface InitCommandOptions extends WriteOptions {
  theme: string;
  project?: string;
  agent: string[];
  mcp?: boolean;
  verify?: boolean;
  cli: boolean;
}

/**
 * Registers `ndop init`: sets an Angular app up for Ndop UI (RFC-0001,
 * ADR-0011). It writes `ndop.json`, adds the `@/` path alias, sets up
 * Tailwind v4 if needed, imports `@ndop/core/styles.css`, installs the
 * theme, `utils` and `icons` items, registers `provideNdop()` and
 * `provideIcons()`, writes the agent context files (ADR-0017), with the
 * MCP server registered when asked, and adds `@ndop/cli` as a dev
 * dependency at the running version, so later commands run the project's
 * own `ndop` (`npx ndop add dialog`); `--no-cli` skips it (ADR-0031).
 * Running it again changes nothing.
 *
 * @param program - The root `ndop` program.
 * @param environment - Injected outside world.
 * @returns The program, for chaining.
 *
 * @example
 * ```sh
 * npx @ndop/cli init --yes
 * npx @ndop/cli init --dry-run --json
 * npx @ndop/cli init --agent claude-code --mcp
 * npx @ndop/cli init --no-cli
 * ```
 */
export function registerInitCommand(
  program: Command,
  environment: CommandEnvironment,
): Command {
  withWriteOptions(
    program
      .command('init')
      .description('Set up an Angular app for Ndop UI.')
      .option(
        '--theme <name>',
        'theme to install: a name, @namespace/name or the URL of its JSON',
        'default',
      )
      .option(
        '--project <name>',
        'Angular project, when angular.json has several',
      )
      .option(
        '--agent <names>',
        `agents to write context files for: ${AGENTS.join(', ')} or none; repeatable or comma-separated`,
        (value: string, previous: string[]) => [...previous, value],
        [],
      )
      .option('--mcp', "register the Ndop MCP server in the agents' settings")
      .option('--verify', 'add @ndop/verify, which ndop verify runs')
      .option(
        '--no-cli',
        "don't add @ndop/cli as a dev dependency; run it with npx @ndop/cli",
      ),
  ).action(async function (this: Command, options: InitCommandOptions) {
    const version = program.version();
    const ask =
      environment.interactive && !options.yes && !options.json
        ? {
            chooseAgents: async (detected: Agent[]) =>
              (await environment.multiselect(
                'Write Ndop guidance for which coding agents? AGENTS.md is always written.',
                AGENTS.map((agent) => ({
                  value: agent,
                  label: AGENT_LABELS[agent],
                })),
                detected,
              )) ?? detected,
            chooseVerify: () =>
              environment.confirm(
                'Add @ndop/verify, so agents can check their work with ndop verify? It installs a linter and a browser driver.',
                true,
              ),
            chooseMcp: (agents: Agent[]) =>
              environment.confirm(
                `Register the Ndop MCP server for ${agents.map((agent) => AGENT_LABELS[agent]).join(', ')}?`,
                false,
              ),
          }
        : {};
    await runWriteCommand(
      this,
      'init',
      options,
      environment,
      async ({ builder, client }) => {
        const { items } = await planInit(builder, client, {
          theme: options.theme,
          ...(options.project ? { project: options.project } : {}),
          ...(options.registry ? { registry: options.registry } : {}),
          ...(options.agent.length
            ? { agents: parseAgents(options.agent) }
            : {}),
          ...(options.mcp ? { mcp: true } : {}),
          ...(options.verify ? { verify: true } : {}),
          cli: options.cli,
          ...(version ? { cliVersion: version } : {}),
          ...ask,
        });
        return items;
      },
    );
  });
  return program;
}

/**
 * Adds the options every write command takes.
 *
 * @param command - A write command.
 * @returns The same command.
 */
export function withWriteOptions(command: Command): Command {
  return command
    .option('--cwd <path>', 'project root', '.')
    .option('--registry <url>', 'registry URL template containing {name}')
    .option('--dry-run', 'print the changes as diffs, write nothing')
    .option('--json', 'print one JSON result and nothing else')
    .option('-y, --yes', 'apply without asking');
}
