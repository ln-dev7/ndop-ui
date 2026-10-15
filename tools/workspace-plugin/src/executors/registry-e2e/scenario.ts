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
  /**
   * Also install `button@0.1.0`, edit it, run `ndop update` and build
   * again (ADR-0020).
   */
  update?: boolean;
  /**
   * Also install every component, example and block in the registry and
   * build the app (RFC-0001's definition of done; ADR-0022).
   */
  all?: boolean;
  /**
   * Install the item through the pinned shadcn CLI from the registry's
   * shadcn-compatible output instead of `ndop`, and build (ADR-0025).
   */
  shadcn?: boolean;
  /**
   * Instead of the main scenario, after `ndop init`: build
   * `tools/registry-template`, serve it behind a bearer token and install
   * `@sample/widget` from it (ADR-0025).
   */
  registries?: boolean;
}

/** The item types the `all` step installs. */
const INSTALLABLE = new Set([
  'registry:ui',
  'registry:primitive-usage',
  'registry:block',
]);

/** The part of a built registry's `r/index.json` the `all` step reads. */
export interface RegistryIndex {
  /** Every item, by name and type. */
  items: { name: string; type: string }[];
}

/**
 * The names of every component, example and block in a built registry's
 * index, for the `all` step.
 *
 * @param index - `r/index.json`.
 * @returns Item names, in index order.
 */
export function installableItems(index: RegistryIndex): string[] {
  return index.items
    .filter((item) => INSTALLABLE.has(item.type))
    .map((item) => item.name);
}

/** The parts of `ndop update --json` the real-app update case reads. */
export interface UpdateJson {
  /** Whether it succeeded. */
  ok?: boolean;
  /** What happened to each item's files. */
  updates?: {
    name: string;
    from: string;
    to: string;
    files: { path: string; status: string }[];
  }[];
}

/** The Button edit the real-app update case makes and keeps. */
export const BUTTON_EDIT = {
  path: 'src/app/ui/button/button.ts',
  find: "'border bg-background shadow-xs hover:bg-accent",
  replace: "'border-2 bg-background shadow-xs hover:bg-accent",
};

/**
 * What's wrong with a real-app `ndop update button` run: it must merge the
 * user's edit with upstream's changes, cleanly, and move the item on.
 *
 * @param result - Its `--json` output.
 * @param merged - The Button file afterwards.
 * @returns Problems; none when it worked.
 */
export function updateProblems(result: UpdateJson, merged: string): string[] {
  const problems: string[] = [];
  const button = result.updates?.find((update) => update.name === 'button');
  if (!result.ok || !button) {
    problems.push(
      `ndop update didn't update button: ${JSON.stringify(result)}`,
    );
    return problems;
  }
  if (button.from !== '0.1.0' || button.to === '0.1.0') {
    problems.push(`button went from ${button.from} to ${button.to}`);
  }
  const status = button.files.find(
    (file) => file.path === BUTTON_EDIT.path,
  )?.status;
  if (status !== 'merged') problems.push(`button.ts was ${status}, not merged`);
  if (!merged.includes(BUTTON_EDIT.replace)) {
    problems.push("the update lost the user's edit");
  }
  if (merged.includes('Styles from shadcn/ui')) {
    problems.push("the update didn't apply upstream's changes");
  }
  return problems;
}

/** The parts of `ndop list --json` the install test reads. */
export interface ListJson {
  /** Whether it succeeded. */
  ok?: boolean;
  /** The items listed. */
  items?: { name: string; type: string; version: string; installed?: string }[];
}

/**
 * What's wrong with `ndop list --json` in an app that just added an item:
 * it must list the registry's components, and that item as installed at
 * its latest version.
 *
 * @param result - Its `--json` output.
 * @param item - The item added.
 * @returns Problems; none when it worked.
 */
export function listProblems(result: ListJson, item: string): string[] {
  const items = result.items ?? [];
  if (!result.ok || !items.some((entry) => entry.type === 'registry:ui')) {
    return [`ndop list listed no components: ${JSON.stringify(result)}`];
  }
  const found = items.find((entry) => entry.name === item);
  if (!found) return [`ndop list didn't list ${item}`];
  return found.installed === found.version
    ? []
    : [
        `ndop list shows ${item} installed at ${found.installed ?? 'no version'}, not ${found.version}`,
      ];
}

/**
 * Short, stable name of a case, such as `pnpm-ng21`, or `npm-ng22-shadcn`
 * and `npm-ng22-registries` for the shadcn-compat and registries cases.
 *
 * @param installCase - The case.
 * @returns Its name, also used as its folder.
 */
export function caseId(installCase: InstallCase): string {
  const id = `${installCase.packageManager}-ng${installCase.angular.split('.')[0]}`;
  if (installCase.shadcn) return `${id}-shadcn`;
  return installCase.registries ? `${id}-registries` : id;
}

/**
 * A command and its arguments.
 */
export type CommandLine = [command: string, args: string[]];

/**
 * How a user of each package manager runs a package's bin without
 * installing it, as `npx @ndop/cli init` does for npm.
 *
 * @param packageManager - The package manager.
 * @param spec - Package spec, such as `@ndop/cli@1.0.0`.
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
 * How users run the app's own `ndop` once `ndop init` added `@ndop/cli` as
 * a dev dependency (ADR-0031): `npx ndop`, which runs the bin in
 * `node_modules/.bin` in npm, pnpm and bun projects alike. No `--yes`:
 * were the bin missing, npx would fetch an `ndop` package instead, and no
 * registry has one at the test's version.
 *
 * @param args - Arguments for `ndop`.
 * @returns The command line.
 */
export function localCommand(args: string[]): CommandLine {
  return ['npx', ['ndop', ...args]];
}

/** The part of an app's `package.json` {@link localCliProblems} reads. */
export interface AppManifest {
  /** Its dev dependencies, by name. */
  devDependencies?: Record<string, string>;
}

/**
 * What's wrong with the CLI `ndop init` installed: `package.json` must
 * list `@ndop/cli` as a dev dependency at the version under test, exactly
 * or with npm's `^`, and `npx ndop --version` must run that version, from
 * the app's own `node_modules`.
 *
 * @param manifest - The app's `package.json`.
 * @param version - Version the `@ndop/*` packages were published under.
 * @param printed - What `npx ndop --version` printed.
 * @returns Problems; none when it worked.
 */
export function localCliProblems(
  manifest: AppManifest,
  version: string,
  printed: string,
): string[] {
  const problems: string[] = [];
  const declared = manifest.devDependencies?.['@ndop/cli'];
  // npm saves even an exact spec with its `^` save-prefix; pnpm and bun
  // keep a prerelease exact. The lockfile pins it either way.
  if (declared !== version && declared !== `^${version}`) {
    problems.push(
      `package.json has @ndop/cli ${declared ?? 'nowhere in devDependencies'}, not ${version}`,
    );
  }
  if (printed.trim().split('\n').at(-1) !== version) {
    problems.push(
      `npx ndop --version printed ${JSON.stringify(printed.trim())}, not ${version}`,
    );
  }
  return problems;
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
 * `ndop add` wrote (ADR-0017 and its amendment 1): the team's own note in
 * `AGENTS.md` survived above one Ndop section, which lists the added item,
 * runs the app's own `ndop` (ADR-0031) and, since any agent may read it,
 * searches with `ndop list` instead of the MCP tools; `CLAUDE.md`, whose
 * agent the server is registered for, lists the item and sends Claude Code
 * to the MCP tools; the skill exists; and `.mcp.json` registers the server.
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
  if (!agents.includes('`npx ndop add <names> --yes`')) {
    problems.push("AGENTS.md doesn't run the app's own ndop");
  }
  if (!agents.includes('`npx ndop list`') || agents.includes('MCP tool')) {
    problems.push("AGENTS.md doesn't search with ndop list");
  }
  const claude = files['CLAUDE.md'] ?? '';
  if (
    !claude.startsWith('<!-- ndop:start -->') ||
    !claude.includes(`\`${item}\``) ||
    !claude.includes('`search_components` and `list_blocks` MCP tools')
  ) {
    problems.push(
      "CLAUDE.md doesn't list the item and send Claude Code to the MCP tools",
    );
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
  Dialog,
  DialogPortal,
  DialogTrigger,
} from '@/ui/dialog/dialog';

@Component({
  selector: 'app-good',
  imports: [Dialog, DialogTrigger, DialogPortal, DialogContent, DialogTitle],
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
