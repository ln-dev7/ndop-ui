import type { FromSchema } from 'json-schema-to-ts';
import {
  ITEM_NAME_PATTERN,
  NAMESPACE_PATTERN,
  SEMVER_PATTERN,
} from './patterns';

/**
 * JSON Schema (draft-07) for `ndop.lock.json`, served at
 * `https://ndop.dev/schema/lock.json`. Records, per installed item, the
 * version and, per file, the SHA-256 of the pristine file at its base
 * version, which is what makes `ndop diff` and `ndop update` possible
 * (ADR-0010). A file whose hash differs from the one on disk was edited.
 * A change to this shape bumps `lockfileVersion` once Ndop is released.
 */
export const lockSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://ndop.dev/schema/lock.json',
  title: 'ndop.lock.json',
  description: 'Installed registry items, their versions and file hashes.',
  type: 'object',
  additionalProperties: false,
  required: ['lockfileVersion', 'items'],
  properties: {
    $schema: { type: 'string' },
    lockfileVersion: { const: 1 },
    items: {
      type: 'object',
      description: 'Keyed by `<registry>/<name>`, for example `@ndop/dialog`.',
      propertyNames: {
        pattern: '^@[a-z0-9]+(-[a-z0-9]+)*/[a-z0-9]+(-[a-z0-9]+)*$',
      },
      additionalProperties: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'registry', 'version', 'files'],
        properties: {
          name: { type: 'string', pattern: ITEM_NAME_PATTERN },
          registry: { type: 'string', pattern: NAMESPACE_PATTERN },
          version: {
            type: 'string',
            pattern: SEMVER_PATTERN,
            description:
              'The version installed or updated to, and the base of every file without its own `version`.',
          },
          files: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['path', 'sha256'],
              properties: {
                path: {
                  type: 'string',
                  minLength: 1,
                  description: 'Project-relative path the CLI wrote.',
                },
                sha256: {
                  type: 'string',
                  pattern: '^[a-f0-9]{64}$',
                  description:
                    "Hash of the pristine file at its base version: what `ndop add` writes for that version in this project, after import rewriting and formatting (ADR-0010). After a merge it no longer matches the file on disk, which holds the user's edits.",
                },
                version: {
                  type: 'string',
                  pattern: SEMVER_PATTERN,
                  description:
                    "The file's base version, when it is behind the item's: a conflict not yet marked resolved, or a file the user deleted (ADR-0010).",
                },
              },
            },
          },
        },
      },
    },
    agentFiles: {
      type: 'object',
      description:
        'SHA-256 of each agent context file Ndop owns outright, as last written, keyed by project-relative path (ADR-0017). A file whose hash differs was edited, and is left alone.',
      additionalProperties: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    },
  },
} as const;

/**
 * A project's `ndop.lock.json`, as validated by {@link lockSchema}.
 */
export type NdopLock = FromSchema<typeof lockSchema>;
