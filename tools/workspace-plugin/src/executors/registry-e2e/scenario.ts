import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

/**
 * Package managers the install test covers (ADR-0015).
 */
export type PackageManager = 'npm' | 'pnpm' | 'bun';

/**
 * One install-test run: a package manager and the Angular CLI version that
 * creates the app.
 */
export interface InstallCase {
  /** Package manager for `ng new`, `ndop` and the build. */
  packageManager: PackageManager;
  /** Exact `@angular/cli` version for `ng new`. */
  angular: string;
}

/**
 * Short, stable name of a case, such as `pnpm-ng21`.
 *
 * @param installCase - The case.
 * @returns Its name, also used as its folder.
 */
export function caseId(installCase: InstallCase): string {
  return `${installCase.packageManager}-ng${installCase.angular.split('.')[0]}`;
}

/**
 * A command and its arguments.
 */
export type CommandLine = [command: string, args: string[]];

/**
 * How a user of each package manager runs a package's bin without
 * installing it, as `npx ndop init` does for npm.
 *
 * @param packageManager - The package manager.
 * @param spec - Package spec, such as `ndop@1.0.0`.
 * @param args - Arguments for the bin.
 * @returns The command line.
 */
export function execCommand(
  packageManager: PackageManager,
  spec: string,
  args: string[],
): CommandLine {
  switch (packageManager) {
    case 'npm':
      return ['npx', ['--yes', spec, ...args]];
    case 'pnpm':
      return ['pnpm', ['dlx', spec, ...args]];
    case 'bun':
      return ['bunx', [spec, ...args]];
  }
}

/**
 * Runs a `package.json` script with a package manager.
 *
 * @param packageManager - The package manager.
 * @param script - Script name, such as `build`.
 * @returns The command line.
 */
export function runScriptCommand(
  packageManager: PackageManager,
  script: string,
): CommandLine {
  return [packageManager, ['run', script]];
}

/**
 * Pulls the JSON result out of a command's output: package-manager runners
 * may print progress before the bin's own output.
 *
 * @param output - Standard output.
 * @returns The parsed object.
 * @throws When no JSON object is found.
 */
export function lastJsonObject(output: string): unknown {
  const start = output.search(/^\{/m);
  const end = output.lastIndexOf('}');
  if (start === -1 || end < start) {
    throw new Error(`No JSON in the output:\n${output}`);
  }
  return JSON.parse(output.slice(start, end + 1));
}

/** Folders that tools write into and the no-op check ignores. */
const IGNORED = new Set(['node_modules', 'dist', '.angular', '.git', '.ndop']);

/**
 * Hashes every file of a project except installed and built output, so a
 * second `ndop add` can be shown to have changed nothing.
 *
 * @param root - Project folder.
 * @returns SHA-256 of each file, by project-relative path.
 */
export async function hashTree(root: string): Promise<Map<string, string>> {
  const hashes = new Map<string, string>();
  const walk = async (folder: string): Promise<void> => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (IGNORED.has(entry.name)) {
        continue;
      }
      const path = join(folder, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile()) {
        hashes.set(
          relative(root, path),
          createHash('sha256')
            .update(await readFile(path))
            .digest('hex'),
        );
      }
    }
  };
  await walk(root);
  return hashes;
}

/**
 * Paths whose content differs between two {@link hashTree} results.
 *
 * @param before - Earlier hashes.
 * @param after - Later hashes.
 * @returns Added, removed or changed paths, sorted.
 */
export function changedPaths(
  before: ReadonlyMap<string, string>,
  after: ReadonlyMap<string, string>,
): string[] {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();
}

/**
 * Where and how {@link run} runs a command.
 */
export interface RunOptions {
  /** Working folder. */
  cwd: string;
  /** Environment variables. */
  env: NodeJS.ProcessEnv;
  /** Log file the output is appended to. */
  log: string;
  /** Resolve with the output even on a non-zero exit, as for `ndop verify`. */
  allowFailure?: boolean;
}

/**
 * Runs a command, appending its output to a log file.
 *
 * @param commandLine - Command and arguments.
 * @param options - Where and how to run it.
 * @returns Its standard output.
 * @throws When it exits with a non-zero code, unless `allowFailure` is
 *   set, with the end of its output.
 */
export function run(
  commandLine: CommandLine,
  options: RunOptions,
): Promise<string> {
  const [command, args] = commandLine;
  return new Promise((resolve, reject) => {
    const log = createWriteStream(options.log, { flags: 'a' });
    log.write(`\n$ ${command} ${args.join(' ')}\n`);
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let tail = '';
    const record = (chunk: Buffer, isStdout: boolean) => {
      const text = chunk.toString();
      if (isStdout) {
        stdout += text;
      }
      tail = (tail + text).slice(-4000);
      log.write(text);
    };
    child.stdout.on('data', (chunk: Buffer) => record(chunk, true));
    child.stderr.on('data', (chunk: Buffer) => record(chunk, false));
    child.on('error', (error) => {
      log.end();
      reject(error);
    });
    child.on('close', (code) => {
      log.end();
      if (code === 0 || options.allowFailure) {
        resolve(stdout);
      } else {
        reject(
          new Error(
            `${command} ${args.join(' ')} exited with ${code}:\n${tail}`,
          ),
        );
      }
    });
  });
}

/** What the install test writes to `AGENTS.md` before `ndop init`. */
export const TEAM_NOTE = '# Team notes\n\nKeep components small.\n';

/**
 * Checks the agent context files `ndop init --agent claude-code --mcp` and
 * `ndop add` wrote (ADR-0017): the team's own note in `AGENTS.md` survived
 * above one Ndop section, which lists the added item; `CLAUDE.md` carries
 * the same section; the skill exists; and `.mcp.json` registers the server.
 *
 * @param files - The files' text, by project-relative path.
 * @param item - The item `ndop add` installed.
 * @returns What's wrong; empty when all is well.
 */
export function agentFileProblems(
  files: Readonly<Record<string, string | undefined>>,
  item: string,
): string[] {
  const problems: string[] = [];
  const agents = files['AGENTS.md'] ?? '';
  if (!agents.startsWith(`${TEAM_NOTE}\n<!-- ndop:start -->`)) {
    problems.push(
      "AGENTS.md doesn't keep the team's note above the Ndop section",
    );
  }
  if (agents.split('<!-- ndop:start -->').length !== 2) {
    problems.push("AGENTS.md doesn't have exactly one Ndop section");
  }
  if (!agents.includes(`\`${item}\``)) {
    problems.push(`AGENTS.md doesn't list ${item}`);
  }
  const section = agents.slice(agents.indexOf('<!-- ndop:start -->'));
  if (files['CLAUDE.md'] !== section) {
    problems.push("CLAUDE.md doesn't carry the same section as AGENTS.md");
  }
  if (!files['.claude/skills/ndop/SKILL.md']?.startsWith('---\nname: ndop\n')) {
    problems.push('.claude/skills/ndop/SKILL.md is missing');
  }
  const mcp = JSON.parse(files['.mcp.json'] ?? '{}') as {
    mcpServers?: Record<string, { args?: string[] }>;
  };
  if (!mcp.mcpServers?.['ndop']?.args?.includes('@ndop/mcp')) {
    problems.push(".mcp.json doesn't register the ndop server");
  }
  return problems;
}

/**
 * The command that adds a dev dependency with a package manager.
 *
 * @param packageManager - npm, pnpm or bun.
 * @param spec - Package, with a version.
 * @returns Command and arguments.
 */
export function addDevCommand(
  packageManager: PackageManager,
  spec: string,
): CommandLine {
  if (packageManager === 'npm') return ['npm', ['install', '--save-dev', spec]];
  if (packageManager === 'pnpm') {
    // Same reason as ndop's own installer: unapproved build scripts from
    // ng new would otherwise fail the add.
    return ['pnpm', ['add', '-D', spec, '--config.strict-dep-builds=false']];
  }
  return ['bun', ['add', '-d', spec]];
}

/** A page that uses Dialog correctly, which `ndop verify` must pass. */
export const GOOD_PAGE = `import { Component } from '@angular/core';
import {
  DialogContent,
  DialogTitle,
  NdDialog,
  NdDialogPortal,
  NdDialogTrigger,
} from '@/ui/dialog/dialog';

@Component({
  selector: 'app-good',
  imports: [NdDialog, NdDialogTrigger, NdDialogPortal, DialogContent, DialogTitle],
  template: \`
    <h1>Account</h1>
    <ng-container ndDialog>
      <button type="button" ndDialogTrigger>Delete account</button>
      <ng-template ndDialogPortal>
        <div ndDialogContent><h2 ndDialogTitle>Delete your account?</h2></div>
      </ng-template>
    </ng-container>
  \`,
})
export class Good {}
`;

/**
 * A page with a made-up selector and an icon-only button, which
 * `ndop verify` must report through its usage, lint and axe checks.
 */
export const BAD_PAGE = `import { Component } from '@angular/core';

@Component({
  selector: 'app-bad',
  template: \`
    <div ndDialogBody>Hello</div>
    <button type="button"><svg width="16" height="16"></svg></button>
  \`,
})
export class Bad {}
`;

/** Rules `ndop verify` must report for {@link BAD_PAGE}. */
export const BAD_PAGE_RULES = [
  'usage/unknown-selector',
  'ndop/icon-button-name',
  'axe/button-name',
];

/** The parts of `ndop verify --json`'s output the test reads. */
export interface VerifyJson {
  /** Whether no error was found. */
  ok: boolean;
  /** Each problem's rule and message. */
  problems: { rule: string; message: string }[];
}

/**
 * What's wrong with `ndop verify`'s results for the two pages.
 *
 * @param good - The JSON result for {@link GOOD_PAGE}.
 * @param bad - The JSON result for {@link BAD_PAGE}.
 * @returns What's wrong; empty when both are as expected.
 */
export function verifyProblems(good: VerifyJson, bad: VerifyJson): string[] {
  const problems: string[] = [];
  if (!good.ok) {
    problems.push(
      `ndop verify failed a correct page: ${good.problems.map((problem) => `${problem.rule}: ${problem.message}`).join('; ')}`,
    );
  }
  const found = new Set(bad.problems.map((problem) => problem.rule));
  const missing = BAD_PAGE_RULES.filter((rule) => !found.has(rule));
  if (bad.ok || missing.length) {
    problems.push(
      `ndop verify missed ${missing.join(', ') || 'every problem'} on the broken page`,
    );
  }
  return problems;
}
