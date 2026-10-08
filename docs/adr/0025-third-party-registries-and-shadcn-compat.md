# ADR-0025: Third-party registries and the shadcn-compatible output

- Status: Accepted (approved by Valery on 2026-10-08)
- Date: 2026-10-08
- Phase: 6
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Registry spec"
  (namespaced registries, shadcn-compat mode), Goal G7, Phase 6; ADR-0002,
  ADR-0010, ADR-0012, ADR-0015

## Context

Phase 6 is accepted when "an external sample registry installs via `ndop
add @sample/widget`". It also delivers private registries, a "build your
own registry" guide and template repo, and `ndop build --compat shadcn`
with an e2e that installs a compat item through the shadcn CLI.

What exists:

- `ndop.json` `registries` (URL template with `{name}`, optional headers
  with `${VAR}`) and the client that resolves `@namespace/name`, with an
  error when a variable is unset. No test runs it against a real server.
- `ndop add <url>` is refused ("Installing items by URL isn't supported
  yet"). The lockfile's `registry` must be a namespace.
- `ndop build` is part of the published CLI.
- `packages/schema/src/lib/shadcn-compat.ts` converts items for shadcn
  (ADR-0002), keeping `registry:ui` and turning targets into `@ui/`
  placeholders.

The shadcn CLI, checked at 4.21.4 (released 2026-10-07) by reading its
source:

- `shadcn init` doesn't detect Angular CLI projects ("We could not detect
  a supported framework") and exits. Without a `components.json`, `shadcn
add` offers to run `init`, so it fails the same way, and `--yes` doesn't
  skip that prompt.
- **Universal items install anywhere:** an item of type `registry:item`
  whose files are all `registry:file` with a `target` installs with no
  `components.json`, no framework check and no transforms. `~/` in a
  target is the project root. Its npm `dependencies` are installed; its
  `cssVars` are silently skipped.
- `registry:ui` items need a `components.json`, which Angular users would
  have to write by hand, and then shadcn rewrites `@/` imports by its own
  rules.
- shadcn's namespaces use the same `{name}` URL template and `${VAR}`
  headers as Ndop's.

## Decision

### URL installs

- `ndop add <url>` and `ndop init --theme <url>` install an item from any
  HTTPS URL (HTTP only for localhost).
- The lockfile records the URL as the item's `source`, and `registry`
  becomes optional when `source` is set. Schema change, backward
  compatible.
- `ndop update` on a URL item fetches the URL again for the new version.
  For the merge base it tries `<url without .json>@<version>.json`, which
  `ndop build` emits. If that is missing, edited files are kept and
  reported as such, and untouched files are replaced.

### Sample registry and template

- `tools/registry-template` is a minimal third-party registry: a
  `registry.json` with one `widget` item that depends on Ndop's `button`,
  built with the published `ndop build`, and a GitHub Actions workflow
  that deploys `public/r` to GitHub Pages. It's tested here, so it can't
  rot.
- The public template repo is a copy of that folder. Creating it under the
  GitHub organization is Valery's step; the folder's README says how to
  keep it in sync.
- **The acceptance test:** a new `registries` case in the install test
  builds the template, serves it locally behind a bearer token, adds
  `"@sample": { "url": ".../{name}.json", "headers": { "Authorization":
"Bearer ${SAMPLE_TOKEN}" } }` to `ndop.json`, runs `ndop add
@sample/widget` (which also installs `button` from Ndop's registry),
  checks the lockfile, and builds the app. It also checks that a missing
  token fails with the variable's name. This covers namespaced and private
  registries at once.
- The guide, "Build your own registry", goes under a new Patterns section
  of the docs (ADR-0016, amendment 12).

### shadcn-compatible output

- `ndop build --compat shadcn` writes `/r/compat/<name>.json` for every
  `registry:ui`, `registry:block`, `registry:lib` and `registry:theme`
  item, as **universal items**: type `registry:item`, each file
  `registry:file` with a `target` under `~/` at Ndop's default aliases
  (`~/src/app/ui/…`, `~/src/app/lib/…`, `~/src/app/blocks/…`).
- shadcn won't rewrite imports in universal items, so the compat build
  rewrites `@/` imports between registry files to relative paths. They
  compile without a `tsconfig` alias.
- `registryDependencies` point at the dependencies' compat URLs.
- Themes become a CSS file, `~/src/ndop-theme.css`, since shadcn skips
  `cssVars` without a `components.json`.
- The item's `docs` field, which shadcn prints after installing, says what
  Ndop's `init` would otherwise do: import the theme CSS and add
  `provideNdop()` and the icon resolver.
- This replaces the converter in ADR-0002 (amendment 2 there).
- **E2E:** a `shadcn` case in the install test creates an Angular app with
  Tailwind, runs `npx shadcn@4.21.4 add <local>/r/compat/dialog.json`
  non-interactively, applies the documented steps, and builds. The shadcn
  version is pinned, because its CLI changes often. If its
  `registryDependencies` handling turns out to differ from what the source
  suggests, the compat build inlines dependencies' files instead, and this
  ADR records that.
- Three-way updates, aliases and agent context stay `ndop` features, as
  the RFC says.

## Consequences

- Any static host can serve a third-party registry, and the template shows
  how in one workflow.
- URL installs make themes from the studio and other sites one command.
- shadcn users can install Ndop items without `ndop`, at Ndop's default
  paths, at the cost of the setup steps `init` would do.
