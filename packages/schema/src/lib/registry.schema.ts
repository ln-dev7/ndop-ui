import type { FromSchema } from 'json-schema-to-ts';
import { registryItemSchema } from './registry-item.schema';

/**
 * JSON Schema (draft-07) for a registry index or source manifest
 * (`registry.json`), served at `https://ndop.dev/schema/registry.json`.
 * Mirrors shadcn's `registry.json`; items follow {@link registryItemSchema}.
 */
export const registrySchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://ndop.dev/schema/registry.json',
  title: 'Ndop registry',
  description: 'A registry index or source manifest of Ndop items.',
  type: 'object',
  additionalProperties: false,
  required: ['name', 'homepage', 'items'],
  properties: {
    $schema: { type: 'string' },
    name: { type: 'string', minLength: 1 },
    homepage: { type: 'string', format: 'uri' },
    items: {
      type: 'array',
      items: { $ref: 'https://ndop.dev/schema/registry-item.json' },
    },
  },
} as const;

/**
 * A registry index or source manifest, as validated by
 * {@link registrySchema}.
 */
export type Registry = FromSchema<
  typeof registrySchema,
  { references: [typeof registryItemSchema] }
>;
