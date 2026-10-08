# ADR-0024: `ndop doctor`

- Status: Accepted (approved by Valery on 2026-10-08)
- Date: 2026-10-08
- Phase: 6
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "CLI" (`ndop doctor`),
  Phase 6; ADR-0010, ADR-0011, ADR-0017

## Context

The RFC: `ndop doctor` "checks versions, Tailwind setup, tokens, aliases,
lockfile drift, missing peer deps, zoneless/SSR config. Prints fixes;
`--fix` applies safe ones." It doesn't exist yet. Most of what it checks,
`init` already detects or writes (ADR-0011), so the checks can reuse that
code.

## Decision

### Checks

Each check reports `ok`, `warning` or `error`, with a message and, when it
has one, a fix.

| Check         | Error when                                                                                  | Warning when                                                      | Safe fix                                   |
| ------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| Node          | Under the CLI's `engines` range                                                             |                                                                   |                                            |
| Angular       | Not 21 or 22, or not standalone                                                             |                                                                   |                                            |
| Packages      | An installed item's `dependencies` (e.g. `@ndop/primitives`) missing or outside its range   | `@angular/cdk` or `@angular/forms` at a different minor than core | Install the missing or matching versions   |
| `ndop.json`   | Missing or invalid                                                                          |                                                                   |                                            |
| Aliases       | `importAlias` not resolvable through `tsconfig` paths; alias folders that don't exist       |                                                                   | Add the `tsconfig` path                    |
| Tailwind      | Tailwind v4 missing, or the CSS file not importing it                                       |                                                                   |                                            |
| Tokens        | A semantic token an installed item uses is undefined in `:root` or `.dark`                  | A token defined but not in the theme's set                        | Add the missing tokens from the theme item |
| Providers     | `provideNdop()` missing from the app config                                                 | No icon resolver while an installed item uses icons               | Add them, as `init` does                   |
| Lockfile      | Files with conflict markers; a locked file missing (not deleted on purpose, ADR-0010)       | Locally edited files (informational); items behind the registry   |                                            |
| Zoneless, SSR | An installed item marked `zoneless: false` in a zoneless app, or `ssr: false` in an SSR app |                                                                   |                                            |
| Agent files   |                                                                                             | Agent context out of date with the lockfile                       | Refresh them, as `add` does                |

### Behavior

- Read-only by default. `--fix` applies only the fixes in the table, which
  are the same edits `init` and `add` make, through the same plan, so
  `--dry-run` previews them and a second run changes nothing.
- It never edits a user's component files or resolves conflicts.
- Exits 1 when any error remains, 0 otherwise. `--json` prints the checks
  for agents and CI. MCP's `get_project_context` includes the doctor
  result.
- Network checks (items behind the registry) are skipped with `--offline`.

## Consequences

- Most checks are cheap reuses of `init`'s detection.
- New checks can be added without changing the output format.
