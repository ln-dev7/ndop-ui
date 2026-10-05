/**
 * `@ndop/mcp`: the Ndop MCP server (ADR-0009), which gives coding agents
 * the registry's components, examples, blocks and theme tokens, read the
 * way `ndop add` reads them. Run it with `npx -y @ndop/mcp` (stdio) or
 * `npx -y @ndop/mcp --http`; this entry is the same server as a library,
 * for tests and the agent eval suite.
 *
 * @packageDocumentation
 */
export { Catalog, CatalogError, type IndexEntry } from './lib/catalog';
export { serveHttp, type HttpEndpoint, type HttpOptions } from './lib/http';
export { catalogFor, type CatalogOptions } from './lib/project';
export {
  SYNONYMS,
  searchComponents,
  type SearchDocument,
  type SearchHit,
} from './lib/search';
export {
  buildScreenPrompt,
  createNdopServer,
  type NdopServerOptions,
} from './lib/server';
export { themeTokens, tokensMarkdown, type Token } from './lib/tokens';
