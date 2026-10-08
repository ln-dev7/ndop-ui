---
title: CLI
description: The ndop command, its options, and how it keeps every change previewable and repeatable.
order: 5
---

The `ndop` CLI sets up your app and adds components to it. Every command
plans its changes first, then applies them: `--dry-run` shows the plan as
diffs, and running a command twice changes nothing the second time.

## Commands

| Command                  | What it does                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `ndop init`              | Sets up an Angular app for Ndop.                                                       |
| `ndop add <items...>`    | Adds components and everything they depend on.                                         |
| `ndop verify [paths...]` | Checks components and pages that use Ndop; see [Verify](/docs/getting-started/verify). |
| `ndop build`             | For registry authors: validates items and writes the registry.                         |

## Options

`init` and `add` accept:

| Option             | Effect                                                    |
| ------------------ | --------------------------------------------------------- |
| `--cwd <path>`     | The project root, by default the current folder.          |
| `--dry-run`        | Prints the changes as diffs; writes and installs nothing. |
| `--json`           | Prints one machine-readable result and nothing else.      |
| `-y, --yes`        | Applies without asking.                                   |
| `--registry <url>` | Uses another registry; the URL contains `{name}`.         |

`init` also takes `--theme <name>` and `--project <name>`; `add` takes
`--overwrite`, and installs a specific version when you write one after
the name, as in `ndop add button@0.1.0`. For coding agents, `init` takes `--agent`, `--mcp` and
`--verify`; see [Agents & MCP](/docs/getting-started/agents-mcp).

## Your edits are safe

`ndop add` records a hash of every file it writes in `ndop.lock.json`. If
you edit a file and run `add` again, the file is kept and reported as
skipped, unless you pass `--overwrite`.

## Package managers

The CLI installs dependencies with the package manager your project uses,
detected from its lockfile or `packageManager` field. npm, pnpm and bun are
tested on every change.

## For agents and CI

Commands ask for confirmation only in an interactive terminal, and
`--json` prints a single result that a script or a coding agent can read:

```bash pm
npx ndop add dialog --yes --json
```

`ndop add` also refreshes the Ndop section of your agents' instructions,
and installs `@angular/cdk` for your Angular version when a component
needs it.
