# @ndop/mcp

The Ndop UI MCP server: it gives coding agents the registry's components,
examples, blocks and theme tokens, so they use Ndop's real APIs instead of
guessing. It runs on your machine, started by your agent, and reads the same
registry `ndop add` does. See
[ADR-0009](../../docs/adr/0009-mcp-server.md).

> Not released yet. The project tools (`get_project_context`, `add_items`,
> `validate_usage` and `verify`) come later in Phase 4 of
> [RFC-0001](../../rfcs/0001-ndop-ui.md).

## Use it

Register it with your agent as a stdio server that runs:

```bash
npx -y @ndop/mcp
```

For agents that connect to a URL instead, serve it over Streamable HTTP. It
listens on loopback only, at `http://127.0.0.1:3333/mcp`:

```bash
npx -y @ndop/mcp --http
```

| Option             | Effect                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `--registry <url>` | Registry URL or path with `{name}`. Wins over `NDOP_REGISTRY` and `ndop.json`'s `registry`. |
| `--cwd <dir>`      | Project folder whose `ndop.json` picks the registry (default: the current folder).          |
| `--http`           | Serve over HTTP instead of stdio.                                                           |
| `--port <port>`    | HTTP port (default: `3333`).                                                                |
| `--host <host>`    | HTTP interface (default: `127.0.0.1`). Any other host is reachable from other machines.     |

## What it offers

| Tool                | Returns                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `search_components` | Components matching a query, by name, keyword or description; all of them if none match. |
| `get_component`     | A component's documentation as Markdown, and its metadata.                               |
| `get_example`       | An example's source and what it demonstrates.                                            |
| `list_blocks`       | The registry's blocks, optionally in one category.                                       |
| `get_block`         | A block's files and everything it depends on.                                            |

It also serves each component's documentation as the
`ndop://components/{name}` resource, the theme's tokens as `ndop://tokens`,
and a `build-screen` prompt that walks an agent through building a screen.
