---
'@ndop/cli': minor
---

The Ndop section `init` and `add` write for coding agents now asks them to
look in the registry, blocks included, before building any component,
layout or screen, and to take every color, radius and font from the
theme's tokens, in stylesheets and inline styles too. Only the files of
agents the MCP server is registered for name its tools; `AGENTS.md`, which
any agent reads, and the others search with `ndop list` and read with
`ndop view`. The commands in it pass `--yes`, the token list adds the
theme's fonts, and `init` also detects Copilot from
`.github/instructions/` or `.vscode/mcp.json`. Commands no longer ask for
confirmation when the `CI` variable is set.
