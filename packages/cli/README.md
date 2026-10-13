# @ndop/cli

The ndop CLI: `init`, `add`, `list`, `view`, `diff`, `update`, `doctor`,
`verify` and `build`.

## Install

Run it without installing, with your package manager's runner:

```bash
npx @ndop/cli init
pnpm dlx @ndop/cli init
yarn dlx @ndop/cli init
bunx @ndop/cli init
```

Or add it as a dev dependency, which gives you the `ndop` command:

```bash
pnpm add -D @ndop/cli
pnpm exec ndop add dialog
```

The examples below use `npx @ndop/cli`; installed, write `ndop` instead.

## `ndop init`

Run it in an Angular 21 or 22 app with a standalone `app.config.ts`:

```bash
npx @ndop/cli init
```

It writes `ndop.json`, adds the `@/*` path alias to `tsconfig.json`, sets up
Tailwind v4 if the app doesn't have it, imports `@ndop/core/styles.css`,
installs the default theme and the `utils` and `icons` items, and adds
`provideNdop()` and `provideIcons()` to `app.config.ts`. Running it again
changes nothing.

| Option             | Effect                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `--theme <name>`   | Theme item to install (default: `default`).                                                                                                |
| `--project <name>` | Angular project, when `angular.json` has several.                                                                                          |
| `--agent <names>`  | Coding agents to write guidance for: `claude-code`, `cursor`, `copilot`, or `none`. Repeatable or comma-separated. Detected when left out. |
| `--mcp`            | Also register the Ndop MCP server in the agents' MCP settings.                                                                             |

### Agent context files

`init` writes an Ndop section into `AGENTS.md`: how to use the installed
components, the theme's tokens and the `ndop verify` loop. With
`--agent claude-code` it also writes it into `CLAUDE.md` and adds a skill
at `.claude/skills/ndop/SKILL.md`; with `cursor`, a rule at
`.cursor/rules/ndop.mdc`; with `copilot`, a section in
`.github/copilot-instructions.md`. `ndop add` keeps them up to date.

Only the text between `<!-- ndop:start -->` and `<!-- ndop:end -->` is
ever rewritten, so your own notes in those files are safe. The skill and
the rule belong to Ndop; once you edit one, Ndop leaves it alone. The
choice is saved in `ndop.json` as `agents` and `mcp`.

## `ndop add <items...>`

```bash
npx @ndop/cli add dialog
```

Installs items and the items they depend on: files go where `ndop.json`'s
aliases say, npm dependencies are installed with your package manager, and
each file's version and hash go into `ndop.lock.json`. Files you changed
since they were installed are kept unless you pass `--overwrite`. Running it
again changes nothing.

Add `@<version>` to install a specific version, such as
`npx @ndop/cli add button@0.1.0`. Registries serve each version at their URL
template with `<name>@<version>` in place of `{name}`.

## `ndop list [words...]`

```bash
npx @ndop/cli list --type block
```

Lists the registry's items, grouped by type, with their latest version and
description. Outside an app it reads Ndop's registry; in one, also the
registries in `ndop.json`'s `registries`, and it shows the version of each
item installed. Words filter by name, title, description and category.
`--type` keeps one type: `ui`, `block`, `theme`, `lib`, `style`, `file` or
`example`; examples are listed only with `--type example`.

## `ndop view <items...>`

```bash
npx @ndop/cli view dialog
```

Prints an item's description, version, install command, docs page,
dependencies and files, and for a component its usage, API (each part's
selector, inputs, models, outputs and data attributes), keyboard map, focus
rules and examples, from its metadata. `--code` adds the examples' source.
An unknown name fails with exit code 1 and the closest names.

`list` and `view` write nothing, fit their output to the terminal, and take
`--cwd`, `--registry` and `--json`.

## `ndop diff [items...]`

```bash
npx @ndop/cli diff button
```

For each installed item (all of them by default), shows two diffs per
file: your changes, from the version you installed to the file on disk,
and upstream's, from that version to the latest. `--to <version>` compares
one item with another version. It also lists files upstream added, moved
or removed, and the codemods an update would run. It writes nothing, and
takes `--cwd`, `--registry` and `--json`.

## `ndop update [items...]`

```bash
npx @ndop/cli update
```

Brings installed items (all of them by default) to their latest version,
or `name@version`, keeping your edits. Files you never edited are
replaced. Edited ones are three-way merged, with the version you installed
as the base; where you and upstream changed the same lines, the file gets
conflict markers:

```text
<<<<<<< local
your lines
=======
upstream's lines
>>>>>>> ndop@0.2.0
```

It then exits with code 2. Resolve the markers and run
`npx @ndop/cli update --continue` to record them. New upstream files are
created, theme variables you changed keep your values, and new
dependencies are installed.

When a new version moves or deletes a file, the file moves with your edits
in it, or is deleted if you never edited it. When it renames an export or
an input, `update` renames it in your own code and templates too.
`--interactive` (`-i`) shows each of upstream's changes to a file you
edited and applies only the ones you accept.

The files it writes must have no uncommitted changes, so `git checkout`
undoes an update; `--force` skips that check. It takes the same options
as `add`, and `--json` reports what happened to every file.

## `ndop doctor`

```bash
npx @ndop/cli doctor
```

Checks the setup (ADR-0024): the Node and Angular versions, the packages
installed items need, `ndop.json`, the import alias, Tailwind, the tokens
items use, `provideNdop()` and the icon provider, the lockfile (conflicts,
missing and edited files, items behind the registry), zoneless and SSR
support, and the agent files. Each check reports `ok`, `warning` or
`error`, with a fix. It exits with 1 while any error remains.

`--fix` applies the safe fixes through the same plan as `init` and `add`,
so `--dry-run` previews them and a second run changes nothing; it never
edits your components or resolves conflicts. `--offline` skips the checks
that need the registry, and `--json` prints the checks.

## Options for `init`, `add` and `update`

| Option             | Effect                                                 |
| ------------------ | ------------------------------------------------------ |
| `--cwd <path>`     | Project root (default: current folder).                |
| `--registry <url>` | Registry URL template containing `{name}`.             |
| `--dry-run`        | Print the changes as diffs, write and install nothing. |
| `--json`           | Print one JSON result and nothing else.                |
| `-y, --yes`        | Apply without asking. Commands only ask on a terminal. |

The registry is, in order: `--registry`, the `NDOP_REGISTRY` environment
variable, `registry` in `ndop.json`, then `https://ndop.dev/r/{name}.json`.

## `ndop build`

For registry authors. Run it in the folder holding `registry.json`:

```bash
ndop build --output dist/registry
```

It validates every item against the Ndop schemas, checks each file's
imports against the dependency rules, type-checks the items with `ngc`, and
writes `index.json`, `<name>.json` and `<name>@<version>.json` under
`dist/registry/r/`. The first build of a version writes
`snapshots/<name>@<version>.json`; commit it. Changing an item without
bumping its version fails the build.

| Option                | Effect                                                          |
| --------------------- | --------------------------------------------------------------- |
| `--cwd <path>`        | Registry root (default: current folder).                        |
| `-o, --output <path>` | Output folder (default: `dist/registry`).                       |
| `--frozen-snapshots`  | Fail when a version has no snapshot (default when `CI` is set). |
| `--no-compile`        | Skip the `ngc` type-check.                                      |
| `--tsconfig <path>`   | tsconfig to extend for the type-check, keeping its `paths`.     |
| `--dry-run`           | Check everything, write nothing.                                |
| `--json`              | Print the result as JSON.                                       |

## Docs

https://ndop.dev

## `ndop verify [paths...]`

```bash
npx @ndop/cli verify src/app/settings --json
```

Checks components and pages that use Ndop UI, for people and for agents
(ADR-0018): their templates against the components' metadata, a
type-checked build through the app's own build target, Ndop's lint rules,
and axe and light and dark screenshots in Chromium, saved to
`.ndop/verify/`. Every problem has a file, a line, a rule and, when known,
a fix; the exit code is 1 while any error remains. Paths default to
`src/app`.

| Option             | Effect                                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| `--skip <steps>`   | Skip `usage`, `build`, `lint` or `render`; repeatable or comma-separated. |
| `--json`           | Print one JSON result.                                                    |
| `--project <name>` | Angular project, when `angular.json` has several.                         |

The checks are in `@ndop/verify`, a dev dependency of the app; `ndop verify`
prints the command to install it when it's missing.
