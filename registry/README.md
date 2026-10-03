# registry

Ndop UI's own registry: the source of every item `ndop add` installs, built
into the static JSON served at `https://ndop.dev/r/` (ADR-0012).

## Layout

| Path                              | Holds                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `registry.json`                   | The source manifest: every item, without file contents ([ADR-0002](../docs/adr/0002-registry-format-shadcn-superset.md)). |
| `ui/<name>/<name>.ts`             | Styled items, installed to `{ui}/<name>/<name>.ts` ([ADR-0014](../docs/adr/0014-styled-items-and-examples.md)).           |
| `lib/`                            | `utils` and `icons`, installed to `{lib}/`.                                                                               |
| `examples/<item>-<case>.ts`       | Examples, installed to `{blocks}/examples/`.                                                                              |
| `themes/<name>/theme.css`         | Theme tokens; `ndop build` turns them into the theme item's `cssVars`.                                                    |
| `snapshots/<name>@<version>.json` | Built items, one per released version, committed. They are the merge bases of `ndop update`.                              |
| `vendor/shadcn/`                  | shadcn's sources, for the parity tests.                                                                                   |

Items import each other through `@/`, exactly as they do once installed:
`import { cn } from '@/lib/utils'`.

## Build

```bash
pnpm nx build registry
```

Runs `ndop build` through the `registry-build` executor and writes
`dist/registry/r/`. It fails on schema errors, imports that break the
dependency rules, type errors, and items changed without a version bump.

When you change an item, bump its `version` in `registry.json`, build, and
commit the new snapshot with the change. In CI, a version without a committed
snapshot fails the build.

## Test

```bash
pnpm nx test registry
```

Parity tests compare each styled item's classes with shadcn's; every example
is rendered once. The harness (`apps/harness`) serves each example at
`/examples/<name>` for the e2e checks.
