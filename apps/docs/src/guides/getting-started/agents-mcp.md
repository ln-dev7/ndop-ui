---
title: Agents & MCP
description: How Ndop helps coding agents use its components correctly, with project guidance, an MCP server and a verify loop.
order: 7
---

Coding agents write better UI when they don't have to guess an API. Ndop
gives them three things: guidance in your project that's always true for
it, an MCP server with the components' real documentation, and
`ndop verify`, which checks their work and says exactly what to fix.

## Guidance in your project

`ndop init` writes an Ndop section into `AGENTS.md`, which most agents read.
It lists the installed components, the theme's tokens, where files go, and
the workflow: use an installed component first, read its documentation,
style with tokens and logical utilities, then verify. `ndop add` refreshes
it every time you install something.

Pick the agents you use with `--agent`, or let `init` detect them:

```bash pm
npx ndop init --agent claude-code,cursor
```

| Agent         | What `init` writes                                                     |
| ------------- | ---------------------------------------------------------------------- |
| Every agent   | A section in `AGENTS.md`                                               |
| `claude-code` | The same section in `CLAUDE.md`, and a skill in `.claude/skills/ndop/` |
| `cursor`      | A rule in `.cursor/rules/ndop.mdc`                                     |
| `copilot`     | The same section in `.github/copilot-instructions.md`                  |

The CLI only rewrites the text between `<!-- ndop:start -->` and
`<!-- ndop:end -->`, so your own instructions in those files are safe. The
skill and the rule belong to Ndop; once you edit one, Ndop leaves it alone.
Pass `--agent none` to write nothing.

## The MCP server

The Ndop MCP server gives an agent the registry's components, examples,
blocks and theme tokens, read the way `ndop add` reads them, and can
install items and run `ndop verify` for it. It runs on your machine,
started by the agent.

Let `init` register it for your agents:

```bash pm
npx ndop init --agent claude-code --mcp
```

Or add it by hand, as a stdio server that runs `npx -y @ndop/mcp`. For
Claude Code, in `.mcp.json`:

```json title=".mcp.json"
{
  "mcpServers": {
    "ndop": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@ndop/mcp"]
    }
  }
}
```

Cursor reads the same shape from `.cursor/mcp.json`. VS Code reads it from
`.vscode/mcp.json`, under `servers` instead of `mcpServers`.

### Tools

| Tool                  | What it does                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `get_project_context` | Describes your app: aliases, installed items and versions, files you edited, token names.    |
| `search_components`   | Finds components by name, purpose or other words for them, such as "modal".                  |
| `get_component`       | A component's documentation: usage, examples, parts, inputs, required nesting, keyboard map. |
| `get_example`         | An example's full source.                                                                    |
| `list_blocks`         | Page-level compositions, by category.                                                        |
| `get_block`           | A block's files and everything it depends on.                                                |
| `add_items`           | Installs components or blocks, as `ndop add` does; with `dryRun`, returns the diffs.         |
| `validate_usage`      | Checks a file's templates against the components' metadata, in a second.                     |
| `verify`              | Runs `ndop verify` and returns every problem with its file, line, rule and fix.              |

It also serves each component's documentation as the
`ndop://components/{name}` resource, the theme's tokens as `ndop://tokens`,
and a `build-screen` prompt that walks an agent through building a whole
screen.

### Over HTTP

For agents that connect to a URL, serve it over Streamable HTTP. It listens
on loopback only, and refuses requests from other origins:

```bash pm
npx -y @ndop/mcp --http
```

The server is then at `http://127.0.0.1:3333/mcp`. `--port` and `--host`
change it, and `--registry` points it at another registry.

## The verify loop

After writing UI, an agent runs [`ndop verify`](/docs/getting-started/verify)
on its files, fixes every problem it reports, and runs it again until it
passes. Each problem names a file, a line and a rule, often with the fix:

```bash pm
npx ndop verify src/app/settings --json
```

## Documentation agents can read

Every page of these docs is also Markdown at its URL plus `.md`, such as
[/docs/components/dialog.md](/docs/components/dialog.md).
[/llms.txt](/llms.txt) lists every page, and
[/llms-full.txt](/llms-full.txt) has them all in one file. Each page's menu
copies it as Markdown or opens it in Claude or ChatGPT.
