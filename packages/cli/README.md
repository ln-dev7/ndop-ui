# @ndop/cli

The ndop CLI: init, add, list, view, diff, update, doctor, verify and build.

> Not released yet. This package's API lands in Phase 2 of
> [RFC-0001](../../rfcs/0001-ndop-ui.md).

## Install

```bash
pnpm add @ndop/cli
```

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
