/**
 * `@ndop/cli/api`: the CLI's operations as functions, for the MCP server
 * (ADR-0009). They behave exactly as the commands do, with `--yes` and
 * `--json`, and never prompt.
 *
 * @packageDocumentation
 */
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { Metadata } from '@ndop/metadata';
import type { NdopConfig } from '@ndop/schema';
import { createTwoFilesPatch } from 'diff';
import { nodeEnvironment } from './lib/commands/environment';
import { executeWriteCommand, type CommandResult } from './lib/commands/run';
import { tokenNames } from './lib/install/agents';
import { planAdd } from './lib/install/add';
import { CONFIG_FILE, readConfig, readLock } from './lib/install/project-files';
import { nodeFs } from './lib/project/fs';
import { localState, type LocalState } from './lib/update/diff';
import {
  DEFAULT_NAMESPACE,
  defaultFetcher,
  registrySources,
} from './lib/registry/client';

export { CliError } from './lib/errors';
export {
  DEFAULT_NAMESPACE,
  DEFAULT_REGISTRY_URL,
  RegistryClient,
  defaultFetcher,
  parseRef,
  registrySources,
  type Fetcher,
  type ItemRef,
  type RegistrySource,
} from './lib/registry/client';
export type { CommandResult } from './lib/commands/run';

/**
 * The project root around a folder: the nearest one holding `ndop.json`.
 *
 * @param cwd - A folder inside the project.
 * @returns The root.
 * @throws When there's no `ndop.json` here or above.
 */
export async function projectRoot(cwd: string): Promise<string> {
  for (let folder = resolve(cwd); ; folder = dirname(folder)) {
    const found = await readFile(join(folder, CONFIG_FILE), 'utf-8').then(
      () => true,
      () => false,
    );
    if (found) return folder;
    if (dirname(folder) === folder) {
      throw new Error(
        `No ndop.json in ${resolve(cwd)} or above; run npx ndop init in the app first.`,
      );
    }
  }
}

/** What {@link addItems} takes. */
export interface AddItemsOptions {
  /** A folder inside the project. */
  cwd: string;
  /** Item names, bare or `@namespace/name`. */
  names: string[];
  /** Plan only, and return diffs. */
  dryRun?: boolean;
}

/** What {@link addItems} returns. */
export interface AddItemsResult extends CommandResult {
  /** Unified diffs of the planned files, on a dry run. */
  diffs?: { path: string; patch: string }[];
}

/**
 * Runs `ndop add <names> --yes --json`: resolves the items and their
 * dependencies, writes their files, installs npm packages and refreshes
 * the lockfile and agent files. Files the user edited are never
 * overwritten.
 *
 * @param options - Project, items and dry run.
 * @returns The command's JSON result, with diffs on a dry run.
 */
export async function addItems(
  options: AddItemsOptions,
): Promise<AddItemsResult> {
  const root = await projectRoot(options.cwd);
  const environment = { ...nodeEnvironment(), interactive: false };
  const { result, plan } = await executeWriteCommand(
    'add',
    { cwd: root, yes: true, json: true, dryRun: Boolean(options.dryRun) },
    environment,
    ({ builder, client }) => planAdd(builder, client, options.names),
  );
  return options.dryRun && plan
    ? {
        ...result,
        diffs: plan.files.map((file) => ({
          path: file.path,
          patch: createTwoFilesPatch(
            file.action === 'create' ? '/dev/null' : `a/${file.path}`,
            file.action === 'delete' ? '/dev/null' : `b/${file.path}`,
            file.before ?? '',
            file.after,
          ),
        })),
      }
    : result;
}

/** What {@link projectContext} returns. */
export interface ProjectContext {
  /** Project root. */
  root: string;
  /** Its `ndop.json`. */
  config: NdopConfig;
  /**
   * Installed items, with each file and whether it was edited, or still
   * has conflict markers from `ndop update`.
   */
  items: {
    name: string;
    registry: string;
    version: string;
    files: { path: string; state: LocalState }[];
  }[];
  /** The theme's tokens, from the Tailwind stylesheet. */
  tokens: { colors: string[]; other: string[] };
}

/**
 * Everything an agent needs to know about a project before writing UI
 * (ADR-0009, `get_project_context`): its configuration and aliases, the
 * installed items and versions, which of their files were edited since
 * they were installed, and the theme's token names.
 *
 * @param cwd - A folder inside the project.
 * @returns The project's context.
 */
export async function projectContext(cwd: string): Promise<ProjectContext> {
  const root = await projectRoot(cwd);
  const fs = nodeFs(root);
  const config = await readConfig(fs);
  if (!config) throw new Error(`${CONFIG_FILE} is missing.`);
  const lock = await readLock(fs);
  const items = await Promise.all(
    Object.values(lock.items)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (item) => ({
        name: item.name,
        registry: item.registry,
        version: item.version,
        files: await Promise.all(
          item.files.map(async (file) => {
            const state = localState(await fs.read(file.path), file.sha256);
            return { path: file.path, state };
          }),
        ),
      })),
  );
  return {
    root,
    config,
    items,
    tokens: tokenNames((await fs.read(config.tailwind.css)) ?? ''),
  };
}

/** A component's metadata, with its registry name. */
export interface ComponentMetadataEntry {
  /** Registry item name. */
  name: string;
  /** Its `metadata/<name>.json`. */
  metadata: Metadata;
}

/**
 * Reads component metadata from the registry a project installs from, as
 * `ndop verify` needs it: the installed components' and every component
 * the registry offers. Each file is fetched once.
 *
 * @param cwd - A folder inside the project.
 * @param env - Environment variables, for `NDOP_REGISTRY`.
 * @returns The two lists, loaded on demand.
 */
export async function registryMetadata(
  cwd: string,
  env: Record<string, string | undefined> = process.env,
): Promise<{
  installed(): Promise<ComponentMetadataEntry[]>;
  available(): Promise<ComponentMetadataEntry[]>;
}> {
  const root = await projectRoot(cwd);
  const fs = nodeFs(root);
  const config = await readConfig(fs);
  const sources = registrySources(config, undefined, env);
  const fetcher = defaultFetcher(root);
  const cache = new Map<string, Promise<Metadata | undefined>>();
  const load = (registry: string, name: string) => {
    const key = `${registry}/${name}`;
    let found = cache.get(key);
    if (!found) {
      const source = sources[registry];
      found = source
        ? fetcher(
            source.url.replaceAll('{name}', `metadata/${name}`),
            source.headers ?? {},
          ).then(
            (text) => JSON.parse(text) as Metadata,
            () => undefined,
          )
        : Promise.resolve(undefined);
      cache.set(key, found);
    }
    return found;
  };
  const entries = async (refs: { registry: string; name: string }[]) =>
    (
      await Promise.all(
        refs.map(async ({ registry, name }) => {
          const metadata = await load(registry, name);
          return metadata ? [{ name, metadata }] : [];
        }),
      )
    ).flat();
  return {
    installed: async () => entries(Object.values((await readLock(fs)).items)),
    available: async () => {
      const source = sources[DEFAULT_NAMESPACE];
      if (!source) return [];
      const index = JSON.parse(
        await fetcher(
          source.url.replaceAll('{name}', 'index'),
          source.headers ?? {},
        ),
      ) as { items: { name: string; type: string }[] };
      return entries(
        index.items
          .filter((item) => item.type === 'registry:ui')
          .map((item) => ({ registry: DEFAULT_NAMESPACE, name: item.name })),
      );
    },
  };
}
