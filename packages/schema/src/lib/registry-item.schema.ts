import type { FromSchema } from 'json-schema-to-ts';
import {
  IDENTIFIER_PATTERN,
  ITEM_NAME_PATTERN,
  SEMVER_PATTERN,
} from './patterns';

/**
 * Item types Ndop accepts. All but `registry:primitive-usage` keep shadcn's
 * meaning; shadcn types Ndop can't install are rejected (ADR-0002).
 */
export const ITEM_TYPES = [
  'registry:ui',
  'registry:primitive-usage',
  'registry:block',
  'registry:theme',
  'registry:lib',
  'registry:style',
  'registry:file',
] as const;

const itemType = { type: 'string', enum: ITEM_TYPES } as const;

const stringMap = {
  type: 'object',
  additionalProperties: { type: 'string' },
} as const;

/**
 * One codemod: an edit to the project's own code that `ndop update`
 * applies when an update crosses `since` (ADR-0020).
 */
export const codemodSchema = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['since', 'kind', 'from', 'to', 'module'],
      description:
        'Moves a forwarding export to its primitive package, preserving local and public aliases.',
      properties: {
        since: { type: 'string', pattern: SEMVER_PATTERN },
        kind: { const: 'move-export' },
        from: { type: 'string', pattern: IDENTIFIER_PATTERN },
        to: { type: 'string', pattern: IDENTIFIER_PATTERN },
        module: { type: 'string', minLength: 1 },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['since', 'kind', 'from', 'to', 'overlay'],
      description:
        'Converts modal content to a native dialog and moves static overlay classes to its backdrop.',
      properties: {
        since: { type: 'string', pattern: SEMVER_PATTERN },
        kind: { const: 'native-dialog' },
        from: { type: 'string', pattern: IDENTIFIER_PATTERN },
        to: { const: 'dialog' },
        overlay: { type: 'string', pattern: IDENTIFIER_PATTERN },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['since', 'kind', 'from', 'to'],
      description:
        "Renames an export of the item where the project imports it, and the name's uses in those files.",
      properties: {
        since: { type: 'string', pattern: SEMVER_PATTERN },
        kind: { const: 'rename-export' },
        from: { type: 'string', pattern: IDENTIFIER_PATTERN },
        to: { type: 'string', pattern: IDENTIFIER_PATTERN },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['since', 'kind', 'selector', 'from', 'to'],
      description:
        'Renames an input in templates, on elements matching `selector`: the attribute and its `[from]`, `(fromChange)` and `[(from)]` bindings.',
      properties: {
        since: { type: 'string', pattern: SEMVER_PATTERN },
        kind: { const: 'rename-input' },
        selector: { type: 'string', minLength: 1 },
        from: { type: 'string', pattern: IDENTIFIER_PATTERN },
        to: { type: 'string', pattern: IDENTIFIER_PATTERN },
      },
    },
  ],
} as const;

/**
 * JSON Schema (draft-07) for one registry item, served at
 * `https://ndop.dev/schema/registry-item.json`. A superset of shadcn's
 * `registry-item.json`: shared fields keep shadcn's names and types, and
 * Ndop adds `version`, `angular`, `migrations`, `codemods` and `ndop`.
 *
 * @see {@link https://ndop.dev/schema/registry-item.json}
 */
export const registryItemSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://ndop.dev/schema/registry-item.json',
  title: 'Ndop registry item',
  description:
    'One installable Ndop registry item. A superset of the shadcn registry-item schema (ADR-0002).',
  type: 'object',
  additionalProperties: false,
  required: ['name', 'type', 'version', 'title', 'description'],
  properties: {
    $schema: { type: 'string' },
    name: {
      type: 'string',
      pattern: ITEM_NAME_PATTERN,
      description: 'Item name, used in `ndop add <name>`.',
    },
    type: itemType,
    version: {
      type: 'string',
      pattern: SEMVER_PATTERN,
      description:
        'Item version. Recorded in ndop.lock.json and used as the merge base for updates.',
    },
    title: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    author: { type: 'string' },
    dependencies: {
      type: 'array',
      description: 'npm packages, as `name` or `name@range`.',
      items: {
        type: 'string',
        pattern: '^(@[a-z0-9][a-z0-9._~-]*/)?[a-z0-9][a-z0-9._~-]*(@\\S+)?$',
      },
    },
    devDependencies: {
      type: 'array',
      description: 'npm dev dependencies, as `name` or `name@range`.',
      items: {
        type: 'string',
        pattern: '^(@[a-z0-9][a-z0-9._~-]*/)?[a-z0-9][a-z0-9._~-]*(@\\S+)?$',
      },
    },
    registryDependencies: {
      type: 'array',
      description:
        'Other registry items: a bare name (same registry), `@namespace/name`, or a URL.',
      items: {
        type: 'string',
        pattern:
          '^([a-z0-9]+(-[a-z0-9]+)*|@[a-z0-9]+(-[a-z0-9]+)*/[a-z0-9]+(-[a-z0-9]+)*|https?://\\S+)$',
      },
    },
    files: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'type', 'target'],
        properties: {
          path: {
            type: 'string',
            minLength: 1,
            description: 'Path relative to the registry root.',
          },
          content: {
            type: 'string',
            description:
              'File content. Omitted in source manifests, always present in built items.',
          },
          type: itemType,
          target: {
            type: 'string',
            pattern: '^\\{(ui|lib|blocks)\\}/.+',
            description:
              "Install path, starting with an alias token resolved from ndop.json's `aliases`.",
          },
        },
      },
    },
    cssVars: {
      type: 'object',
      additionalProperties: false,
      properties: { theme: stringMap, light: stringMap, dark: stringMap },
    },
    css: {
      type: 'object',
      description: "CSS to add to the project's stylesheet, as in shadcn.",
      additionalProperties: { $ref: '#/definitions/cssValue' },
    },
    envVars: stringMap,
    docs: {
      type: 'string',
      description: 'A Markdown note shown on install, as in shadcn.',
    },
    categories: { type: 'array', items: { type: 'string' } },
    meta: { type: 'object', additionalProperties: true },
    extends: {
      type: 'string',
      description: 'For `registry:style` items: the style it extends.',
    },
    angular: {
      type: 'object',
      additionalProperties: false,
      required: ['minVersion', 'exports', 'zoneless', 'ssr'],
      properties: {
        minVersion: { type: 'string', pattern: SEMVER_PATTERN },
        providers: { type: 'array', items: { type: 'string' } },
        exports: { type: 'array', items: { type: 'string' } },
        zoneless: { type: 'boolean' },
        ssr: { type: 'boolean' },
      },
    },
    migrations: {
      type: 'array',
      description:
        'Upstream renames and deletions, applied before a merge. A missing `to` means deleted.',
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
        "Edits to the project's own code for breaking changes, applied by `ndop update` when it crosses `since` (ADR-0020). Declarative only: registries never ship code to run. Keep every entry once published.",
      items: codemodSchema,
    },
    ndop: {
      type: 'object',
      additionalProperties: false,
      description:
        'Pointers to the metadata file and example items (replaces the RFC draft `docs` object, ADR-0002).',
      properties: {
        metadata: { type: 'string', minLength: 1 },
        examples: {
          type: 'array',
          items: { type: 'string', pattern: ITEM_NAME_PATTERN },
        },
      },
    },
  },
  allOf: [
    {
      if: {
        properties: {
          type: {
            enum: ['registry:ui', 'registry:primitive-usage', 'registry:block'],
          },
        },
      },
      then: { required: ['angular'] },
    },
    {
      if: {
        properties: { type: { enum: ['registry:theme', 'registry:style'] } },
      },
      else: {
        required: ['files'],
        properties: { files: { type: 'array', minItems: 1 } },
      },
    },
  ],
  definitions: {
    cssValue: {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          additionalProperties: { $ref: '#/definitions/cssValue' },
        },
      ],
    },
  },
} as const;

/**
 * A CSS value in an item's `css` field: a declaration value, or a nested
 * block of selectors, at-rules or properties. Mirrors
 * `definitions.cssValue` in {@link registryItemSchema}.
 */
export type CssValue = string | { [key: string]: CssValue };

// FromSchema can't resolve the recursive cssValue $ref (TS2589), so `css`
// is typed by hand with CssValue and the rest is derived from the schema.
type SchemaWithoutCss = Omit<
  typeof registryItemSchema,
  'properties' | 'definitions'
> & {
  properties: Omit<(typeof registryItemSchema)['properties'], 'css'>;
};

/**
 * A registry item, as validated by {@link registryItemSchema}.
 */
export type RegistryItem = FromSchema<SchemaWithoutCss> & {
  css?: Record<string, CssValue>;
};
