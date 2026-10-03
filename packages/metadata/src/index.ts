/**
 * `@ndop/metadata`: build-time extraction of Ndop component metadata
 * (ADR-0007). It reads each styled item's API with Angular's documentation
 * extractor, merges the composed primitive's `spec.md` and the item's
 * `docs.md`, and returns `metadata/<name>.json` content for `ndop build`.
 *
 * @packageDocumentation
 */
export {
  extractMetadata,
  type MetadataIssue,
  type MetadataOptions,
  type MetadataResult,
} from './lib/extract';
export { parseDocs, type ParsedDocs } from './lib/parse-docs';
export { parseSpec, type ParsedSpec, type SpecPart } from './lib/parse-spec';
