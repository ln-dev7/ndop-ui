import type { FromSchema } from 'json-schema-to-ts';
import { NAMESPACE_PATTERN } from './patterns';

/**
 * JSON Schema (draft-07) for a project's `ndop.json`, served at
 * `https://ndop.dev/schema/config.json`. `registries` keeps the semantics of
 * shadcn's `components.json`: a URL template containing `{name}`, or an
 * object with `url` and `headers`, where `${VAR}` expands from the
 * environment.
 */
export const configSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://ndop.dev/schema/config.json',
  title: 'ndop.json',
  description: 'Project configuration read by the ndop CLI.',
  type: 'object',
  additionalProperties: false,
  required: ['style', 'tailwind', 'aliases'],
  properties: {
    $schema: { type: 'string' },
    style: { type: 'string', minLength: 1 },
    tailwind: {
      type: 'object',
      additionalProperties: false,
      required: ['css'],
      properties: {
        css: {
          type: 'string',
          minLength: 1,
          description: 'Stylesheet that imports Tailwind and holds the tokens.',
        },
        prefix: { type: 'string' },
      },
    },
    aliases: {
      type: 'object',
      additionalProperties: false,
      required: ['ui', 'lib', 'blocks'],
      description:
        'Folders that the `{ui}`, `{lib}` and `{blocks}` tokens in item targets resolve to.',
      properties: {
        ui: { type: 'string', minLength: 1 },
        lib: { type: 'string', minLength: 1 },
        blocks: { type: 'string', minLength: 1 },
      },
    },
    importAlias: { type: 'string', minLength: 1 },
    registry: {
      type: 'string',
      pattern: '\\{name\\}',
      description:
        'URL template of the default registry, containing `{name}`. Overrides https://ndop.dev/r/{name}.json (ADR-0012).',
    },
    iconLibrary: { type: 'string', minLength: 1 },
    registries: {
      type: 'object',
      propertyNames: { pattern: NAMESPACE_PATTERN },
      additionalProperties: {
        oneOf: [
          { type: 'string', pattern: '\\{name\\}' },
          {
            type: 'object',
            additionalProperties: false,
            required: ['url'],
            properties: {
              url: { type: 'string', pattern: '\\{name\\}' },
              headers: {
                type: 'object',
                additionalProperties: { type: 'string' },
              },
            },
          },
        ],
      },
    },
  },
} as const;

/**
 * A project's `ndop.json`, as validated by {@link configSchema}.
 */
export type NdopConfig = FromSchema<typeof configSchema>;
