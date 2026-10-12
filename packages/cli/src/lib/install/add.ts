import { CliError } from '../errors';
import type { PlanBuilder } from '../plan/plan';
import {
  assertThemes,
  parseRequest,
  resolveItems,
  type RegistryClient,
  type ResolvedItem,
} from '../registry/client';
import { planAgentFiles } from './agents';
import { planItems, type PlanItemsOptions } from './items';
import { readAliasBase, readConfig } from './project-files';

/**
 * Stages `ndop add`: resolves the items and their registry dependencies,
 * then stages their files, styles, npm dependencies and lockfile entries,
 * and refreshes the agent context files (ADR-0017).
 *
 * @param builder - The plan being built.
 * @param client - Registry client.
 * @param names - Item names, bare or `@namespace/name`, optionally
 *   `@<version>`, or item URLs; any of them after `theme:` must be a
 *   theme (ADR-0023).
 * @param options - Overwrite behavior.
 * @returns The items that will be installed, dependencies first.
 * @throws {@link CliError} when the project has no `ndop.json`, or an
 *   item asked for with `theme:` isn't a theme.
 */
export async function planAdd(
  builder: PlanBuilder,
  client: RegistryClient,
  names: readonly string[],
  options: PlanItemsOptions = {},
): Promise<ResolvedItem[]> {
  const config = await readConfig(builder);
  if (!config) {
    throw new CliError('No ndop.json here. Run ndop init first.');
  }
  const requests = names.map(parseRequest);
  const items = await resolveItems(
    client,
    requests.map(({ ref }) => ref),
  );
  assertThemes(requests, items);
  const aliasBase = await readAliasBase(builder, config.importAlias ?? '@/');
  await planItems(builder, { config, aliasBase }, items, options);
  await planAgentFiles(builder, config, aliasBase);
  return items;
}
