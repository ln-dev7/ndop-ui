import { posix } from 'node:path';
import type { NdopConfig, NdopLock, RegistryItem } from '@ndop/schema';
import { COLOR_TOKENS } from '@ndop/schema/theme';
import { applyCssVars, definedTokens, isColorValue } from '../edit/stylesheet';
import { importSpecifiers, providerCalls } from '../edit/typescript';
import { CliError } from '../errors';
import { planAgentFiles } from '../install/agents';
import {
  detectProject,
  MIN_ANGULAR_MAJOR,
  planAliasPath,
  planProviders,
  type Detection,
  type NDOP_PROVIDERS,
} from '../install/init';
import { angularPeers } from '../install/items';
import {
  aliasPrefix,
  readAliasBase,
  readConfig,
  readLock,
} from '../install/project-files';
import { dependencyName, PlanBuilder } from '../plan/plan';
import type { Formatter } from '../project/format';
import { CLI_PACKAGE, cliDependency } from '../run-command';
import {
  itemKey,
  lockedRef,
  parseRequest,
  type RegistryClient,
} from '../registry/client';
import { compareVersions, satisfies } from '../registry/version';
import { localState } from '../update/diff';

/**
 * The Node versions the CLI runs on: its `engines.node` (ADR-0011). A test
 * keeps the two equal.
 */
export const NODE_ENGINES = '>=22.12.0';

/** Newest Angular major Ndop supports (RFC-0001: current and previous). */
export const MAX_ANGULAR_MAJOR = 22;

/** How a check came out. */
export type CheckStatus = 'ok' | 'warning' | 'error';

/** What `ndop doctor` checks, in the order it reports them (ADR-0024). */
export const CHECKS = [
  ['node', 'Node'],
  ['angular', 'Angular'],
  ['packages', 'Packages'],
  ['config', 'ndop.json'],
  ['aliases', 'Aliases'],
  ['tailwind', 'Tailwind'],
  ['tokens', 'Tokens'],
  ['providers', 'Providers'],
  ['lockfile', 'Lockfile'],
  ['zoneless-ssr', 'Zoneless, SSR'],
  ['agent-files', 'Agent files'],
] as const;

/** A check's identifier, such as `tokens`. */
export type CheckId = (typeof CHECKS)[number][0];

/** One check's outcome, as `ndop doctor --json` prints it. */
export interface DoctorCheck {
  /** Stable identifier, such as `tokens`. */
  id: CheckId;
  /** Its name in the report, such as `Tokens`. */
  title: string;
  /** The worst thing it found. */
  status: CheckStatus;
  /** What it found, in one sentence. */
  message: string;
  /** Each problem, such as a file or a package, when there are several. */
  details?: string[];
  /** What to do about it, when something can be done. */
  fix?: string;
  /** Whether `ndop doctor --fix` applies that fix. */
  fixable: boolean;
}

/**
 * A check's outcome with the edit that fixes it, staged on a plan.
 */
export interface Finding extends DoctorCheck {
  /** Stages the safe fix, when the check has one. */
  apply?: (builder: PlanBuilder) => Promise<void>;
}

/** What {@link diagnose} needs. */
export interface DiagnoseInput {
  /**
   * Reads the project. When fixing, it's the plan the fixes are staged
   * on.
   */
  builder: PlanBuilder;
  /** The project's formatter, for planning agent files. */
  format: Formatter;
  /** Registry client; `undefined` skips the network checks (`--offline`). */
  client: RegistryClient | undefined;
  /** Angular project, when `angular.json` has several. */
  project?: string;
  /** The running Node version. */
  nodeVersion: string;
  /**
   * The running CLI's version, which the fix pins a missing `@ndop/cli`
   * to; the latest when it's unknown.
   */
  cliVersion?: string;
}

/** Everything the checks share, read once. */
interface Facts {
  input: DiagnoseInput;
  builder: PlanBuilder;
  manifest: Manifest;
  config: NdopConfig | undefined;
  configError: string | undefined;
  lock: NdopLock | undefined;
  lockError: string | undefined;
  detection: Detection | undefined;
  detectionError: string | undefined;
  files: InstalledFile[];
  /** Each locked item at its installed version, or why it couldn't load. */
  locked: Map<string, RegistryItem | Error>;
}

/** The parts of `package.json` the checks read. */
interface Manifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/** A file an installed item wrote, as it is on disk now. */
interface InstalledFile {
  /** Lockfile key of its item. */
  key: string;
  /** How reports name its item. */
  item: string;
  /** Its lockfile entry. */
  entry: NdopLock['items'][string]['files'][number];
  /** Its text, or `undefined` when it's gone. */
  text: string | undefined;
}

/**
 * Runs every `ndop doctor` check (ADR-0024) against a project, reading
 * through a plan builder and never writing. Each finding carries the safe
 * fix, when the check has one, for `--fix` to stage on the same builder.
 *
 * @param input - The project, registry and Node version.
 * @returns One finding per check, in {@link CHECKS} order.
 */
export async function diagnose(input: DiagnoseInput): Promise<Finding[]> {
  const facts = await gather(input);
  return [
    checkNode(facts),
    checkAngular(facts),
    await checkPackages(facts),
    checkConfig(facts),
    await checkAliases(facts),
    await checkTailwind(facts),
    await checkTokens(facts),
    await checkProviders(facts),
    await checkLockfile(facts),
    checkZonelessSsr(facts),
    await checkAgentFiles(facts),
  ];
}

/**
 * Strips a finding down to what's reported.
 *
 * @param finding - A finding.
 * @returns The check, without its fix function.
 */
export function reportedCheck(finding: Finding): DoctorCheck {
  return {
    id: finding.id,
    title: finding.title,
    status: finding.status,
    message: finding.message,
    ...(finding.details ? { details: finding.details } : {}),
    ...(finding.fix ? { fix: finding.fix } : {}),
    fixable: finding.fixable,
  };
}

/**
 * Reads what several checks share.
 *
 * @param input - Diagnose input.
 * @returns The facts.
 */
async function gather(input: DiagnoseInput): Promise<Facts> {
  const { builder } = input;
  const facts: Facts = {
    input,
    builder,
    manifest: {},
    config: undefined,
    configError: undefined,
    lock: undefined,
    lockError: undefined,
    detection: undefined,
    detectionError: undefined,
    files: [],
    locked: new Map(),
  };
  try {
    facts.manifest = JSON.parse(
      (await builder.read('package.json')) ?? '{}',
    ) as Manifest;
  } catch {
    // The Angular check reports an unreadable package.json.
  }
  facts.config = await expected(
    () => readConfig(builder),
    (message) => {
      facts.configError = message;
    },
  );
  facts.lock = await expected(
    () => readLock(builder),
    (message) => {
      facts.lockError = message;
    },
  );
  facts.detection = await expected(
    () =>
      detectProject(builder, input.project ? { project: input.project } : {}),
    (message) => {
      facts.detectionError = message;
    },
  );
  for (const [key, item] of Object.entries(facts.lock?.items ?? {})) {
    for (const entry of item.files) {
      facts.files.push({
        key,
        item: itemLabel(key, item),
        entry,
        text: await builder.read(entry.path),
      });
    }
  }
  if (input.client && facts.lock) {
    const client = input.client;
    await Promise.all(
      Object.entries(facts.lock.items).map(async ([key, item]) => {
        try {
          facts.locked.set(
            key,
            await client.get({ ...lockedRef(item), version: item.version }),
          );
        } catch (error) {
          if (!(error instanceof CliError)) throw error;
          facts.locked.set(key, error);
        }
      }),
    );
  }
  return facts;
}

/**
 * Runs a read that fails with a {@link CliError} when the project is
 * wrong, turning that error into a message.
 *
 * @param read - The read.
 * @param failed - Receives the error's message.
 * @returns What it read, or `undefined` when it failed.
 */
async function expected<T>(
  read: () => Promise<T>,
  failed: (message: string) => void,
): Promise<T | undefined> {
  try {
    return await read();
  } catch (error) {
    if (!(error instanceof CliError)) throw error;
    failed(error.message);
    return undefined;
  }
}

/**
 * How reports name an installed item: its bare name for Ndop's own
 * items, its lockfile key otherwise.
 *
 * @param key - Its lockfile key.
 * @param item - Its lockfile entry.
 * @returns The name.
 */
function itemLabel(key: string, item: NdopLock['items'][string]): string {
  return item.registry === '@ndop' ? item.name : key;
}

/**
 * Builds a finding.
 *
 * @param id - Which check.
 * @param status - Its outcome.
 * @param message - What it found.
 * @param extra - Details, fix text and fix.
 * @returns The finding.
 */
function finding(
  id: CheckId,
  status: CheckStatus,
  message: string,
  extra: Pick<Finding, 'details' | 'fix' | 'apply'> = {},
): Finding {
  const title = CHECKS.find(([check]) => check === id)?.[1] ?? id;
  return {
    id,
    title,
    status,
    message,
    ...(extra.details?.length ? { details: extra.details } : {}),
    ...(extra.fix ? { fix: extra.fix } : {}),
    fixable: extra.apply !== undefined,
    ...(extra.apply ? { apply: extra.apply } : {}),
  };
}

/**
 * A check that can't run because something it reads is broken, which
 * another check reports as an error.
 *
 * @param id - Which check.
 * @param reason - What's missing, such as `ndop.json is missing`.
 * @returns A warning saying so.
 */
function notChecked(id: CheckId, reason: string): Finding {
  return finding(id, 'warning', `Not checked: ${reason}.`);
}

/**
 * Why checks that need `ndop.json` can't run, if they can't.
 *
 * @param facts - Shared facts.
 * @returns The reason, or `undefined` when `ndop.json` is fine.
 */
function configProblem(facts: Facts): string | undefined {
  return facts.config
    ? undefined
    : facts.configError
      ? 'ndop.json is invalid'
      : 'ndop.json is missing';
}

/**
 * A count with its noun.
 *
 * @param total - How many.
 * @param noun - Singular noun.
 * @returns Such as `1 error` or `2 errors`.
 */
function count(total: number, noun: string): string {
  return `${total} ${noun}${total === 1 ? '' : 's'}`;
}

/**
 * The worst status among problems.
 *
 * @param errors - Error count.
 * @param warnings - Warning count.
 * @returns The status.
 */
function worst(errors: number, warnings: number): CheckStatus {
  return errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'ok';
}

/**
 * Node: the running version is within the CLI's `engines` range.
 *
 * @param facts - Shared facts.
 * @returns The finding.
 */
function checkNode(facts: Facts): Finding {
  const version = facts.input.nodeVersion;
  return satisfies(version, NODE_ENGINES) === false
    ? finding(
        'node',
        'error',
        `Node ${version} is older than the CLI needs (${NODE_ENGINES}).`,
        { fix: 'Install Node 22.12 or later.' },
      )
    : finding('node', 'ok', `${version}, within ${NODE_ENGINES}.`);
}

/**
 * Angular: a supported major, bootstrapped standalone, as `ndop init`
 * detects it.
 *
 * @param facts - Shared facts.
 * @returns The finding.
 */
function checkAngular(facts: Facts): Finding {
  const { detection } = facts;
  if (!detection) {
    return finding('angular', 'error', facts.detectionError ?? 'Not found.');
  }
  const major = Number(/\d+/.exec(detection.angularVersion)?.[0]);
  if (major > MAX_ANGULAR_MAJOR) {
    return finding(
      'angular',
      'error',
      `Angular ${detection.angularVersion} isn't supported yet; Ndop supports Angular ${MIN_ANGULAR_MAJOR} and ${MAX_ANGULAR_MAJOR}.`,
    );
  }
  return finding('angular', 'ok', `${detection.angularVersion}, standalone.`);
}

/** A package installed items need. */
interface Requirement {
  /** What to install: `name` or `name@range`. */
  spec: string;
  /** The range, when one is known. */
  range: string | undefined;
  /** Whether it's a dev dependency. */
  dev: boolean;
  /** Items that need it. */
  by: Set<string>;
}

/**
 * Packages: everything installed items need is in `package.json`, within
 * its range when installed, the CDK and forms match Angular's minor, and
 * `@ndop/cli` is a dependency, as `ndop init` adds it (ADR-0031).
 * Offline, what items need is read from their files' imports, without
 * ranges.
 *
 * @param facts - Shared facts.
 * @returns The finding.
 */
async function checkPackages(facts: Facts): Promise<Finding> {
  if (!facts.lock) return notChecked('packages', 'ndop.lock.json is invalid');
  const requirements = new Map<string, Requirement>();
  const need = (spec: string, dev: boolean, by: string) => {
    const name = dependencyName(spec);
    const range = spec.length > name.length ? spec.slice(name.length + 1) : '';
    const existing = requirements.get(name);
    if (existing) {
      existing.by.add(by);
      if (!existing.range && range) {
        Object.assign(existing, { spec, range });
      }
    } else {
      requirements.set(name, {
        spec,
        range: range || undefined,
        dev,
        by: new Set([by]),
      });
    }
  };

  const prefix = aliasPrefix(facts.config?.importAlias ?? '@/');
  for (const file of facts.files) {
    if (file.text === undefined || !file.entry.path.endsWith('.ts')) continue;
    for (const specifier of importSpecifiers(file.text)) {
      if (/^(\.|\/|node:)/.test(specifier) || specifier.startsWith(prefix)) {
        continue;
      }
      need(packageOf(specifier), false, file.item);
    }
  }
  for (const [key, item] of facts.locked) {
    if (item instanceof Error) continue;
    const entry = facts.lock.items[key];
    const label = entry ? itemLabel(key, entry) : key;
    for (const spec of item.dependencies ?? []) need(spec, false, label);
    for (const spec of item.devDependencies ?? []) need(spec, true, label);
  }
  if (requirements.has('@ndop/primitives')) {
    for (const spec of await angularPeers(facts.builder)) {
      need(spec, false, '@ndop/primitives');
    }
  }

  const declared = declaredRanges(facts.manifest);
  const errors: string[] = [];
  const warnings: string[] = [];
  const installs: { spec: string; dev: boolean; replace: boolean }[] = [];
  for (const [name, requirement] of [...requirements].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const by = [...requirement.by].sort().join(', ');
    if (!declared.has(name)) {
      errors.push(`${name} is missing (needed by ${by}).`);
      installs.push({
        spec: requirement.spec,
        dev: requirement.dev,
        replace: false,
      });
      continue;
    }
    const version = await installedVersion(facts.builder, name);
    if (
      requirement.range &&
      version &&
      satisfies(version, requirement.range) === false
    ) {
      errors.push(
        `${name} ${version} is outside ${requirement.range} (needed by ${by}).`,
      );
      installs.push({
        spec: requirement.spec,
        dev: isDev(facts.manifest, name),
        replace: true,
      });
    }
  }

  const core = minorOf(
    (await installedVersion(facts.builder, '@angular/core')) ??
      declared.get('@angular/core'),
  );
  for (const name of ['@angular/cdk', '@angular/forms']) {
    if (!core || !declared.has(name)) continue;
    const minor = minorOf(
      (await installedVersion(facts.builder, name)) ?? declared.get(name),
    );
    if (minor && minor !== core) {
      warnings.push(`${name} is at ${minor}, and @angular/core at ${core}.`);
      installs.push({
        spec: `${name}@~${core}.0`,
        dev: isDev(facts.manifest, name),
        replace: true,
      });
    }
  }
  const angularWarnings = warnings.length;

  // A warning, not an error: nothing breaks without it, and `init --no-cli`
  // leaves it out on purpose. ndop.json doesn't record that choice, so the
  // warning can't tell the two apart (ADR-0031, amendment 1).
  if (!declared.has(CLI_PACKAGE)) {
    warnings.push(
      `${CLI_PACKAGE} isn't a dev dependency, so the project has no ndop of its own, pinned by the lockfile.`,
    );
    installs.push({
      spec: cliDependency(facts.input.cliVersion),
      dev: true,
      replace: false,
    });
  }

  const status = worst(errors.length, warnings.length);
  if (status === 'ok') {
    return finding(
      'packages',
      'ok',
      'Every package installed items need is in package.json.',
    );
  }
  return finding(
    'packages',
    status,
    errors.length
      ? 'Installed items need packages that are missing or out of range.'
      : angularWarnings
        ? 'Angular packages are at different minor versions.'
        : `${CLI_PACKAGE} isn't a dev dependency.`,
    {
      details: [...errors, ...warnings],
      fix: 'ndop doctor --fix installs the missing or matching versions.',
      apply: async (builder) => {
        for (const install of installs) {
          builder.depend([install.spec], install.dev, install.replace);
        }
      },
    },
  );
}

/**
 * The package an import specifier loads.
 *
 * @param specifier - Such as `@angular/cdk/a11y` or `clsx`.
 * @returns Such as `@angular/cdk` or `clsx`.
 */
function packageOf(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : (parts[0] ?? specifier);
}

/**
 * The ranges `package.json` declares, from every dependency field.
 *
 * @param manifest - `package.json`.
 * @returns Ranges by package name.
 */
function declaredRanges(manifest: Manifest): Map<string, string> {
  return new Map(
    [
      manifest.peerDependencies,
      manifest.devDependencies,
      manifest.dependencies,
    ].flatMap((field) => Object.entries(field ?? {})),
  );
}

/**
 * Whether `package.json` lists a package as a dev dependency.
 *
 * @param manifest - `package.json`.
 * @param name - Package name.
 * @returns True when it's only in `devDependencies`.
 */
function isDev(manifest: Manifest, name: string): boolean {
  return (
    manifest.devDependencies?.[name] !== undefined &&
    manifest.dependencies?.[name] === undefined
  );
}

/**
 * The version of a package in the project's `node_modules`.
 *
 * @param builder - Project reader.
 * @param name - Package name.
 * @returns Its version, or `undefined` when it isn't installed.
 */
async function installedVersion(
  builder: PlanBuilder,
  name: string,
): Promise<string | undefined> {
  const text = await builder.read(`node_modules/${name}/package.json`);
  if (!text) return undefined;
  try {
    return (JSON.parse(text) as { version?: string }).version;
  } catch {
    return undefined;
  }
}

/**
 * The major and minor version in a version or range.
 *
 * @param text - Such as `22.2.1` or `^22.2.0`.
 * @returns Such as `22.2`, or `undefined` for ranges like `*`.
 */
function minorOf(text: string | undefined): string | undefined {
  const match = /(\d+)\.(\d+)/.exec(text ?? '');
  return match ? `${match[1]}.${match[2]}` : undefined;
}

/**
 * ndop.json: present and valid.
 *
 * @param facts - Shared facts.
 * @returns The finding.
 */
function checkConfig(facts: Facts): Finding {
  if (facts.config) return finding('config', 'ok', 'Valid.');
  return facts.configError
    ? finding('config', 'error', facts.configError, {
        fix: 'Correct it, or delete it and run ndop init.',
      })
    : finding('config', 'error', 'No ndop.json here.', {
        fix: 'Run ndop init.',
      });
}

/**
 * Aliases: the import alias resolves through `tsconfig.json` paths, and
 * the alias folders can exist.
 *
 * @param facts - Shared facts.
 * @returns The finding.
 */
async function checkAliases(facts: Facts): Promise<Finding> {
  const problem = configProblem(facts);
  if (problem || !facts.config) return notChecked('aliases', problem ?? '');
  const config = facts.config;
  const { fs } = facts.builder;
  const prefix = aliasPrefix(config.importAlias ?? '@/');
  const errors: string[] = [];
  let apply: Finding['apply'];
  const base = await readAliasBase(facts.builder, prefix);
  if (base === undefined) {
    errors.push(
      `${prefix}* isn't in compilerOptions.paths of tsconfig.json, so imports through it don't resolve.`,
    );
    if ((await facts.builder.read('tsconfig.json')) !== undefined) {
      apply = async (builder) => {
        await planAliasPath(builder, config);
      };
    }
  } else if (base !== '.' && !(await fs.exists(base))) {
    errors.push(`${prefix}* points at ${base}, which doesn't exist.`);
  }
  for (const alias of ['ui', 'lib', 'blocks'] as const) {
    const folder = config.aliases[alias];
    const parent = posix.dirname(folder);
    // Alias folders are created as items are added; their parent must be
    // there.
    if (
      !(await fs.exists(folder)) &&
      parent !== '.' &&
      !(await fs.exists(parent))
    ) {
      errors.push(
        `aliases.${alias} is ${folder}, and ${parent} doesn't exist.`,
      );
    }
  }
  if (errors.length === 0) {
    return finding(
      'aliases',
      'ok',
      `${prefix}* points at ${base}; the alias folders are in place.`,
    );
  }
  return finding(
    'aliases',
    'error',
    errors.length === 1
      ? (errors[0] ?? '')
      : 'The aliases have several problems.',
    {
      ...(errors.length > 1 ? { details: errors } : {}),
      fix: apply
        ? `ndop doctor --fix adds "${prefix}*" to tsconfig.json; point any other alias at an existing folder in ndop.json.`
        : 'Point the aliases in ndop.json and the paths in tsconfig.json at existing folders.',
      ...(apply ? { apply } : {}),
    },
  );
}

/**
 * Tailwind: v4 installed, loaded through PostCSS, and imported by the
 * stylesheet `ndop.json` names.
 *
 * @param facts - Shared facts.
 * @returns The finding.
 */
async function checkTailwind(facts: Facts): Promise<Finding> {
  const errors: string[] = [];
  const version =
    (await installedVersion(facts.builder, 'tailwindcss')) ??
    declaredRanges(facts.manifest).get('tailwindcss');
  const major = /\d+/.exec(version ?? '')?.[0];
  if (version === undefined) {
    errors.push("tailwindcss isn't in package.json.");
  } else if (major !== undefined && major !== '4') {
    errors.push(`Tailwind ${version} is installed; Ndop needs v4.`);
  }
  const postcss =
    (await facts.builder.read('.postcssrc.json')) ??
    (await facts.builder.read('postcss.config.json')) ??
    '';
  if (!postcss.includes('@tailwindcss/postcss')) {
    errors.push("The PostCSS configuration doesn't load @tailwindcss/postcss.");
  }
  if (facts.config) {
    const stylesheet = facts.config.tailwind.css;
    const css = await facts.builder.read(stylesheet);
    if (css === undefined) {
      errors.push(`${stylesheet}, ndop.json's tailwind.css, doesn't exist.`);
    } else if (!/@import\s+['"]tailwindcss['"]/.test(css)) {
      errors.push(`${stylesheet} doesn't import tailwindcss.`);
    }
  }
  if (errors.length === 0) {
    return finding(
      'tailwind',
      'ok',
      `${version} through PostCSS${facts.config ? `, imported by ${facts.config.tailwind.css}` : ''}.`,
    );
  }
  return finding(
    'tailwind',
    'error',
    errors.length === 1
      ? (errors[0] ?? '')
      : 'The Tailwind setup has several problems.',
    {
      ...(errors.length > 1 ? { details: errors } : {}),
      fix: 'Run ndop init, which sets Tailwind v4 up.',
    },
  );
}

/**
 * Finds the color tokens a text uses: as Tailwind color utilities, such
 * as `bg-primary` or `hover:text-muted-foreground/80`, or as
 * `var(--primary)`.
 */
const TOKEN_USE = new RegExp(
  `(?<![\\w-])(?:(?:bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|divide|placeholder|caret|accent|shadow|decoration|inset-ring|inset-shadow)-|var\\(--(?:color-)?)(${[
    ...COLOR_TOKENS,
  ]
    .sort((a, b) => b.length - a.length)
    .join('|')})(?![\\w-])`,
  'g',
);

/**
 * Tokens: every theme color an installed item uses is defined for light
 * and dark, and every color token defined is one of the theme's.
 *
 * @param facts - Shared facts.
 * @returns The finding.
 */
async function checkTokens(facts: Facts): Promise<Finding> {
  const problem = configProblem(facts);
  if (problem || !facts.config) return notChecked('tokens', problem ?? '');
  const stylesheet = facts.config.tailwind.css;
  const css = await facts.builder.read(stylesheet);
  if (css === undefined) {
    return notChecked('tokens', `${stylesheet} doesn't exist`);
  }
  const defined = definedTokens(css);
  const used = new Map<string, Set<string>>();
  for (const file of facts.files) {
    for (const [, token = ''] of (file.text ?? '').matchAll(TOKEN_USE)) {
      used.set(token, (used.get(token) ?? new Set()).add(file.item));
    }
  }

  const theme = await themeItem(facts);
  const missing = { light: [] as string[], dark: [] as string[] };
  const errors: string[] = [];
  for (const [token, items] of [...used].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const modes = (['light', 'dark'] as const).filter(
      (mode) => defined[mode][token] === undefined,
    );
    for (const mode of modes) missing[mode].push(token);
    if (modes.length) {
      errors.push(
        `--${token} isn't defined in ${modes.map((mode) => (mode === 'light' ? ':root' : '.dark')).join(' or ')} (used by ${[...items].sort().join(', ')}).`,
      );
    }
  }

  const known = new Set<string>([
    ...COLOR_TOKENS,
    ...Object.keys(theme?.cssVars?.light ?? {}),
    ...Object.keys(theme?.cssVars?.dark ?? {}),
  ]);
  const extra = [
    ...new Set(
      (['light', 'dark'] as const).flatMap((mode) =>
        Object.entries(defined[mode])
          .filter(([name, value]) => isColorValue(value) && !known.has(name))
          .map(([name]) => name),
      ),
    ),
  ].sort();
  const warnings = extra.map(
    (name) => `--${name} isn't one of the theme's tokens.`,
  );

  const status = worst(errors.length, warnings.length);
  if (status === 'ok') {
    return finding(
      'tokens',
      'ok',
      used.size
        ? `Every theme color installed items use is defined in ${stylesheet}.`
        : 'No installed item uses theme colors yet.',
    );
  }
  const fill = {
    light: pick(theme?.cssVars?.light, missing.light),
    dark: pick(theme?.cssVars?.dark, missing.dark),
  };
  const fillable =
    Object.keys(fill.light).length + Object.keys(fill.dark).length > 0;
  return finding(
    'tokens',
    status,
    errors.length
      ? "Installed items use theme colors that aren't defined."
      : `Some color tokens in ${stylesheet} aren't the theme's.`,
    {
      details: [...errors, ...warnings],
      ...(errors.length
        ? {
            fix: fillable
              ? `ndop doctor --fix adds them from the ${facts.config.style} theme.`
              : facts.input.client
                ? `Define them in ${stylesheet}.`
                : `Run ndop doctor --fix without --offline to add them from the ${facts.config.style} theme.`,
          }
        : {
            fix: 'Remove them, or ignore this if you added them on purpose.',
          }),
      ...(fillable
        ? {
            apply: async (builder: PlanBuilder) => {
              const current = await builder.read(stylesheet);
              if (current !== undefined) {
                await builder.stage(stylesheet, applyCssVars(current, fill));
              }
            },
          }
        : {}),
    },
  );
}

/**
 * Picks some values of a record.
 *
 * @param values - The record.
 * @param names - Keys to keep.
 * @returns The values for the keys it has.
 */
function pick(
  values: Record<string, string> | undefined,
  names: readonly string[],
): Record<string, string> {
  return Object.fromEntries(
    names.flatMap((name) =>
      values?.[name] === undefined ? [] : [[name, values[name]]],
    ),
  );
}

/**
 * The project's theme item, from `ndop.json`'s `style`, at its installed
 * version when the lockfile has it.
 *
 * @param facts - Shared facts.
 * @returns The item, or `undefined` offline or when it can't be fetched.
 */
async function themeItem(facts: Facts): Promise<RegistryItem | undefined> {
  if (!facts.config || !facts.input.client) return undefined;
  try {
    const { ref } = parseRequest(facts.config.style);
    const key = itemKey(ref);
    const locked = facts.locked.get(key);
    if (locked && !(locked instanceof Error)) return locked;
    return await facts.input.client.get(ref);
  } catch (error) {
    if (!(error instanceof CliError)) throw error;
    return undefined;
  }
}

/**
 * Providers: `provideNdop()` in the app config, and an icon resolver when
 * an installed item draws icons.
 *
 * @param facts - Shared facts.
 * @returns The finding.
 */
async function checkProviders(facts: Facts): Promise<Finding> {
  const problem =
    configProblem(facts) ??
    (facts.detection ? undefined : "the Angular app couldn't be read");
  if (problem || !facts.config || !facts.detection) {
    return notChecked('providers', problem ?? '');
  }
  const config = facts.config;
  const appConfig = facts.detection.appConfig;
  const calls = providerCalls(
    appConfig,
    (await facts.builder.read(appConfig)) ?? '',
  );
  if (calls === undefined) {
    return finding(
      'providers',
      'error',
      `Couldn't find the providers array in ${appConfig}.`,
      {
        fix: `Register provideNdop() from @ndop/core in ${appConfig} by hand.`,
      },
    );
  }
  const usesIcons = facts.files.some((file) =>
    /\bndIcon\b|\bNdIcon\b/.test(file.text ?? ''),
  );
  const iconsFile = posix.join(config.aliases.lib, 'icons.ts');
  const hasIconsFile = (await facts.builder.read(iconsFile)) !== undefined;
  const add: (typeof NDOP_PROVIDERS)[number][] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!calls.includes('provideNdop')) {
    errors.push(`provideNdop() isn't in the providers of ${appConfig}.`);
    add.push('provideNdop');
  }
  if (
    usesIcons &&
    !calls.some(
      (name) => name === 'provideIcons' || name === 'provideNdopIcons',
    )
  ) {
    warnings.push(
      `Installed items draw icons, and ${appConfig} provides none.`,
    );
    if (hasIconsFile) add.push('provideIcons');
  }
  const status = worst(errors.length, warnings.length);
  if (status === 'ok') {
    return finding(
      'providers',
      'ok',
      `${appConfig} provides Ndop${usesIcons ? ' and its icons' : ''}.`,
    );
  }
  const problems = [...errors, ...warnings];
  return finding(
    'providers',
    status,
    problems.length === 1 ? (problems[0] ?? '') : 'Providers are missing.',
    {
      ...(problems.length > 1 ? { details: problems } : {}),
      fix:
        warnings.length && !hasIconsFile
          ? 'Run ndop add icons, then ndop doctor --fix to register the providers.'
          : `ndop doctor --fix adds ${add.map((name) => `${name}()`).join(' and ')} to ${appConfig}, as ndop init does.`,
      ...(add.length
        ? {
            apply: async (builder: PlanBuilder) => {
              const aliasBase = await readAliasBase(
                builder,
                config.importAlias ?? '@/',
              );
              await planProviders(
                builder,
                { config, aliasBase },
                appConfig,
                add,
              );
            },
          }
        : {}),
    },
  );
}

/**
 * Lockfile: no conflict markers, no locked file missing unless the user
 * deleted it on purpose (ADR-0010); edited files and, online, items behind
 * the registry are reported.
 *
 * @param facts - Shared facts.
 * @returns The finding.
 */
async function checkLockfile(facts: Facts): Promise<Finding> {
  if (!facts.lock) {
    return finding('lockfile', 'error', facts.lockError ?? 'Unreadable.', {
      fix: 'Restore it from version control.',
    });
  }
  const lock = facts.lock;
  const errors: string[] = [];
  const warnings: string[] = [];
  const fixes = new Set<string>();
  for (const file of facts.files) {
    const state = localState(file.text, file.entry.sha256);
    if (state === 'conflicted') {
      errors.push(`${file.entry.path} has conflict markers.`);
      fixes.add(
        'Resolve the conflict markers, then run ndop update --continue.',
      );
    } else if (state === 'missing' && file.entry.version === undefined) {
      errors.push(`${file.entry.path} is missing (from ${file.item}).`);
      fixes.add('Restore missing files with ndop add <item> --overwrite.');
    } else if (state === 'edited') {
      warnings.push(`${file.entry.path} was edited since it was installed.`);
    }
  }

  const client = facts.input.client;
  if (client) {
    const behind = await Promise.all(
      Object.entries(lock.items).map(async ([key, item]) => {
        const label = itemLabel(key, item);
        try {
          const latest = await client.get(lockedRef(item));
          const newer = item.source
            ? latest.version !== item.version
            : compareVersions(latest.version, item.version) > 0;
          return newer
            ? `${label} ${item.version} is behind the registry's ${latest.version}.`
            : undefined;
        } catch (error) {
          if (!(error instanceof CliError)) throw error;
          return `Couldn't check ${label} for updates: ${error.message}`;
        }
      }),
    );
    const found = behind.filter((line): line is string => Boolean(line));
    if (found.length) {
      warnings.push(...found);
      fixes.add('See what changed with ndop diff, then run ndop update.');
    }
  }

  const status = worst(errors.length, warnings.length);
  const offline = client ? '' : ' Updates not checked offline.';
  if (status === 'ok') {
    return finding(
      'lockfile',
      'ok',
      `${count(Object.keys(lock.items).length, 'item')} installed, files as recorded.${offline}`,
    );
  }
  return finding(
    'lockfile',
    status,
    `${errors.length ? count(errors.length, 'error') : count(warnings.length, 'note')} about installed items.${offline}`,
    {
      details: [...errors, ...warnings],
      ...(fixes.size ? { fix: [...fixes].join(' ') } : {}),
    },
  );
}

/**
 * Zoneless, SSR: no installed item opts out of a mode the app uses. It
 * needs each item's registry entry, so it isn't checked offline.
 *
 * @param facts - Shared facts.
 * @returns The finding.
 */
function checkZonelessSsr(facts: Facts): Finding {
  const { detection, lock } = facts;
  if (!detection) {
    return notChecked('zoneless-ssr', "the Angular app couldn't be read");
  }
  if (!lock) return notChecked('zoneless-ssr', 'ndop.lock.json is invalid');
  const modes = `${detection.zoneless ? 'Zoneless' : 'Zone.js'}${detection.ssr ? ' with SSR' : ''}`;
  if (!facts.input.client) {
    return finding(
      'zoneless-ssr',
      'ok',
      `${modes}; items not checked offline.`,
    );
  }
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const [key, item] of facts.locked) {
    const entry = lock.items[key];
    const label = entry ? itemLabel(key, entry) : key;
    if (item instanceof Error) {
      warnings.push(`Couldn't fetch ${label}: ${item.message}`);
      continue;
    }
    if (detection.zoneless && item.angular?.zoneless === false) {
      errors.push(`${label} needs zone.js, and this app is zoneless.`);
    }
    if (detection.ssr && item.angular?.ssr === false) {
      errors.push(
        `${label} doesn't support SSR, and this app renders on the server.`,
      );
    }
  }
  const status = worst(errors.length, warnings.length);
  if (status === 'ok') {
    return finding(
      'zoneless-ssr',
      'ok',
      `${modes}; every installed item supports it.`,
    );
  }
  return finding(
    'zoneless-ssr',
    status,
    errors.length
      ? "Some installed items don't support how this app runs."
      : "Some installed items couldn't be checked.",
    {
      details: [...errors, ...warnings],
      ...(errors.length
        ? { fix: 'Remove those items, or change how the app runs.' }
        : {}),
    },
  );
}

/**
 * Agent files: the agent context files say what the lockfile says, as
 * `ndop add` would write them (ADR-0017).
 *
 * @param facts - Shared facts.
 * @returns The finding.
 */
async function checkAgentFiles(facts: Facts): Promise<Finding> {
  const problem = configProblem(facts);
  if (problem || !facts.config) return notChecked('agent-files', problem ?? '');
  const config = facts.config;
  if (config.agents === undefined || config.agents === false) {
    return finding('agent-files', 'ok', 'No agent files are set up.');
  }
  const scratch = new PlanBuilder(facts.builder.fs, facts.input.format);
  try {
    await refreshAgentFiles(scratch);
  } catch (error) {
    if (!(error instanceof CliError)) throw error;
    return notChecked('agent-files', error.message.replace(/\.$/, ''));
  }
  const stale = (await scratch.finish()).files
    .map((file) => file.path)
    .filter((path) => path !== 'ndop.lock.json');
  if (stale.length === 0) {
    return finding('agent-files', 'ok', 'Up to date with the lockfile.');
  }
  return finding(
    'agent-files',
    'warning',
    'Agent files are out of date with the lockfile.',
    {
      details: stale,
      fix: 'ndop doctor --fix refreshes them, as ndop add does.',
      apply: refreshAgentFiles,
    },
  );
}

/**
 * Refreshes the agent context files from the project as staged so far, as
 * `ndop add` does after installing (ADR-0017). `--fix` runs it after every
 * other fix, since those can change what the files say, such as the
 * tokens; when the files are up to date it stages nothing.
 *
 * @param builder - The plan.
 */
export async function refreshAgentFiles(builder: PlanBuilder): Promise<void> {
  const config = await readConfig(builder);
  if (!config) return;
  await planAgentFiles(
    builder,
    config,
    await readAliasBase(builder, config.importAlias ?? '@/'),
  );
}
