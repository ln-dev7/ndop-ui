import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { configSchema, type NdopConfig } from './config.schema';
import { lockSchema, type NdopLock } from './lock.schema';
import { metadataSchema, type ComponentMetadata } from './metadata.schema';
import { registryItemSchema, type RegistryItem } from './registry-item.schema';
import { registrySchema, type Registry } from './registry.schema';

/**
 * Every schema `@ndop/schema` publishes, keyed by the file name it is served
 * under at `https://ndop.dev/schema/<name>.json`.
 */
export const schemas = {
  registry: registrySchema,
  'registry-item': registryItemSchema,
  config: configSchema,
  lock: lockSchema,
  metadata: metadataSchema,
} as const;

/**
 * Name of a published schema.
 */
export type SchemaName = keyof typeof schemas;

/**
 * The TypeScript type each schema describes.
 */
export interface SchemaTypes {
  /** `registry.json`. */
  registry: Registry;
  /** One registry item. */
  'registry-item': RegistryItem;
  /** `ndop.json`. */
  config: NdopConfig;
  /** `ndop.lock.json`. */
  lock: NdopLock;
  /** `metadata/<name>.json`. */
  metadata: ComponentMetadata;
}

/**
 * One validation failure.
 */
export interface ValidationIssue {
  /** JSON Pointer to the offending value; empty for the document root. */
  path: string;
  /** Human-readable reason, from Ajv. */
  message: string;
}

/**
 * Outcome of {@link validate}: the typed value, or every issue found.
 */
export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; issues: ValidationIssue[] };

let compiled: Map<SchemaName, ValidateFunction> | undefined;

/**
 * Compiles every schema once, on first use. `registry` references
 * `registry-item` by `$id`, so all schemas share one Ajv instance.
 *
 * @returns Validators keyed by schema name.
 */
function validators(): Map<SchemaName, ValidateFunction> {
  if (!compiled) {
    // strictRequired is off because it flags `required` inside conditional
    // `then`/`else` blocks even when the parent declares the property.
    const ajv = new Ajv({
      allErrors: true,
      strict: true,
      strictRequired: false,
    });
    addFormats(ajv);
    for (const schema of Object.values(schemas)) {
      ajv.addSchema(schema);
    }
    compiled = new Map(
      (Object.keys(schemas) as SchemaName[]).map((name) => [
        name,
        ajv.getSchema(schemas[name].$id) as ValidateFunction,
      ]),
    );
  }
  return compiled;
}

/**
 * Validates a parsed JSON document against one of the published schemas.
 *
 * @param name - Which schema to validate against.
 * @param data - The parsed document.
 * @returns The document typed as `SchemaTypes[name]`, or the list of issues.
 *
 * @example
 * ```ts
 * const result = validate('config', JSON.parse(readFileSync('ndop.json', 'utf-8')));
 * if (!result.valid) {
 *   for (const issue of result.issues) console.error(`${issue.path} ${issue.message}`);
 * }
 * ```
 */
export function validate<K extends SchemaName>(
  name: K,
  data: unknown,
): ValidationResult<SchemaTypes[K]> {
  const check = validators().get(name);
  if (!check) {
    throw new Error(`Unknown schema "${name}".`);
  }
  if (check(data)) {
    return { valid: true, value: data as SchemaTypes[K] };
  }
  return {
    valid: false,
    issues: (check.errors ?? []).map((error) => ({
      path: error.instancePath,
      message: error.message ?? error.keyword,
    })),
  };
}
