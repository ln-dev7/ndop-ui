import { posix } from 'node:path';
import { schemas, type NdopConfig } from '@ndop/schema';
import { parseJsonc, setJsonc } from '../edit/json';
import { ensureImports } from '../edit/stylesheet';
import { addProviders } from '../edit/typescript';
import { CliError } from '../errors';
import type { PlanBuilder } from '../plan/plan';
import {
  assertThemes,
  DEFAULT_NAMESPACE,
  parseRequest,
  resolveItems,
  type RegistryClient,
  type ResolvedItem,
} from '../registry/client';
import { cliDependency } from '../run-command';
import { detectAgents, planAgentFiles, type Agent } from './agents';
import { planItems } from './items';
import {
  aliasPrefix,
  CONFIG_FILE,
  projectSpecifier,
  readAliasBase,
  readConfig,
  type InstallContext,
} from './project-files';

/** Oldest Angular major Ndop supports (RFC-0001: current and previous). */
export const MIN_ANGULAR_MAJOR = 21;

/** Items `ndop init` installs besides the theme (ADR-0011). */
const BASE_ITEMS = ['utils', 'icons'];

/**
 * What `ndop init` found in the project.
 */
export interface Detection {
  /** Installed `@angular/core` version, or the declared range. */
  angularVersion: string;
  /** Name of the Angular project in `angular.json`. */
  project: string;
  /** Its source root, such as `src`. */
  sourceRoot: string;
  /** Path of the standalone `app.config.ts`. */
  appConfig: string;
  /** Path of the global stylesheet. */
  stylesheet: string;
  /** Whether the app runs without zone.js. */
  zoneless: boolean;
  /** Whether the app renders on the server. */
  ssr: boolean;
  /** Whether Tailwind v4 is already set up through PostCSS. */
  tailwind: boolean;
  /** Folder the `@/` alias already points at, if it exists. */
  aliasBase: string | undefined;
}

/**
 * Options for {@link planInit}.
 */
export interface InitOptions {
  /**
   * Theme item to install: a name, `@namespace/name` or a URL, optionally
   * after `theme:` (ADR-0023).
   */
  theme: string;
  /** Angular project to set up, when `angular.json` has several. */
  project?: string;
  /** Registry URL template to record in `ndop.json`. */
  registry?: string;
  /** Agents from `--agent`, or `false` for `--agent none`. */
  agents?: Agent[] | false;
  /** Whether `--mcp` was passed. */
  mcp?: boolean;
  /**
   * Asks which agents to write files for, when neither `--agent` nor
   * `ndop.json` says; the detected ones are used without it.
   */
  chooseAgents?: (detected: Agent[]) => Promise<Agent[] | false>;
  /**
   * Asks whether to register the MCP server, when neither `--mcp` nor
   * `ndop.json` says; it isn't registered without it.
   */
  chooseMcp?: (agents: Agent[]) => Promise<boolean>;
  /** Whether `--verify` was passed: add `@ndop/verify` as a dev dependency. */
  verify?: boolean;
  /**
   * Asks whether to add `@ndop/verify`, when `--verify` isn't passed and
   * agents are set up; it isn't added without it.
   */
  chooseVerify?: () => Promise<boolean>;
  /**
   * Whether to add `@ndop/cli` as a dev dependency, so the project runs
   * its own, lockfile-pinned `ndop` (ADR-0031, amendment 1); `--no-cli`
   * turns it off. On by default.
   */
  cli?: boolean;
  /**
   * The running CLI's version, which the added `@ndop/cli` is pinned to;
   * the latest is added when it's unknown.
   */
  cliVersion?: string;
}

/**
 * Shape of the parts of `angular.json` init reads.
 */
interface AngularJson {
  projects?: Record<
    string,
    {
      projectType?: string;
      sourceRoot?: string;
      root?: string;
      architect?: Record<string, { options?: Record<string, unknown> }>;
    }
  >;
}

/**
 * Detects how an Angular workspace is set up (RFC-0001, `ndop init`): the
 * Angular version, standalone bootstrap, zoneless change detection, SSR,
 * Tailwind v4 and an existing `@/` path alias.
 *
 * @param builder - Plan builder, used as a project reader.
 * @param options - Which project to read.
 * @returns What was found.
 * @throws {@link CliError} for anything init can't support: no
 *   `angular.json`, Angular older than 21, an NgModule app, or a
 *   non-CSS global stylesheet.
 */
export async function detectProject(
  builder: PlanBuilder,
  options: Pick<InitOptions, 'project'> = {},
): Promise<Detection> {
  const angularText = await builder.read('angular.json');
  if (angularText === undefined) {
    throw new CliError(
      'No angular.json here. Run ndop init in an Angular workspace, or pass --cwd.',
    );
  }
  const workspace = parseJsonc<AngularJson>(angularText, 'angular.json');
  const applications = Object.entries(workspace.projects ?? {}).filter(
    ([, project]) => project.projectType === 'application',
  );
  const chosen = options.project
    ? applications.find(([name]) => name === options.project)
    : applications.length === 1
      ? applications[0]
      : undefined;
  if (!chosen) {
    throw new CliError(
      options.project
        ? `angular.json has no application named "${options.project}".`
        : `angular.json has ${applications.length} applications; pick one with --project.`,
      'angular.json',
    );
  }
  const [name, project] = chosen;
  const sourceRoot =
    project.sourceRoot ?? posix.join(project.root ?? '', 'src');
  const build = project.architect?.['build']?.options ?? {};

  const angularVersion = await readAngularVersion(builder);
  const major = Number(/\d+/.exec(angularVersion)?.[0]);
  if (!(major >= MIN_ANGULAR_MAJOR)) {
    throw new CliError(
      `Ndop needs Angular ${MIN_ANGULAR_MAJOR} or later; this project has ${angularVersion}.`,
      'package.json',
    );
  }

  const appConfig = posix.join(sourceRoot, 'app/app.config.ts');
  if ((await builder.read(appConfig)) === undefined) {
    throw new CliError(
      `No ${appConfig}. ndop init supports standalone apps bootstrapped with an ApplicationConfig.`,
    );
  }

  const stylesheet =
    firstStylesheet(build['styles']) ?? posix.join(sourceRoot, 'styles.css');
  if (!stylesheet.endsWith('.css')) {
    throw new CliError(
      `The global stylesheet is ${stylesheet}; Tailwind v4 needs a .css file.`,
      'angular.json',
    );
  }

  const polyfills = [build['polyfills']].flat().filter(Boolean);
  const postcss =
    (await builder.read('.postcssrc.json')) ??
    (await builder.read('postcss.config.json')) ??
    '';
  const css = (await builder.read(stylesheet)) ?? '';

  return {
    angularVersion,
    project: name,
    sourceRoot,
    appConfig,
    stylesheet,
    zoneless: !polyfills.some((entry) => String(entry).includes('zone.js')),
    ssr: Boolean(build['ssr'] ?? build['server']),
    tailwind:
      postcss.includes('@tailwindcss/postcss') &&
      /@import\s+['"]tailwindcss['"]/.test(css),
    aliasBase: await readAliasBase(builder, '@/'),
  };
}

/**
 * The installed `@angular/core` version, falling back to the range in
 * `package.json` before dependencies are installed.
 *
 * @param builder - Project reader.
 * @returns A version or range.
 * @throws {@link CliError} when the project doesn't depend on Angular.
 */
export async function readAngularVersion(
  builder: PlanBuilder,
): Promise<string> {
  const installed = await builder.read(
    'node_modules/@angular/core/package.json',
  );
  if (installed) {
    return (JSON.parse(installed) as { version: string }).version;
  }
  const manifest = JSON.parse((await builder.read('package.json')) ?? '{}') as {
    dependencies?: Record<string, string>;
  };
  const declared = manifest.dependencies?.['@angular/core'];
  if (!declared) {
    throw new CliError(
      "package.json doesn't depend on @angular/core.",
      'package.json',
    );
  }
  return declared;
}

/**
 * The first global stylesheet in a build's `styles` option.
 *
 * @param styles - The option: strings or `{ input }` objects.
 * @returns Its path, if any.
 */
function firstStylesheet(styles: unknown): string | undefined {
  const [first] = Array.isArray(styles) ? styles : [];
  if (typeof first === 'string') {
    return first;
  }
  if (first && typeof first === 'object' && 'input' in first) {
    return String((first as { input: unknown }).input);
  }
  return undefined;
}

/**
 * Stages everything `ndop init` does (ADR-0011): `ndop.json`, the `@/`
 * path alias, Tailwind v4 when it's missing, the `@ndop/core` stylesheet
 * import, the theme, `utils` and `icons` items, `provideNdop()` and
 * `provideIcons()` in `app.config.ts`, the agent files, and `@ndop/cli` as
 * a dev dependency unless `cli` is `false` (ADR-0031). An existing
 * `ndop.json` is kept, and packages `package.json` lists aren't added
 * again, so running init again changes nothing.
 *
 * @param builder - The plan being built.
 * @param client - Registry client.
 * @param options - Theme, project, registry, agents and dev dependencies.
 * @returns What was detected and which items will be installed.
 */
export async function planInit(
  builder: PlanBuilder,
  client: RegistryClient,
  options: InitOptions,
): Promise<{ detection: Detection; items: ResolvedItem[] }> {
  const detection = await detectProject(builder, options);
  const config = {
    ...(await initConfig(builder, detection, options)),
    ...(await agentChoice(builder, options)),
  };
  await builder.stage(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`);

  const aliasBase = await planAliasPath(builder, config);

  if (!detection.tailwind) {
    const file =
      (await builder.read('postcss.config.json')) !== undefined
        ? 'postcss.config.json'
        : '.postcssrc.json';
    const current = (await builder.read(file)) ?? '{}';
    await builder.stage(
      file,
      setJsonc(current, ['plugins', '@tailwindcss/postcss'], {}),
    );
    builder.depend(['tailwindcss', '@tailwindcss/postcss', 'postcss'], true);
  }
  const css = (await builder.read(config.tailwind.css)) ?? '';
  await builder.stage(
    config.tailwind.css,
    ensureImports(css, ['tailwindcss', '@ndop/core/styles.css']),
  );
  builder.depend(['@ndop/core']);
  if (options.cli !== false) {
    builder.depend([cliDependency(options.cliVersion)], true);
  }

  const context: InstallContext = { config, aliasBase };
  const theme = parseRequest(options.theme);
  const items = await resolveItems(client, [
    theme.ref,
    ...BASE_ITEMS.map((name) => ({ registry: DEFAULT_NAMESPACE, name })),
  ]);
  assertThemes([theme], items);
  await planItems(builder, context, items);

  if (!(await planProviders(builder, context, detection.appConfig))) {
    builder.warn(
      `Couldn't find the providers array in ${detection.appConfig}. Add provideNdop() from @ndop/core and provideIcons() from your icons file by hand.`,
    );
  }
  await planAgentFiles(builder, config, aliasBase);
  await ignoreVerifyOutput(builder);
  const agentsChosen = config.agents !== false && config.agents !== undefined;
  if (
    options.verify ||
    (agentsChosen && options.chooseVerify && (await options.chooseVerify()))
  ) {
    builder.depend(['@ndop/verify'], true);
  }
  if (options.mcp && (config.agents === false || !config.agents?.length)) {
    builder.warn(
      'No agent to register the MCP server for; pass --agent claude-code, cursor or copilot.',
    );
  }
  if (!detection.zoneless) {
    builder.warn(
      'This app uses zone.js. Ndop works with it, but is built and tested zoneless first.',
    );
  }
  return { detection, items };
}

/**
 * Maps the import alias in `tsconfig.json` to the folder above
 * `aliases.ui`, unless it is mapped already.
 *
 * @param builder - The plan.
 * @param config - The project's configuration.
 * @returns The folder the alias points at.
 * @throws {@link CliError} when there's no `tsconfig.json`.
 */
export async function planAliasPath(
  builder: PlanBuilder,
  config: NdopConfig,
): Promise<string> {
  const prefix = aliasPrefix(config.importAlias ?? '@/');
  const existing = await readAliasBase(builder, prefix);
  if (existing !== undefined) return existing;
  const aliasBase = posix.dirname(config.aliases.ui);
  const tsconfig = await builder.read('tsconfig.json');
  if (tsconfig === undefined) {
    throw new CliError('No tsconfig.json to add the path alias to.');
  }
  await builder.stage(
    'tsconfig.json',
    setJsonc(
      tsconfig,
      ['compilerOptions', 'paths', `${prefix}*`],
      [`./${aliasBase}/*`],
    ),
  );
  return aliasBase;
}

/** The providers `ndop init` registers, by function name. */
export const NDOP_PROVIDERS = ['provideNdop', 'provideIcons'] as const;

/**
 * Registers `provideNdop()` from `@ndop/core` and `provideIcons()` from the
 * project's icons file in the app config, with their imports; calls
 * already there are kept.
 *
 * @param builder - The plan.
 * @param context - Where the icons file is, and how to import it.
 * @param appConfig - Path of `app.config.ts`.
 * @param names - Which of the two to register; both by default.
 * @returns Whether the file has a `providers` array to edit.
 */
export async function planProviders(
  builder: PlanBuilder,
  context: InstallContext,
  appConfig: string,
  names: readonly (typeof NDOP_PROVIDERS)[number][] = NDOP_PROVIDERS,
): Promise<boolean> {
  const modules = {
    provideNdop: '@ndop/core',
    provideIcons: projectSpecifier(
      context,
      appConfig,
      posix.join(context.config.aliases.lib, 'icons'),
    ),
  };
  const edited = addProviders(
    appConfig,
    (await builder.read(appConfig)) ?? '',
    names.map((name) => ({ name, module: modules[name] })),
  );
  if (edited === undefined) return false;
  await builder.stage(appConfig, edited);
  return true;
}

/**
 * Adds `.ndop/`, where `ndop verify` writes its harness and screenshots, to
 * `.gitignore` (ADR-0018), keeping the rest of the file as it is.
 *
 * @param builder - The plan.
 */
async function ignoreVerifyOutput(builder: PlanBuilder): Promise<void> {
  const current = await builder.read('.gitignore');
  if (
    current?.split(/\r?\n/).some((line) => /^\/?\.ndop\/?$/.test(line.trim()))
  ) {
    return;
  }
  const kept = (current ?? '').trimEnd();
  await builder.stage(
    '.gitignore',
    `${kept}${kept ? '\n\n' : ''}# ndop verify's harness and screenshots\n.ndop/\n`,
    { format: false },
  );
}

/**
 * Which agents to write context files for, and whether to register the MCP
 * server (ADR-0017): `--agent` and `--mcp` first, then what `ndop.json`
 * already records, then the user's answer, then the detected agents and no
 * server.
 *
 * @param builder - Project reader.
 * @param options - Init options.
 * @returns The `agents` and `mcp` properties of `ndop.json`.
 */
async function agentChoice(
  builder: PlanBuilder,
  options: InitOptions,
): Promise<Pick<NdopConfig, 'agents' | 'mcp'>> {
  const existing = await readConfig(builder);
  let agents = options.agents ?? existing?.agents;
  if (agents === undefined) {
    const detected = await detectAgents(builder.fs);
    agents = options.chooseAgents
      ? await options.chooseAgents(detected)
      : detected;
  }
  if (agents === false) return { agents };
  const choices = [...agents] as Agent[];
  const mcp = options.mcp
    ? true
    : (existing?.mcp ??
      (choices.length > 0 && options.chooseMcp
        ? await options.chooseMcp(choices)
        : false));
  return { agents: choices, mcp };
}

/**
 * The project's configuration: the existing `ndop.json`, with `--registry`
 * applied, or defaults derived from the detected project.
 *
 * @param builder - Project reader.
 * @param detection - What init found.
 * @param options - Init options.
 * @returns The configuration to write.
 */
async function initConfig(
  builder: PlanBuilder,
  detection: Detection,
  options: InitOptions,
): Promise<NdopConfig> {
  const existing = await readConfig(builder);
  if (existing) {
    return options.registry
      ? { ...existing, registry: options.registry }
      : existing;
  }
  const base = detection.aliasBase ?? posix.join(detection.sourceRoot, 'app');
  return {
    $schema: schemas.config.$id,
    style: options.theme,
    tailwind: { css: detection.stylesheet },
    aliases: {
      ui: posix.join(base, 'ui'),
      lib: posix.join(base, 'lib'),
      blocks: posix.join(base, 'blocks'),
    },
    importAlias: '@/',
    iconLibrary: 'lucide',
    ...(options.registry ? { registry: options.registry } : {}),
  };
}
