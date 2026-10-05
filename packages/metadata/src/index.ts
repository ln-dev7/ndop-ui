/**
 * `@ndop/metadata`: build-time extraction of Ndop component metadata
 * (ADR-0007). It reads each styled item's API with Angular's documentation
 * extractor, merges the composed primitive's `spec.md` and the item's
 * `docs.md`, and returns `metadata/<name>.json` content for `ndop build`.
 * It also renders a component's documentation as Markdown from the built
 * registry, for the docs' `.md` twins and the MCP server.
 *
 * @packageDocumentation
 */
export {
  extractMetadata,
  type MetadataIssue,
  type MetadataOptions,
  type MetadataResult,
} from './lib/extract';
export {
  componentMarkdown,
  defaultTarget,
  withDependencies,
  withoutTsdocLinks,
  type BuiltItem,
  type Member,
  type Metadata,
  type RegistryReader,
} from './lib/markdown';
export { parseDocs, type ParsedDocs } from './lib/parse-docs';
export { parseSpec, type ParsedSpec, type SpecPart } from './lib/parse-spec';
export { usageOf, type Usage } from './lib/usage';
