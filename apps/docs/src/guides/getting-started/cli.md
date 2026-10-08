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
| `ndop diff [items...]`   | Shows your changes to installed components, and what changed upstream since.           |
| `ndop update [items...]` | Updates installed components, merging upstream's changes into your edits.              |
| `ndop verify [paths...]` | Checks components and pages that use Ndop; see [Verify](/docs/getting-started/verify). |
| `ndop build`             | For registry authors: validates items and writes the registry.                         |

## Options

`init`, `add` and `update` accept:

| Option             | Effect                                                    |
| ------------------ | --------------------------------------------------------- |
| `--cwd <path>`     | The project root, by default the current folder.          |
| `--dry-run`        | Prints the changes as diffs; writes and installs nothing. |
| `--json`           | Prints one machine-readable result and nothing else.      |
| `-y, --yes`        | Applies without asking.                                   |
| `--registry <url>` | Uses another registry; the URL contains `{name}`.         |

`init` also takes `--theme <name>` and `--project <name>`; `add` takes
`--overwrite`, and installs a specific version when you write one after
the name, as in `ndop add button@0.1.0`; `update` takes `--force`,
`--continue` and `--interactive`. For coding agents, `init` takes `--agent`, `--mcp` and
`--verify`; see [Agents & MCP](/docs/getting-started/agents-mcp).

## Your edits are safe

`ndop add` records a hash of every file it writes in `ndop.lock.json`. If
you edit a file and run `add` again, the file is kept and reported as
skipped, unless you pass `--overwrite`. To bring a new version's changes
into a file you edited, use `ndop update`.

## What changed

`ndop diff` shows, for each installed component, two diffs per file: your
changes since you installed it, and what changed upstream since that
version. It writes nothing.

```bash pm
npx ndop diff button
```

## Updating

`ndop update` brings components to their latest version without losing
your edits. A file you never changed is replaced. A file you changed is
merged with upstream's changes, the way `git merge` does, using the
version you installed as the common base:

```bash pm
npx ndop update
```

When you and upstream changed the same lines, the file gets conflict
markers, with your lines first, and the command exits with code 2. Edit
the file to keep what you want, then record it:

```bash pm
npx ndop update --continue
```

The files an update writes must be committed first, so `git checkout`
undoes it; `--force` skips that check. Theme variables you changed keep
your values, new files and dependencies are added, and files a new version
drops stay in your project as yours.

When a new version moves a file, your edited copy moves with it. When it
renames something you use, such as an input, `update` renames it in your
own components and templates as well. To pick which of upstream's changes
to take, file by file, add `--interactive`.

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
