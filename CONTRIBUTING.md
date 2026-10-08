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

- [ ] `spec.md` with ARIA pattern, roles, keyboard map, focus rules, RTL notes
- [ ] Primitive with signals API, controlled and uncontrolled modes, forms
      integration where it bears a value
- [ ] Styled item using tokens only, logical properties only, `class` input
      merged last
- [ ] At least two examples, including one realistic one
- [ ] Unit, axe, keyboard, SSR, zoneless and visual tests passing in light,
      dark and RTL
- [ ] Metadata complete, docs page generated, `.md` twin present
- [ ] Within its bundle-size budget
- [ ] Installs and builds in the registry e2e; covered in the agent eval suite
