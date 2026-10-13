# ADR-0011: CLI architecture and stack

- Status: Accepted (approved by Valery on 2026-10-02)
- Date: 2026-10-02
- Phase: 2
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "CLI (`ndop`)"

## Context

Phase 2 ships `ndop build`, `ndop init` and `ndop add`. RFC-0001 requires the
CLI to be AST-aware, idempotent and previewable, to support `--cwd`,
`--dry-run`, `--json` and `--yes` on every command, and lists "commander or
citty, ts-morph, prompts, node-diff3" as intent.

Checked on 2026-10-02:

- npm `latest`: `commander` 15.0.0 (engines `node >=22.12.0`), `citty` 0.2.2
  (pre-1.0), `@clack/prompts` 1.8.1, `prompts` 2.4.2 (last release
  2023-10), `ts-morph` 28.0.0, `jsonc-parser` 3.3.1, `postcss` 8.5.28,
  `package-manager-detector` 1.8.0, `tinyexec` 1.3.1, `diff` 9.0.0,
  `picocolors` 1.1.1.
- A fresh `ng new --style tailwind` app (Angular CLI 22.2.1) has
  `.postcssrc.json` with `@tailwindcss/postcss`, `@import 'tailwindcss'` in
  `src/styles.css`, a `tsconfig.json` with comments and no `paths`, and an
  `app.config.ts` whose `providers` array is a plain literal.
- The npm names `ndop`, `@ndop/cli` and `@ndop/core` are unclaimed.

## Decision

### Package and runtime

- `packages/cli` publishes `@ndop/cli` with a `ndop` bin, as ESM, for Node
  `>=22.12` (commander's floor, below Angular 22's own). A second package
  named `ndop` depends on `@ndop/cli` and re-exposes its bin, so
  `npx ndop init` works as the RFC shows. **The `ndop` npm name has to be
  registered by Valery**, like the `@ndop` org.
- `ng add @ndop/cli` (RFC CLI table) is not scheduled in any phase's list;
  it is proposed for Phase 6, next to `doctor`.

### Libraries

| Concern                                | Choice                           | Why                                                                                 |
| -------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| Command parsing                        | `commander` 15.0.0               | Stable 1.x+ API, typed; `citty` is pre-1.0.                                         |
| Prompts                                | `@clack/prompts` 1.8.1           | Maintained; `prompts` has had no release since 2023.                                |
| TypeScript edits                       | `ts-morph` 28.0.0                | RFC: no regex on TypeScript.                                                        |
| `tsconfig.json` / `angular.json` edits | `jsonc-parser` 3.3.1             | Edits by path and keeps comments and formatting.                                    |
| Stylesheet edits                       | `postcss` 8.5.28                 | Inserts imports, token blocks and CSS rules by node, not by string.                 |
| Package manager detection              | `package-manager-detector` 1.8.0 | Lockfile and `packageManager` field detection, and the install command per manager. |
| Running commands                       | `tinyexec` 1.3.1                 | Small, promise-based process spawning.                                              |
| Dry-run diffs                          | `diff` 9.0.0                     | Unified diffs of planned writes.                                                    |
| Terminal colors                        | `picocolors` 1.1.1               |                                                                                     |
| Formatting                             | the project's own Prettier       | Resolved from the user's project; no Prettier means no formatting.                  |

`node-diff3` joins in Phase 5 with `ndop update` (ADR-0003).

### How commands run

Every write command builds a **plan** first: a list of file creations and
modifications (with full new content), dependencies to install and lockfile
changes. Then:

- `--dry-run` prints the plan as unified diffs (or JSON with `--json`) and
  writes nothing.
- Otherwise the plan is applied: files written, then formatted with the
  project's Prettier, then dependencies installed with the detected package
  manager.
- Idempotency falls out of planning: a plan whose files already match and
  whose dependencies are installed is empty, and an empty plan writes and
  installs nothing. "Re-running `add` is a no-op" is tested exactly that way.
- `--json` prints one machine-readable result (planned or applied changes,
  warnings, errors with file and reason) and nothing else on stdout.
- `--yes` skips confirmations; `--cwd` sets the project root.

### `ndop init` in Phase 2

Detects Angular version, standalone bootstrap (`app.config.ts`), zoneless
(no `zone.js` in `polyfills`), SSR, Tailwind v4 and existing path aliases,
then:

- sets up Tailwind v4 the way `ng new --style tailwind` does when it is
  missing;
- writes `ndop.json`;
- adds an `@/*` path alias to `tsconfig.json` (ADR-0012);
- installs the default theme and `utils` items, which import the token
  mechanics and write the token blocks and `{lib}/utils.ts` (`cn` and
  `variants`, re-exported from `@ndop/core` so the user has a place to
  customize them);
- adds `provideNdop()` (and the icon resolver, ADR-0013) to
  `app.config.ts`.

Agent context files (`AGENTS.md`, `--agent`) are Phase 4, as the RFC's phase
list says.

## Consequences

- Planning first keeps `--dry-run` honest: it prints exactly what applying
  would write.
- The CLI depends on `ts-morph`, whose bundled TypeScript is only used to
  edit user files, not to compile them.
- Publishing needs the `ndop` npm name in addition to `@ndop/*`.

## Amendment 1 (2026-10-03): `init` and `add` details

Status: Accepted by Valery on 2026-10-03.

Implementing `init` and `add` settled points this ADR left open:

1. **Files are formatted while planning, not after writing.** Each planned
   file holds the text the project's Prettier produces, so `--dry-run`
   diffs, the "nothing changed" check and the lockfile hashes (ADR-0002:
   "after formatting") all see exactly what is written. Files are then
   written as planned, and dependencies installed.
2. **`add` never overwrites a user's edits.** A target file that exists
   with different content is replaced only if it still matches the hash
   in `ndop.lock.json` (the user never touched it) or `--overwrite` is
   passed; otherwise it is reported as skipped. Merging upstream changes
   into edited files stays `ndop update`'s job (Phase 5).
3. **Prompts only on a terminal.** Without `--yes`, a command asks before
   applying only when stdin and stdout are TTYs; agents and CI never
   block. `--json` never prompts.
4. **Install failures keep the written files.** The plan's files are
   written first; if the package manager fails, the command exits with
   code 1 and prints its output. Running the command again installs only
   what is still missing from `package.json`.
5. **`init` details.** `--theme <name>` installs the theme item of that
   name (default `default`) and records it as `style`. `--registry`
   is saved to `ndop.json`; `NDOP_REGISTRY` is not. Item folders default
   to `<sourceRoot>/app/{ui,lib,blocks}`, or follow an existing `@/*`
   path alias. Projects with several applications need `--project`.
   Missing Tailwind v4 is set up as `ng new --style tailwind` does it.
6. **Item references are names.** `add` accepts `name` and
   `@namespace/name`; installing by URL is rejected with a clear message
   until a later phase needs it, since the lockfile keys items by
   namespace.
7. **The lockfile names the default registry `@ndop`.**

## Amendment 2 (2026-10-13): no `ndop` package

Status: Accepted by Valery on 2026-10-13 (ADR-0031).

npm refused the `ndop` name. The CLI runs as `npx @ndop/cli <command>`,
and as `ndop` once installed; the `ndop` package is private and isn't
published.
