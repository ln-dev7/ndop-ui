import type { RegistryItem } from './registry-item.schema';

/**
 * Fields only Ndop understands; dropped from compat output (ADR-0002).
 */
const NDOP_ONLY_FIELDS = [
  '$schema',
  'version',
  'angular',
  'migrations',
  'ndop',
] as const;

/**
 * shadcn's target placeholders for each Ndop alias token. shadcn has no
 * blocks alias; its blocks install under `@components/`.
 */
const TARGET_TOKENS = {
  '{ui}/': '@ui/',
  '{lib}/': '@lib/',
  '{blocks}/': '@components/',
} as const;

/**
 * Maps an Ndop item type to the shadcn type with the same intent.
 *
 * @param type - Ndop item or file type.
 * @returns The shadcn type.
 */
function toShadcnType(type: RegistryItem['type']): string {
  return type === 'registry:primitive-usage' ? 'registry:block' : type;
}

/**
 * Maps an Ndop alias-token target to shadcn's placeholder syntax.
 *
 * @param target - A target such as `{ui}/dialog/dialog.ts`.
 * @returns The same target with a shadcn placeholder, such as `@ui/dialog/dialog.ts`.
 */
function toShadcnTarget(target: string): string {
  for (const [token, placeholder] of Object.entries(TARGET_TOKENS)) {
    if (target.startsWith(token)) {
      return placeholder + target.slice(token.length);
    }
  }
  return target;
}

/**
 * Converts an Ndop registry item to shadcn's exact `registry-item.json`
 * shape, as `ndop build --compat shadcn` emits under `/r/compat/`. Ndop-only
 * fields are dropped, `registry:primitive-usage` becomes `registry:block`,
 * and alias-token targets become shadcn placeholders.
 *
 * @param item - A valid Ndop registry item.
 * @returns A document that validates against shadcn's schema.
 *
 * @example
 * ```ts
 * toShadcnItem(dialog).files?.[0]?.target; // '@ui/dialog/dialog.ts'
 * ```
 */
export function toShadcnItem(item: RegistryItem): Record<string, unknown> {
  const compat: Record<string, unknown> = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  };
  for (const [key, value] of Object.entries(item)) {
    if (!(NDOP_ONLY_FIELDS as readonly string[]).includes(key)) {
      compat[key] = value;
    }
  }
  compat['type'] = toShadcnType(item.type);
  if (item.files) {
    compat['files'] = item.files.map((file) => ({
      ...file,
      type: toShadcnType(file.type),
      target: toShadcnTarget(file.target),
    }));
  }
  return compat;
}
