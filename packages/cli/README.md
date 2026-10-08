# @ndop/cli

The ndop CLI: `init`, `add`, `verify` and `build` today; `list`, `view`,
`diff`, `update` and `doctor` come in later phases of
[RFC-0001](../../rfcs/0001-ndop-ui.md).

> Not released yet.

## Install

```bash
pnpm add @ndop/cli
```

## `ndop init`

Run it in an Angular 21 or 22 app with a standalone `app.config.ts`:

```bash
npx ndop init
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
npx ndop add dialog
```

Installs items and the items they depend on: files go where `ndop.json`'s
aliases say, npm dependencies are installed with your package manager, and
each file's version and hash go into `ndop.lock.json`. Files you changed
since they were installed are kept unless you pass `--overwrite`. Running it
again changes nothing.

Add `@<version>` to install a specific version, such as
`npx ndop add button@0.1.0`. Registries serve each version at their URL
template with `<name>@<version>` in place of `{name}`.

## Options for `init` and `add`

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
npx ndop verify src/app/settings --json
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
