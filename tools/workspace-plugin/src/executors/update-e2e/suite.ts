import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import {
  createProgram,
  nodeEnvironment,
  type CommandEnvironment,
  type CommandResult,
} from '@ndop/cli';
import { conflictMarkers } from '@ndop/merge';
import type { NdopLock } from '@ndop/schema';
import type { CaseRun, Expectation, FixtureCase } from './fixtures';

/** Where a suite run works and what it starts from. */
export interface SuiteContext {
  /** Workspace root. */
  workspace: string;
  /** Absolute template project, copied for every case. */
  template: string;
  /** Absolute scratch folder. */
  workDir: string;
  /** Registry URL template of each scenario, by scenario folder. */
  registries: Map<string, string>;
}

/** One `ndop update` run's exit code and JSON result. */
interface RunOutcome {
  /** Exit code. */
  exit: number;
  /** The `--json` result, when it printed one. */
  result?: CommandResult;
}

/** How one case went. */
export interface CaseOutcome {
  /** `<scenario>/<case>`. */
  id: string;
  /** Merge or behavior. */
  kind: FixtureCase['kind'];
  /**
   * For merge cases, `clean` when it merged as expected and `conflict`
   * for an expected true conflict with valid markers; for behavior cases,
   * `passed`. `failed` for anything else.
   */
  result: 'clean' | 'conflict' | 'passed' | 'failed';
  /**
   * What broke a rule that holds for every case: exit codes that don't
   * match the statuses, malformed markers, a wrong lockfile, a second
   * run that would change something. These fail the suite.
   */
  broken: string[];
  /** Where the merge differed from the hand-written expectation. */
  differences: string[];
}

/**
 * Runs one case: a fresh copy of the template, `ndop init`, `ndop add` at
 * the old version, a commit, the user's edits, then each `ndop update`
 * run, checked against the case and the rules every update must keep
 * (ADR-0010, ADR-0020).
 *
 * @param suite - Where to work.
 * @param fixture - The case.
 * @returns How it went.
 */
export async function runCase(
  suite: SuiteContext,
  fixture: FixtureCase,
): Promise<CaseOutcome> {
  const broken: string[] = [];
  const differences: string[] = [];
  const project = join(suite.workDir, 'cases', fixture.id.replace('/', '-'));
  const registry = suite.registries.get(fixture.scenarioDir) ?? '';
  await prepare(suite, project, fixture.prettier);
  const environment = caseEnvironment(project, registry, fixture.git !== false);
  const ndop = (...args: string[]) =>
    runNdop(environment, ...args, '--cwd', project);

  const setup = [
    await ndop('init', '--yes'),
    await ndop(
      'add',
      `${fixture.item}@${fixture.from}`,
      ...(fixture.add ?? []),
      '--yes',
    ),
  ];
  for (const step of setup) {
    if (step.exit !== 0) {
      return fail(fixture, [`Setup failed: ${step.err || step.out}`]);
    }
  }
  const git = fixture.git !== false;
  if (git) commitAll(project, 'install');
  for (const path of fixture.remove ?? []) {
    await rm(join(project, path), { force: true });
  }
  await overlay(join(fixture.dir, 'local'), project, fixture.crlf);
  for (const edit of fixture.replace ?? []) {
    const text = await read(project, edit.path);
    if (!text.includes(edit.find)) {
      return fail(fixture, [
        `Setup failed: ${edit.path} has no "${edit.find}"`,
      ]);
    }
    await writeFile(
      join(project, edit.path),
      text.replace(edit.find, edit.with),
    );
  }
  if (git && !fixture.dirty) commitAll(project, 'edits');

  const runs: CaseRun[] = fixture.runs ?? [
    {
      expected: 'expected',
      ...(fixture.expect ? { expect: fixture.expect } : {}),
    },
  ];
  let last: RunOutcome = { exit: 0 };
  for (const [index, run] of runs.entries()) {
    const label = runs.length > 1 ? `run ${index + 1}: ` : '';
    if (run.overlay) {
      await overlay(join(fixture.dir, run.overlay), project, fixture.crlf);
      if (git && run.commit) commitAll(project, run.overlay);
    }
    const output = await ndop(
      'update',
      `${fixture.item}@${fixture.to}`,
      '--yes',
      '--json',
      ...(run.args ?? []),
    );
    const result = parse(output.out);
    last = { exit: output.exit, ...(result ? { result } : {}) };
    const expect = run.expect ?? {};
    const problems = await check(project, fixture, run, expect, last);
    broken.push(...problems.broken.map((text) => label + text));
    differences.push(...problems.differences.map((text) => label + text));
  }

  if (last.exit !== 1) {
    broken.push(
      ...(await checkLock(suite, fixture, project, last.result)).map(
        (text) => `lockfile: ${text}`,
      ),
    );
    const again = parse(
      (
        await ndop(
          'update',
          `${fixture.item}@${fixture.to}`,
          '--dry-run',
          '--json',
        )
      ).out,
    );
    const planned = [
      ...(again?.files ?? []).map((file) => file.path),
      ...(again?.dependencies ?? []),
    ];
    if (planned.length > 0) {
      broken.push(`a second run would change ${planned.join(', ')}`);
    }
  }

  const conflicted = (last.result?.updates ?? []).some((update) =>
    update.files.some((file) => file.status === 'conflict'),
  );
  const expectConflict = runs.some((run) => run.expect?.conflict);
  const result =
    broken.length || differences.length
      ? 'failed'
      : fixture.kind === 'behavior'
        ? 'passed'
        : conflicted || expectConflict
          ? 'conflict'
          : 'clean';
  return { id: fixture.id, kind: fixture.kind, result, broken, differences };
}

/**
 * Checks one run against the case's expectations and the rules every run
 * keeps.
 *
 * @param project - The project.
 * @param fixture - The case.
 * @param run - The run.
 * @param expect - What it must do.
 * @param outcome - Its exit code and JSON result.
 * @returns Broken rules and differences from the expectation.
 */
async function check(
  project: string,
  fixture: FixtureCase,
  run: CaseRun,
  expect: Expectation,
  outcome: RunOutcome,
): Promise<{ broken: string[]; differences: string[] }> {
  const broken: string[] = [];
  const differences: string[] = [];
  const { result, exit } = outcome;
  if (!result) {
    return { broken: ['ndop update printed no JSON result'], differences };
  }
  const files = (result.updates ?? []).flatMap((update) => update.files);
  const attention = files.some((file) =>
    ['conflict', 'unresolved', 'pending'].includes(file.status),
  );
  const consistent = !result.ok ? 1 : attention ? 2 : 0;
  if (exit !== consistent) {
    broken.push(`exited ${exit}, but its result calls for ${consistent}`);
  }
  for (const file of files.filter((entry) => entry.status === 'conflict')) {
    const markers = conflictMarkers(await read(project, file.path));
    if (!markers.wellFormed || markers.count === 0) {
      broken.push(`${file.path} has malformed conflict markers`);
    }
    if (!file.conflictLines?.length) {
      broken.push(`${file.path} conflicts without conflict lines`);
    }
  }

  const wanted = expect.exit ?? (expect.conflict ? 2 : 0);
  if (exit !== wanted) differences.push(`exited ${exit}, expected ${wanted}`);
  if (
    expect.error &&
    !result.errors.some((error) => error.message.includes(expect.error ?? ''))
  ) {
    differences.push(
      `expected an error with "${expect.error}", got ${JSON.stringify(result.errors)}`,
    );
  }
  for (const [path, status] of Object.entries(expect.statuses ?? {})) {
    const actual = files.find((file) => file.path === path)?.status;
    if (actual !== status) {
      differences.push(
        `${path} is ${actual ?? 'not reported'}, expected ${status}`,
      );
    }
  }
  for (const path of expect.absent ?? []) {
    if (await exists(join(project, path))) {
      differences.push(`${path} still exists`);
    }
  }
  for (const warning of expect.warnings ?? []) {
    if (!result.warnings.some((text) => text.includes(warning))) {
      differences.push(`no warning about "${warning}"`);
    }
  }
  for (const [path, texts] of Object.entries(expect.contains ?? {})) {
    const text = await read(project, path).catch(() => '');
    for (const wanted of texts) {
      if (!text.includes(wanted)) differences.push(`${path} lacks "${wanted}"`);
    }
  }
  for (const spec of expect.dependencies ?? []) {
    if (!result.dependencies.includes(spec)) {
      differences.push(`didn't install ${spec}`);
    }
  }
  const lock = JSON.parse(await read(project, 'ndop.lock.json')) as NdopLock;
  for (const key of expect.installed ?? []) {
    if (!lock.items[key]) differences.push(`${key} isn't installed`);
  }
  if (run.expected) {
    const folder = join(fixture.dir, run.expected);
    for (const path of await listFiles(folder)) {
      const want = crlf(
        await readFile(join(folder, path), 'utf-8'),
        fixture.crlf?.includes(path),
      );
      const actual = await read(project, path).catch(() => undefined);
      if (actual !== want) {
        differences.push(
          actual === undefined
            ? `${path} is missing`
            : `${path} differs from expected/${firstDifference(want, actual)}`,
        );
      }
    }
  }
  return { broken, differences };
}

/**
 * Checks the lockfile after the last run (ADR-0010, rule 10): every
 * file's hash is the hash a fresh install of its base version gets, and
 * only files the update left pending carry their own version.
 *
 * @param suite - Where to work, for the reference installs.
 * @param fixture - The case.
 * @param project - The project.
 * @param result - The last run's result.
 * @returns What's wrong.
 */
async function checkLock(
  suite: SuiteContext,
  fixture: FixtureCase,
  project: string,
  result: CommandResult | undefined,
): Promise<string[]> {
  const problems: string[] = [];
  const lock = JSON.parse(await read(project, 'ndop.lock.json')) as NdopLock;
  const statuses = new Map(
    (result?.updates ?? []).flatMap((update) =>
      update.files.map((file) => [file.path, file.status] as const),
    ),
  );
  const entry = lock.items[`@ndop/${fixture.item}`];
  if (!entry) return [`${fixture.item} isn't in the lockfile`];
  if (entry.version !== fixture.to) {
    problems.push(`${fixture.item} is at ${entry.version}, not ${fixture.to}`);
  }
  for (const file of entry.files) {
    const status = statuses.get(file.path);
    const pending = ['conflict', 'unresolved', 'pending', 'missing'].includes(
      status ?? '',
    );
    if (file.version !== undefined && !pending && status !== undefined) {
      problems.push(
        `${file.path} keeps version ${file.version} but is ${status}`,
      );
    }
    if (file.version === undefined && pending && status !== 'missing') {
      problems.push(`${file.path} is ${status} but has no base version`);
    }
    const base = file.version ?? entry.version;
    const reference = await referenceHashes(suite, fixture, base);
    if (reference.get(file.path) !== file.sha256) {
      problems.push(
        `${file.path} hash isn't what installing ${fixture.item}@${base} gives`,
      );
    }
  }
  return problems;
}

const references = new Map<string, Promise<Map<string, string>>>();

/**
 * File hashes a fresh `ndop add <item>@<version>` records with the case's
 * Prettier config: the pristine hashes the lockfile must hold.
 *
 * @param suite - Where to work.
 * @param fixture - The case.
 * @param version - The version.
 * @returns Hashes by project path.
 */
function referenceHashes(
  suite: SuiteContext,
  fixture: FixtureCase,
  version: string,
): Promise<Map<string, string>> {
  const key = JSON.stringify([
    fixture.scenarioDir,
    fixture.item,
    version,
    fixture.prettier ?? {},
  ]);
  let cached = references.get(key);
  if (!cached) {
    cached = (async () => {
      const project = join(
        suite.workDir,
        'references',
        createHash('sha256').update(key).digest('hex').slice(0, 12),
      );
      await prepare(suite, project, fixture.prettier);
      const environment = caseEnvironment(
        project,
        suite.registries.get(fixture.scenarioDir) ?? '',
        false,
      );
      await runNdop(environment, 'init', '--yes', '--cwd', project);
      await runNdop(
        environment,
        'add',
        `${fixture.item}@${version}`,
        '--yes',
        '--cwd',
        project,
      );
      const lock = JSON.parse(
        await read(project, 'ndop.lock.json'),
      ) as NdopLock;
      return new Map(
        (lock.items[`@ndop/${fixture.item}`]?.files ?? []).map((file) => [
          file.path,
          file.sha256,
        ]),
      );
    })();
    references.set(key, cached);
  }
  return cached;
}

/**
 * The environment a case runs `ndop` in: the real one, except that
 * packages are recorded in `package.json` instead of installed, and
 * nothing is interactive.
 *
 * @param project - The project.
 * @param registry - The scenario's registry URL template.
 * @param git - Whether the project is a git repository.
 * @returns The environment.
 */
function caseEnvironment(
  project: string,
  registry: string,
  git: boolean,
): CommandEnvironment {
  // Nx runs executors as CommonJS, where import() of the project's
  // Prettier becomes require() of a URL and fails; require loads the same
  // modules.
  const real = nodeEnvironment(async (path) => require(path));
  return {
    ...real,
    installer: () => async (specs, dev) => {
      const manifest = JSON.parse(
        await read(project, 'package.json'),
      ) as Record<string, Record<string, string> | undefined>;
      const field = dev ? 'devDependencies' : 'dependencies';
      manifest[field] = { ...manifest[field] };
      for (const spec of specs) {
        const name = spec.replace(/(?<=.)@.*$/, '');
        manifest[field][name] = spec.slice(name.length + 1) || '*';
      }
      await writeFile(
        join(project, 'package.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
    },
    // The scratch folder sits in the workspace, whose repository ignores
    // it; without its own repository a case is "outside git".
    dirtyFiles: git ? real.dirtyFiles : async () => undefined,
    interactive: false,
    env: { ...process.env, NDOP_REGISTRY: registry },
  };
}

/**
 * Runs `ndop` in process.
 *
 * @param environment - Its environment.
 * @param args - Arguments.
 * @returns What it printed and its exit code.
 */
async function runNdop(
  environment: CommandEnvironment,
  ...args: string[]
): Promise<{ out: string; err: string; exit: number }> {
  let out = '';
  let err = '';
  const before = process.exitCode;
  process.exitCode = undefined;
  try {
    await createProgram('0.0.0', environment)
      .exitOverride()
      .configureOutput({
        writeOut: (text) => (out += text),
        writeErr: (text) => (err += text),
      })
      .parseAsync(args, { from: 'user' });
  } catch (error) {
    err += String(error);
    process.exitCode ??= 1;
  }
  const exit = Number(process.exitCode ?? 0);
  process.exitCode = before;
  return { out, err, exit };
}

/**
 * Copies the template into a fresh project with the case's Prettier
 * config, layered on Ndop's own.
 *
 * @param suite - Where to work.
 * @param project - The project folder.
 * @param prettier - Overrides.
 */
async function prepare(
  suite: SuiteContext,
  project: string,
  prettier: Record<string, unknown> | undefined,
): Promise<void> {
  await rm(project, { recursive: true, force: true });
  await mkdir(dirname(project), { recursive: true });
  await cp(suite.template, project, { recursive: true });
  await writeFile(
    join(project, '.prettierrc'),
    `${JSON.stringify({ singleQuote: true, ...prettier })}\n`,
  );
}

/**
 * Lays a case folder's files over the project.
 *
 * @param folder - The case folder, such as `local`.
 * @param project - The project.
 * @param crlfFiles - Files to write with CRLF line endings.
 */
async function overlay(
  folder: string,
  project: string,
  crlfFiles: readonly string[] = [],
): Promise<void> {
  for (const path of await listFiles(folder)) {
    await mkdir(dirname(join(project, path)), { recursive: true });
    await writeFile(
      join(project, path),
      crlf(
        await readFile(join(folder, path), 'utf-8'),
        crlfFiles.includes(path),
      ),
    );
  }
}

/**
 * Commits everything in the project, creating the repository first.
 *
 * @param project - The project.
 * @param message - Commit message.
 */
function commitAll(project: string, message: string): void {
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: project, stdio: 'pipe' });
  if (!existsSync(join(project, '.git'))) git('init', '--quiet');
  git('add', '-A');
  git(
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.com',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--quiet',
    '--allow-empty',
    '-m',
    message,
  );
}

/**
 * Whether a path exists.
 *
 * @param path - Absolute path.
 * @returns True when it exists.
 */
async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}

/**
 * Every file under a folder, relative to it, with POSIX separators.
 *
 * @param folder - Absolute folder.
 * @returns The files; none when the folder doesn't exist.
 */
async function listFiles(folder: string): Promise<string[]> {
  const entries = await readdir(folder, {
    recursive: true,
    withFileTypes: true,
  }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(folder, join(entry.parentPath, entry.name)).split(sep).join('/'),
    )
    .sort();
}

/**
 * Reads a project file.
 *
 * @param project - The project.
 * @param path - Project path.
 * @returns Its text.
 */
function read(project: string, path: string): Promise<string> {
  return readFile(join(project, path), 'utf-8');
}

/**
 * Converts line endings to CRLF when asked.
 *
 * @param text - LF text.
 * @param convert - Whether to.
 * @returns The text.
 */
function crlf(text: string, convert: boolean | undefined): string {
  return convert ? text.replace(/\r?\n/g, '\r\n') : text;
}

/**
 * Where two texts first differ, for the report.
 *
 * @param want - Expected text.
 * @param actual - Actual text.
 * @returns ` (line N)`.
 */
function firstDifference(want: string, actual: string): string {
  const a = want.split('\n');
  const b = actual.split('\n');
  const line = a.findIndex((text, index) => text !== b[index]);
  return ` (line ${(line === -1 ? a.length : line) + 1})`;
}

/**
 * Parses `--json` output.
 *
 * @param text - Standard output.
 * @returns The result, or `undefined`.
 */
function parse(text: string): CommandResult | undefined {
  try {
    return JSON.parse(text) as CommandResult;
  } catch {
    return undefined;
  }
}

/**
 * A case that couldn't run.
 *
 * @param fixture - The case.
 * @param broken - Why.
 * @returns Its outcome.
 */
function fail(fixture: FixtureCase, broken: string[]): CaseOutcome {
  return {
    id: fixture.id,
    kind: fixture.kind,
    result: 'failed',
    broken,
    differences: [],
  };
}
