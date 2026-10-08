import type { FromSchema } from 'json-schema-to-ts';
import { ITEM_NAME_PATTERN, SEMVER_PATTERN } from './patterns';
import { codemodSchema } from './registry-item.schema';

const names = {
  type: 'array',
  items: { type: 'string', minLength: 1 },
} as const;

const addedChangedRemoved = {
  type: 'object',
  additionalProperties: false,
  required: ['added', 'changed', 'removed'],
  properties: { added: names, changed: names, removed: names },
} as const;

/**
 * JSON Schema (draft-07) for an item's changelog, served by `ndop build` at
 * `/r/changelog/<name>.json` and at `https://ndop.dev/schema/changelog.json`
 * (ADR-0020). Each version carries the author's notes and what changed
 * since the version before, computed from the version snapshots: the
 * "what `ndop update` will do" notes the docs show.
 */
export const changelogSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://ndop.dev/schema/changelog.json',
  title: 'Ndop item changelog',
  description: 'Release notes and changes of one registry item, newest first.',
  type: 'object',
  additionalProperties: false,
  required: ['name', 'versions'],
  properties: {
    $schema: { type: 'string' },
    name: { type: 'string', pattern: ITEM_NAME_PATTERN },
    versions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['version', 'notes', 'changes'],
        properties: {
          version: { type: 'string', pattern: SEMVER_PATTERN },
          notes: {
            type: 'string',
            description:
              "The version's section of `changelog/<name>.md`, as Markdown; empty when the item has no notes for it.",
          },
          changes: {
            type: 'object',
            additionalProperties: false,
            required: [
              'files',
              'migrations',
              'codemods',
              'dependencies',
              'registryDependencies',
            ],
            description:
              'What changed since the version before; for the first version, every file is added.',
            properties: {
              files: {
                ...addedChangedRemoved,
                description: 'File targets, such as `{ui}/button/button.ts`.',
              },
              migrations: {
                type: 'array',
                description:
                  'Renames and deletions this version adds, by file target.',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['from'],
                  properties: {
                    from: { type: 'string', minLength: 1 },
                    to: { type: 'string', minLength: 1 },
                  },
                },
              },
              codemods: {
                type: 'array',
                description:
                  'Codemods this version introduces (their `since` is this version), as in the item.',
                items: codemodSchema,
              },
              dependencies: {
                ...addedChangedRemoved,
                description:
                  'npm packages, as `name@range` for added and changed ones and `name` for removed ones.',
              },
              registryDependencies: {
                type: 'object',
                additionalProperties: false,
                required: ['added', 'removed'],
                properties: { added: names, removed: names },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * An item's changelog, as validated by {@link changelogSchema}.
 */
export type Changelog = FromSchema<typeof changelogSchema>;
