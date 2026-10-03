# ADR-0012: Registry source, build and distribution

- Status: Accepted (approved by Valery on 2026-10-02)
- Date: 2026-10-02
- Phase: 2
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Registry spec"

## Context

Phase 2 adds the first registry items and `ndop build`, which emits static
registry JSON and immutable versioned snapshots used as merge bases
(ADR-0003). RFC-0001 fixes the served layout (`/r/index.json`,
`/r/<name>.json`, `/r/<name>@<version>.json`), file targets by alias token
(`{ui}`, `{lib}`, `{blocks}`), and requires `ndop build` to validate items,
compile them, and fail on imports that break the dependency rules. It does
not say how items import each other, where snapshots live, or how the CLI
finds the registry before ndop.dev exists.

## Decision

### Source layout

`registry/` becomes an Nx project (`type:registry`) with `ui/`, `lib/`,
`examples/`, `themes/` and the `registry.json` source manifest (ADR-0002
format, without `content`). Lint, type-check and unit tests run on it like
any project.

### Imports between items: the `@/` convention

Registry source imports other items through `@/`, mirroring the user's
project: `@/ui/button/button`, `@/lib/utils`. The registry tsconfig maps
`@/*` to `registry/*`. `ndop init` adds `"@/*": ["./src/app/*"]` to the
user's `tsconfig.json` (or uses the existing alias that `importAlias` and
`aliases` in `ndop.json` describe), so most installs copy files unchanged. When
a user's aliases differ, `ndop add` rewrites `@/<alias>/…` specifiers to the
user's paths with ts-morph.

### Versions and immutable snapshots

- Each item in `registry.json` has a `version`. Changing an item's built
  output requires a version bump.
- `ndop build` writes each new version's built item to
  `registry/snapshots/<name>@<version>.json`, **committed to git**. Git is
  what guarantees the merge base never changes.
- `ndop build` fails when a snapshot already exists for the item's current
  version and the freshly built content differs: the author changed an item
  without bumping it.

### What `ndop build` checks

1. Every item and the manifest validate against `@ndop/schema`.
2. Every import in every file is allowed: `@angular/*`, `@ndop/primitives/*`,
   `@ndop/core`, packages in the item's `dependencies`, relative imports
   inside the item, and `@/…` paths of items in its `registryDependencies`.
3. The items compile: a generated tsconfig maps `@/*` to the registry root
   and runs `ngc --noEmit` when `@angular/compiler-cli` is available.

### Output

`dist/registry/r/`: `index.json`, `<name>.json` (latest, with `content`),
`<name>@<version>.json` (copied from the snapshots), all static. The
workspace-plugin's `registry-build` executor runs `ndop build` for Ndop's own
registry; third parties run the CLI directly.

### How the CLI finds the registry

- Default: `https://ndop.dev/r/{name}.json`, which goes live when the docs
  site deploys (Phase 3).
- Overrides, in order: `--registry <url template>`, the `NDOP_REGISTRY`
  environment variable, then a new optional `registry` field in `ndop.json`.
  The field is an additive change to the `config.json` schema
  (`@ndop/schema`). Namespaced registries (`registries`) work as ADR-0002
  says.
- Until ndop.dev is live, the registry install test serves `dist/registry`
  locally (ADR-0015).

## Consequences

- Registry items are real, type-checked Angular code in the workspace, and
  installs usually need no import rewriting.
- Snapshots add a committed file per released item version. That history is
  small JSON and is exactly what `ndop update` needs.
- `@ndop/schema`'s config schema gains `registry`.

## Amendment 1 (2026-10-03): `ndop build` details

Status: Accepted by Valery on 2026-10-03.

Implementing `ndop build` settled points this ADR left open:

1. **Themes are built from a stylesheet.** A `registry:theme` item without
   `cssVars` gets them from `themes/<name>/theme.css`: `:root` becomes
   `cssVars.light`, `.dark` becomes `cssVars.dark`, `@theme` becomes
   `cssVars.theme`, and each package `@import` becomes a `css` entry whose
   package must be in the item's `dependencies`. The
   `@media (prefers-color-scheme: dark)` block for
   `data-ndop-theme="system"` must repeat `.dark` exactly and isn't shipped:
   `ndop init` regenerates it. Anything else in the file fails the build.
   The token values thus live in one stylesheet that the harness imports
   directly. Ndop's default theme is the item `default`, matching
   `"style": "default"` in `ndop.json`.
2. **`@ndop/*` imports must be declared.** Only `@angular/*` is allowed
   without a `dependencies` entry. `@ndop/core` and `@ndop/primitives`
   need one like any package, because `ndop add` installs only what items
   declare.
3. **`@/` imports must stay valid after install.** A file reached through
   `@/a/b` must have the target `{a}/b.ts`, so the unchanged import finds it
   in the user's app.
4. **`angular.exports` is checked**: each name must be exported by one of
   the item's files.
5. **The compile check uses `ng new`'s compiler options** (`strict`,
   `strictTemplates` and the rest), so items are checked as strictly as the
   apps they land in. `--tsconfig <path>` extends a tsconfig and keeps its
   `paths`, for monorepos whose packages resolve through `paths`, as Ndop's
   do. `--no-compile` skips the check.
6. **Snapshots are frozen in CI.** A version with no snapshot fails the
   build when `--frozen-snapshots` is passed, or by default when the `CI`
   environment variable is set, as pnpm does for `--frozen-lockfile`. This
   way CI catches a snapshot that wasn't committed.
7. **Nothing is written when any check fails**, and nothing at all with
   `--dry-run`.
8. **Examples install to `{blocks}/examples/<name>.ts`**, outside `{ui}`, so
   copying an example doesn't add to the user's component folder.
9. **`r/index.json` lists items without file contents or `$schema`.**
