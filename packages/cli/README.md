# @ndop/cli

The ndop CLI: `init`, `add` and `build` today; `list`, `view`, `diff`,
`update`, `doctor` and `verify` come in later phases of
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

| Option             | Effect                                            |
| ------------------ | ------------------------------------------------- |
| `--theme <name>`   | Theme item to install (default: `default`).       |
| `--project <name>` | Angular project, when `angular.json` has several. |

## `ndop add <items...>`

```bash
npx ndop add dialog
```

Installs items and the items they depend on: files go where `ndop.json`'s
aliases say, npm dependencies are installed with your package manager, and
each file's version and hash go into `ndop.lock.json`. Files you changed
since they were installed are kept unless you pass `--overwrite`. Running it
again changes nothing.

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
