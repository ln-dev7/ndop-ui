# ADR-0009: MCP tool surface and transports

- Status: Accepted (approved by Valery on 2026-10-05)
- Date: 2026-10-05
- Phase: 4
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Agent-native DX" (MCP
  server), Phase 4; ADR-0007, ADR-0011, ADR-0012

## Context

Phase 4 ships `@ndop/mcp` with every tool in RFC-0001's MCP table, the
`ndop://components/<name>` and `ndop://tokens` resources and a
`build-screen` prompt, over stdio and HTTP. The acceptance run gives Claude
Code only this server and a fresh app.

What exists:

- The built registry (`dist/registry/r`, served at `https://ndop.dev/r/`)
  holds `index.json`, `<name>.json`, `<name>@<version>.json` and
  `metadata/<name>.json` (ADR-0007, ADR-0012). No npm package contains the
  metadata.
- `@ndop/cli` resolves registries (`--registry`, `NDOP_REGISTRY`,
  `ndop.json`, then `https://ndop.dev/r/`), plans and applies `add`, and
  returns a JSON `CommandResult`. Its library entry already exports the
  build API.
- The docs build renders each component's Markdown twin
  (`apps/docs/build/markdown-twins.ts`) and its keyword search scoring
  (`apps/docs/src/app/search/search.ts`). Both live in the `type:app`
  docs project, which tooling packages can't import.
- `@ndop/mcp` is an empty CommonJS stub tagged `type:tooling`.

The MCP TypeScript SDK has two lines on npm: `@modelcontextprotocol/sdk`
1.32.0 (v1) and the split v2 packages, `@modelcontextprotocol/server`
2.3.0 plus framework adapters such as `@modelcontextprotocol/node` 2.1.1.
The v2 README calls v2 "the stable release line", implementing the
2026-07-28 MCP spec, and its server package exports `McpServer`,
`createMcpHandler(factory)` (a fetch-style HTTP handler that also answers
2025-era clients statelessly) and, from `./stdio`, `serveStdio(factory)`.

## Decision

### Package and SDK

- `@ndop/mcp` becomes an ESM package built with `@nx/esbuild`, like the
  CLI, with a bin, `ndop-mcp`. Users register it as `npx -y @ndop/mcp`.
- It uses `@modelcontextprotocol/server` 2.3.0, `@modelcontextprotocol/node`
  2.1.1 for the HTTP listener, and `zod` 4.6.5 for tool schemas, all pinned
  exactly (ADR-0001). Tests use the SDK's `InMemoryTransport` and
  `@modelcontextprotocol/client` 2.3.0 as a dev dependency. Before each API
  is used, it is checked against the installed `.d.mts` files.
- It depends on `@ndop/cli`'s library entry for registry resolution, `add`
  and project reading, and on `@ndop/verify` (ADR-0018) for
  `validate_usage` and `verify`. It never shells out to the CLI.
- It is not a CLI subcommand: `@ndop/mcp` depends on the CLI, so `ndop mcp`
  would be a dependency cycle, and keeping it separate keeps the SDK out of
  every `npx ndop` install.

### Where data comes from

- The server reads the same registry the CLI would for the project in
  `cwd`: `--registry`, then `NDOP_REGISTRY`, then `ndop.json`, then
  `https://ndop.dev/r/`. It fetches `index.json` once, then items and
  metadata on demand, and caches them for the life of the process. Items
  are validated against the schemas, as `add` does.
- One renderer, no drift: the component Markdown renderer moves from
  `apps/docs/build` into `@ndop/metadata`, so the Markdown twin and
  `get_component` are byte-for-byte the same text.
- The minimal usage (`usageOf`) runs during extraction instead, and is
  stored in the metadata as an optional `usage` (`imports`, `template`).
  The renderer and the MCP server then need no TypeScript at run time, and
  agents get the usage in the metadata JSON too.
- The docs build imports the renderer by path, with a lint exception that
  says why: Vite bundles the build code with its config, and that bundler
  resolves neither tsconfig paths nor unbuilt workspace packages. The docs
  project lists `metadata` as an implicit dependency, so Nx still rebuilds
  the docs when the renderer changes.

### Tools

Every tool returns `structuredContent` with an output schema, plus the same
result as text for clients that only read text. Errors are tool errors
(`isError: true`) with a message that names the fix, such as an unknown
item with the closest names.

| Tool                  | Input                         | Returns                                                                                                                                          |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `search_components`   | `query`, `limit?` (default 8) | Ranked `{name, title, description, score}`; with no match, every component with its one-line description                                         |
| `get_component`       | `name`                        | The Markdown twin (API, parts, keyboard map, accessibility, do and don't, minimal usage) and the metadata JSON                                   |
| `get_example`         | `name`                        | Full source, the item it demonstrates and the registry dependencies it needs                                                                     |
| `list_blocks`         | `category?`                   | `registry:block` items with title, description and category                                                                                      |
| `get_block`           | `name`                        | The block's files and its resolved dependencies                                                                                                  |
| `add_items`           | `names[]`, `cwd`, `dryRun?`   | `ndop add --yes --json`'s `CommandResult`: files written, dependencies installed, files skipped because the user edited them                     |
| `get_project_context` | `cwd`                         | `ndop.json`, installed items and versions from the lock, locally edited files (hash differs from the lock), aliases, and the theme's token names |
| `validate_usage`      | `file`, `cwd`                 | Problems found by checking the file's templates against metadata (ADR-0018)                                                                      |
| `verify`              | `paths[]`, `cwd`              | `ndop verify --json`'s result (ADR-0018)                                                                                                         |

- **Search is keyword search, not semantic search.** It scores names,
  titles, descriptions, intros, agent notes, keywords, part names and
  example titles, with the docs' weighting, plus a small synonym table kept
  in `@ndop/mcp` ("modal" finds Dialog, "hint" finds Tooltip). The calling
  model does the semantic step: when nothing matches it gets the whole
  catalog's one-line descriptions, which stays small (about 60 components
  at v1). This deviates from RFC-0001's "Semantic plus keyword search",
  approved by Valery on 2026-10-05: embeddings would add a model download
  or a hosted service to a tool that otherwise works offline against any
  registry. Docs site search is unaffected; it stays on Algolia DocSearch
  (ADR-0008).
- **Keywords:** a component's docs front matter may list `keywords`
  (`modal, popup, confirm` for Dialog). The extractor carries them into
  the metadata as an optional `keywords` array, so the MCP search and the
  docs palette both match them.
- **Blocks:** the block tools work over any registry's `registry:block`
  items (already in the item schema). Ndop's registry has no blocks until
  Phase 6, so `list_blocks` returns an empty list with a note saying so,
  and the tools are tested against a fixture registry with blocks.
- **Writes:** `add_items` is the only tool that writes files. It inherits
  `add`'s safety: it never overwrites a file the user edited, and
  `dryRun: true` returns the plan with diffs. Its annotations are
  `destructiveHint: false, idempotentHint: true`; the read tools are
  `readOnlyHint: true`.
- **Paths:** `cwd` must contain an `angular.json` (searching upward, like
  the CLI), and `file` and `paths` must sit inside it. Anything else is a
  tool error.

### Resources and prompt

- `ndop://components/{name}` (a resource template, listable) returns the
  Markdown twin. `ndop://tokens` returns the theme's token names, grouped,
  with what each is for.
- `build-screen`, with argument `description`, walks the agent through
  `get_project_context`, `search_components` and `list_blocks`, then
  `get_component` for each choice, `add_items`, writing the screen with
  only installed components and tokens, and `verify` until it passes.

### Transports

- **stdio** is the default (`ndop-mcp`), through `serveStdio`.
- **HTTP** is `ndop-mcp --http [--port 3333] [--host 127.0.0.1]`, through
  `createMcpHandler` on a `node:http` server via the Node adapter's
  `toNodeHandler`. It binds to loopback by default and puts the adapter's
  `localhostHostValidation()` and `localhostOriginValidation()` guards in
  front, against DNS rebinding. Binding another host prints a warning,
  because the file tools act on that machine's disk.
- A hosted, read-only endpoint at `ndop.dev/mcp` is not part of Phase 4. It
  would need a different deployment (Cloudflare Pages serves static
  files), and is a launch-checklist item for Phase 7.

## Consequences

- Agents get the same text the docs show, from one renderer.
- The server runs fully offline against a local registry
  (`NDOP_REGISTRY=dist/registry/r`), which is how its tests and the eval
  suite run.
- `@ndop/mcp`'s install pulls in the CLI and `@ndop/verify`; the browser
  only downloads when `verify` renders (ADR-0018).
- The SDK's v2 line is new; pinning it exactly and checking its types on
  each upgrade is the mitigation.
