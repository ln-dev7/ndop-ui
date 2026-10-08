/**
 * `@ndop/schema`: JSON schemas for Ndop registries, registry items, item
 * changelogs, `ndop.json`, `ndop.lock.json` and component metadata, with
 * their TypeScript types and a validator.
 *
 * Each schema is a hand-written draft-07 JSON Schema document; types are
 * derived from it, so the two can't drift. See ADR-0002.
 *
 * @packageDocumentation
 */
export { changelogSchema, type Changelog } from './lib/changelog.schema';
export { configSchema, type NdopConfig } from './lib/config.schema';
export { lockSchema, type NdopLock } from './lib/lock.schema';
export { metadataSchema, type ComponentMetadata } from './lib/metadata.schema';
export {
  IDENTIFIER_PATTERN,
  ITEM_NAME_PATTERN,
  NAMESPACE_PATTERN,
  SEMVER_PATTERN,
} from './lib/patterns';
export {
  codemodSchema,
  ITEM_TYPES,
  registryItemSchema,
  type CssValue,
  type RegistryItem,
} from './lib/registry-item.schema';
export { registrySchema, type Registry } from './lib/registry.schema';
export { toShadcnItem } from './lib/shadcn-compat';
export {
  schemas,
  validate,
  type SchemaName,
  type SchemaTypes,
  type ValidationIssue,
  type ValidationResult,
} from './lib/validate';
