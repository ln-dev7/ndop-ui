import { CliError } from '../errors';
import type { PlanBuilder } from '../plan/plan';
import {
  parseRef,
  resolveItems,
  type RegistryClient,
  type ResolvedItem,
} from '../registry/client';
import { planItems, type PlanItemsOptions } from './items';
import { readAliasBase, readConfig } from './project-files';

/**
 * Stages `ndop add`: resolves the items and their registry dependencies,
 * then stages their files, styles, npm dependencies and lockfile entries.
 *
 * @param builder - The plan being built.
 * @param client - Registry client.
 * @param names - Item names, bare or `@namespace/name`.
 * @param options - Overwrite behavior.
 * @returns The items that will be installed, dependencies first.
 * @throws {@link CliError} when the project has no `ndop.json`.
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
  const items = await resolveItems(
    client,
    names.map((name) => parseRef(name)),
  );
  const aliasBase = await readAliasBase(builder, config.importAlias ?? '@/');
  await planItems(builder, { config, aliasBase }, items, options);
  return items;
}
