import type { FromSchema } from 'json-schema-to-ts';
import {
  ITEM_NAME_PATTERN,
  NAMESPACE_PATTERN,
  SEMVER_PATTERN,
} from './patterns';

/**
 * JSON Schema (draft-07) for `ndop.lock.json`, served at
 * `https://ndop.dev/schema/lock.json`. Records, per installed item, the
 * version and the SHA-256 of every file as written, which is what makes
 * `ndop diff` and `ndop update` possible. ADR-0010 finalizes the update
 * rules; a change to this shape bumps `lockfileVersion`.
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
          version: { type: 'string', pattern: SEMVER_PATTERN },
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
                  description: 'Hash of the bytes written, after formatting.',
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * A project's `ndop.lock.json`, as validated by {@link lockSchema}.
 */
export type NdopLock = FromSchema<typeof lockSchema>;
