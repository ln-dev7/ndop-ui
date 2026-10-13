# ADR-0031: `@ndop/cli` as the CLI's entry point

- Status: Accepted (approved by Valery on 2026-10-13); deviates from
  RFC-0001's `npx ndop init` (see "Deviation")
- Date: 2026-10-13
- Phase: 7
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Success metrics",
  "Architecture overview", "CLI (`ndop`)", "Documentation site"; ADR-0011,
  ADR-0028

## Context

RFC-0001 shows the CLI as `npx ndop init`. ADR-0011 made that work with a
second package, `ndop`, that depends on `@ndop/cli` and re-exposes its
`ndop` bin, and ADR-0028 releases it with the other nine packages.

npm refused to publish `ndop` on 2026-10-13: `E403`, "Package name too
similar to existing packages np,ncp,nsp,nopt,plop,dot". Nothing was
published. The `@ndop` scope is Valery's, and `@ndop/cli` already has
`"bin": { "ndop": "./main.js" }`, its only bin.

Package runners run a package's only bin even when its name differs from
the package's. Checked on 2026-10-13:

| Runner      | Command                   | How it was checked                                           |
| ----------- | ------------------------- | ------------------------------------------------------------ |
| npm 11.19.0 | `npx @ndop/cli init`      | Install test, `npm-ng22`, against Verdaccio                  |
| pnpm 12.8.1 | `pnpm dlx @ndop/cli init` | Install test, `pnpm-ng22` and `pnpm-ng21`, against Verdaccio |
| bun 1.3.11  | `bunx @ndop/cli init`     | Install test, `bun-ng22`, against Verdaccio                  |
| Yarn 4.12.0 | `yarn dlx @ndop/cli init` | `yarn dlx @angular/cli@22 version`, whose only bin is `ng`   |

Yarn 1 has no `dlx`, as before.

## Decision

### Deviation (amends RFC-0001 and ADR-0028)

- The documented way to run the CLI without installing it is
  `npx @ndop/cli <command>`, and `pnpm dlx @ndop/cli`, `yarn dlx @ndop/cli`
  and `bunx @ndop/cli` for the other package managers. The docs' package
  manager tabs translate the `npx` form as they did before.
- Installed as a dev dependency (`npm install -D @ndop/cli`), the command
  stays `ndop`, as do the RFC's command names (`ndop init`, `ndop add`).
- The `ndop` package becomes private and leaves the release: **nine**
  public packages form the Changesets fixed group instead of ten. Its
  folder stays, so the alias can return.
- The CLI prints its own run command from one constant, which the MCP
  server reuses. The agent context files `ndop init` writes, the docs,
  `@ndop/verify`'s fixes, the READMEs and the install test use
  `@ndop/cli`.

### Later alias

If npm support releases the `ndop` name, the package can come back as a
short alias of `@ndop/cli`: made public again, added to the fixed group,
and documented as an alternative. `npx @ndop/cli` keeps working, so
nothing that uses it breaks.

## Consequences

- The run command is 8 characters longer: `npx @ndop/cli init`. The
  landing page's install box fits it at every width.
- Users who know the package as `@ndop/cli` find it under that name on
  npm, with no second package to keep in step.
- Historical ADRs keep `npx ndop`; this ADR and the RFC's amended lines
  are the reference.
