import type { FromSchema } from 'json-schema-to-ts';
import { ITEM_NAME_PATTERN } from './patterns';

const described = { type: 'string', minLength: 1 } as const;

const member = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'type', 'description'],
  properties: {
    name: { type: 'string', minLength: 1 },
    type: { type: 'string', minLength: 1 },
    default: { type: 'string' },
    required: { type: 'boolean' },
    values: {
      type: 'array',
      minItems: 1,
      items: { type: 'string' },
      description:
        'Allowed values of an enum-like member, such as the options of a variants() input.',
    },
    description: described,
  },
} as const;

/**
 * JSON Schema (draft-07) for `metadata/<name>.json`, the compiler-extracted
 * API of one component merged with its hand-written `spec.md`. Served at
 * `https://ndop.dev/schema/metadata.json`.
 *
 * Version 1 (ADR-0007). Descriptions are required on every part and member
 * because `ndop build` fails on undocumented public API.
 */
export const metadataSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://ndop.dev/schema/metadata.json',
  title: 'Ndop component metadata',
  description:
    'API, accessibility contract and examples of one component, feeding the docs, MCP server and llms.txt.',
  type: 'object',
  additionalProperties: false,
  required: [
    'name',
    'title',
    'description',
    'intro',
    'agentNotes',
    'parts',
    'keyboard',
    'focus',
    'examples',
  ],
  properties: {
    $schema: { type: 'string' },
    name: { type: 'string', pattern: ITEM_NAME_PATTERN },
    title: described,
    description: described,
    intro: {
      ...described,
      description: "Markdown introduction, from the item's docs.md.",
    },
    agentNotes: {
      type: 'object',
      additionalProperties: false,
      required: ['do', 'dont'],
      description: "Do and don't guidance for people and agents, from docs.md.",
      properties: {
        do: { type: 'array', minItems: 1, items: described },
        dont: { type: 'array', minItems: 1, items: described },
      },
    },
    bundleSize: {
      type: 'object',
      additionalProperties: false,
      required: ['gzip'],
      description:
        "Size of the item's own code, minified and gzipped, with Angular and @ndop/* packages external.",
      properties: { gzip: { type: 'integer', minimum: 0 } },
    },
    pattern: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'url'],
      description: 'The WAI-ARIA pattern implemented.',
      properties: {
        name: described,
        url: { type: 'string', format: 'uri' },
      },
    },
    parts: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name',
          'selector',
          'description',
          'inputs',
          'models',
          'outputs',
        ],
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            description: 'Exported class name, for example `NdDialogTrigger`.',
          },
          selector: described,
          description: described,
          source: {
            type: 'string',
            minLength: 1,
            description:
              "Where the part is defined: `item` for the item's own files, otherwise the primitive entry point, such as `@ndop/primitives/dialog`.",
          },
          exportAs: { type: 'string' },
          role: { type: 'string' },
          ariaAttributes: { type: 'array', items: { type: 'string' } },
          inputs: { type: 'array', items: member },
          models: { type: 'array', items: member },
          outputs: { type: 'array', items: member },
          hostBindings: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'value'],
              properties: {
                name: { type: 'string', minLength: 1 },
                value: { type: 'string' },
              },
            },
          },
          dataAttributes: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name'],
              properties: {
                name: { type: 'string', pattern: '^data-[a-z0-9-]+$' },
                values: { type: 'array', items: { type: 'string' } },
                description: described,
              },
            },
          },
          cssVariables: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'description'],
              properties: {
                name: { type: 'string', pattern: '^--[a-z0-9-]+$' },
                description: described,
              },
            },
          },
        },
      },
    },
    keyboard: {
      type: 'array',
      description:
        'Keyboard map from spec.md. Required even when empty, so a missing map is an error.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['keys', 'action'],
        properties: {
          keys: { type: 'array', minItems: 1, items: { type: 'string' } },
          action: described,
        },
      },
    },
    focus: {
      type: 'array',
      description: 'Focus rules from spec.md, one sentence each.',
      items: described,
    },
    rtl: { type: 'string' },
    examples: {
      type: 'array',
      items: { type: 'string', pattern: ITEM_NAME_PATTERN },
    },
  },
} as const;

/**
 * Component metadata, as validated by {@link metadataSchema}.
 */
export type ComponentMetadata = FromSchema<typeof metadataSchema>;
