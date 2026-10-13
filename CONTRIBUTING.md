# Contributing to Ndop UI

[RFC-0001](rfcs/0001-ndop-ui.md) is the source of truth for what Ndop is and
how it is built; decisions that refine it live in [docs/adr](docs/adr).
Open an issue before starting anything large.

## Setup

Use the Node version in `.nvmrc` and the pnpm version in `package.json`'s
`packageManager` field.

```bash
pnpm install
```

## Everyday commands

All tasks run through Nx.

| Task                          | Command                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| Everything CI runs            | `pnpm nx run-many -t lint typecheck test build e2e`                      |
| Only what your change affects | `pnpm nx affected -t lint typecheck test build e2e`                      |
| Docs dev server               | `pnpm nx serve docs`                                                     |
| Format check / fix            | `pnpm nx format:check` / `pnpm nx format:write`                          |
| New primitive                 | `pnpm nx g @ndop/workspace-plugin:primitive <name> --pattern=<apg-slug>` |
| Merge tests (Button fixtures) | `pnpm nx test merge`                                                     |

## Rules

- Scaffold with `nx g` (check `--help`, run `--dry-run` first). Ndop's own
  shapes come from `@ndop/workspace-plugin` generators.
- Every export has TSDoc; lint enforces it. Inline comments explain why,
  never what. No commented-out code, and no TODO without an issue link.
- Deviating from the RFC needs an ADR first.
- Changes to published packages need a changeset: `pnpm changeset`.

## Definition of done for a component

From [RFC-0001](rfcs/0001-ndop-ui.md), "Component catalog and definition of
done": nothing ships until it meets every item below. Items with no
behavior beyond native HTML (Card, Table, Alert and the like) have no
primitive or `spec.md` of their own; [ADR-0021](docs/adr/0021-catalog-completion.md)
lists them.

- [ ] `spec.md` with ARIA pattern, roles, keyboard map, focus rules, RTL notes
- [ ] Primitive with signals API, controlled and uncontrolled modes, forms
      integration where it bears a value
- [ ] Styled item using tokens only, logical properties only, `class` input
      merged last
- [ ] At least two examples, including one realistic one (e.g. dialog with
      a form)
- [ ] Unit, axe, keyboard, SSR, zoneless and visual tests passing in light,
      dark and RTL
- [ ] Metadata complete (every public input described), docs page
      generated, `.md` twin present
- [ ] Within its bundle-size budget
- [ ] Installs and builds in the registry e2e; covered in the agent eval suite

Scaffold a component with the `primitive`, `styled-item` and `example`
generators, so it starts in the same shape as the others.

## Adding a theme

A theme is a `registry:theme` item: CSS variables for light and dark
([ADR-0023](docs/adr/0023-themes-and-theme-studio.md)). The `theme`
generator copies the default theme's tokens into
`registry/themes/<name>/theme.css` and adds its `registry.json` entry at
0.1.0 and its changelog. Community themes pass `--author`, which the
gallery shows.

```bash
pnpm nx g @ndop/workspace-plugin:theme ocean --description="Cool blues for calm dashboards." --author="Your name" --dry-run
```

Then:

1. Edit the values in `theme.css`. The [theme studio](https://ndop.dev/themes/studio)
   shows the contrast of each pair as you go.
2. Build the registry with `pnpm nx build registry`. It fails when a
   foreground and background pair is under 4.5:1, in light or in dark.
3. If the theme uses another font, load it in the harness's stylesheet; a
   unit test names the `@fontsource` import it needs.
4. Add its theme sheet baselines, light and dark, with
   `pnpm nx run harness-e2e:visual:update --grep="theme-sheet ocean"`.
   The visual tests run the browser in Docker.

## Adding a block

A block is a `registry:block` item: a page-level composition of registry
components that compiles with mock data
([ADR-0022](docs/adr/0022-blocks.md)). The `block` generator writes the
page component at `registry/blocks/<name>/<name>.ts`, its `registry.json`
entry at 0.1.0 with its gallery category, its changelog, and the harness
route that renders and tests it.

```bash
pnpm nx g @ndop/workspace-plugin:block login-03 --category=auth --description="A login form beside an image." --dry-run
```

`--category` is one of `auth`, `dashboard`, `settings`, `data-table`,
`sidebar` or `marketing`. Then:

1. Build the page from registry items, importing them from `@/ui/…`, and
   list them in its `registryDependencies`.
2. Build the registry with `pnpm nx build registry`, which type-checks it.
3. Add its visual baselines with
   `pnpm nx run harness-e2e:visual:update --grep=login-03`. The harness's
   e2e also checks it with axe and renders it on the server.
4. The registry install test, `pnpm nx e2e registry-e2e`, installs and
   builds every block.
