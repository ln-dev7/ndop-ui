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
| `ndop doctor`            | Checks your setup, and fixes what is safe to fix.                                      |
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
`--continue` and `--interactive`. `doctor` takes the same options, with
`--dry-run` and `--yes` applying to `--fix`, plus `--offline` and
`--project`. For coding agents, `init` takes `--agent`, `--mcp` and
`--verify`; see [Agents & MCP](/docs/getting-started/agents-mcp).

## Themes and URLs

`init --theme` and `add` take a name, a namespaced name such as
`@acme/table`, or the URL of an item's JSON. URLs must use HTTPS, except
on `localhost`. `theme:` in front of any of them checks that the item is a
theme:

```bash pm
npx ndop add theme:https://example.com/r/ocean.json
```

Adding a theme to a set-up app replaces the theme variables in your
stylesheet, light and dark. shadcn themes, `registry:style` items with
`cssVars` such as tweakcn's, install the same way.

`ndop.lock.json` records an item added by URL under that URL. `ndop update`
fetches the URL again, and merges your edits using
`<url without .json>@<version>.json` as the base, which `ndop build`
writes. If the site has no such file, files you didn't edit are replaced,
and edited ones are kept and reported, for you to update by hand.

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

Every component's page links its changelog: what changed in each version,
what `ndop update` does for it, and the diffs. Its update preview merges
your copy of a file in the browser, so you can see the result before
running anything.

## Checking your setup

`ndop doctor` checks everything Ndop relies on and prints each problem with
its fix: the Node and Angular versions, the packages installed components
need, `ndop.json`, the `@/` alias, Tailwind, the theme tokens components
use, `provideNdop()` and the icon provider, the lockfile, zoneless and SSR
support, and the agent files. It writes nothing:

```bash pm
npx ndop doctor
```

`--fix` applies the safe fixes, the same edits `init` and `add` make:
installing missing packages, adding the `tsconfig.json` path, adding
missing tokens from your theme, registering the providers and refreshing
the agent files. Add `--dry-run` to see them as diffs first. It never
changes your components or resolves conflicts for you, and running it
again changes nothing.

It exits with code 1 while any error remains, so CI can run it. `--json`
prints the checks, and `--offline` skips the ones that need the registry,
such as whether your components are behind it.

## Building a registry

`ndop build` reads `registry.json` in `--cwd` and writes the static
registry under `r/` in `--output` (`dist/registry` by default). It fails,
writing nothing, when an item is invalid or doesn't compile. Items that
list `@ndop/<name>` dependencies can import their files; `ndop build`
fetches them from `--registry <url>`, else `NDOP_REGISTRY`, else ndop.dev,
and type-checks against them. See
[Build your own registry](/docs/patterns/build-your-own-registry).

With `--compat shadcn`, it also writes `r/compat/<name>.json` for every
component, block, library and theme, which the shadcn CLI installs in an
Angular app without a `components.json`:

```bash
npx shadcn add https://ndop.dev/r/compat/dialog.json
```

Files go where `ndop init` would put them, under `src/app/ui`,
`src/app/lib` and `src/app/blocks`, with imports between them made
relative. A theme becomes `src/ndop-theme.css`. shadcn then prints the
setup `ndop init` would have done: add a theme and the icons, import
`@ndop/core/styles.css` and the theme in `src/styles.css`, and register
`provideNdop()` and `provideIcons()`. Updates, aliases and agent files stay
`ndop` features.

| Option                    | Effect                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--compat shadcn`         | Also writes the shadcn-compatible items.                                                                                  |
| `--compat-base-url <url>` | The absolute URL `r/compat/` is served from, which items' dependencies point at. By default `https://ndop.dev/r/compat/`. |

For `--compat shadcn` to build, every dependency in `registryDependencies`
must be an item of the same registry or `@ndop/<name>`, which points at
Ndop's compat item. That is `https://ndop.dev/r/compat/<name>.json`, or
next to the `--registry` URL when it ends in `{name}.json`.

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
