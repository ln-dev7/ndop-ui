# registry

Ndop UI's own registry: the source of every item `ndop add` installs, built
into the static JSON served at `https://ndop.dev/r/` (ADR-0012).

## Layout

| Path                              | Holds                                                                                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registry.json`                   | The source manifest: every item, without file contents ([ADR-0002](../docs/adr/0002-registry-format-shadcn-superset.md)).                                               |
| `ui/<name>/<name>.ts`             | Styled items, installed to `{ui}/<name>/<name>.ts` ([ADR-0014](../docs/adr/0014-styled-items-and-examples.md)).                                                         |
| `lib/`                            | `utils` and `icons`, installed to `{lib}/`.                                                                                                                             |
| `examples/<item>-<case>.ts`       | Examples, installed to `{blocks}/examples/`.                                                                                                                            |
| `themes/<name>/theme.css`         | Theme tokens; `ndop build` turns them into the theme item's `cssVars`.                                                                                                  |
| `snapshots/<name>@<version>.json` | Built items, one per released version, committed. They are the merge bases of `ndop update`.                                                                            |
| `changelog/<name>.md`             | Release notes, a `## <version>` section per version ([ADR-0020](../docs/adr/0020-diff-and-update.md)).                                                                  |
| `vendor/shadcn/`                  | shadcn's sources, for the parity tests.                                                                                                                                 |
| `categories.ts`                   | The docs groups of components and the blocks gallery's categories; an item's first `categories` entry must be one ([ADR-0021](../docs/adr/0021-catalog-completion.md)). |
| `LICENSE.txt`                     | The license and third-party notices, served at `/r/LICENSE.txt` ([ADR-0014](../docs/adr/0014-styled-items-and-examples.md), amendment 2).                               |

Items import each other through `@/`, exactly as they do once installed:
`import { cn } from '@/lib/utils'`.

## Build

```bash
pnpm nx build registry
```

Runs `ndop build` through the `registry-build` executor and writes
`dist/registry/r/`. It fails on schema errors, imports that break the
dependency rules, type errors, and items changed without a version bump.

When you change an item, bump its `version` in `registry.json`, add a
`## <version>` section to `changelog/<name>.md` saying what changed for
someone updating, build, and commit the new snapshot with the change. In CI,
a version without a committed snapshot fails the build. Components, blocks
and themes also fail without a changelog section for every version; the
build adds what changed in the files, migrations, codemods and dependencies
to `r/changelog/<name>.json`.

When a version moves or deletes a file, list it in the item's
`migrations`, such as `{ "from": "ui/card/card.ts", "to": "ui/card/card-root.ts" }`
(no `to` for a deletion). When it renames an export or an input, add a
`codemods` entry with the version it starts in, so `ndop update` fixes
users' code:

```json
"codemods": [
  { "since": "0.3.0", "kind": "rename-export", "from": "ButtonSize", "to": "ButtonScale" },
  { "since": "0.3.0", "kind": "rename-input", "selector": "button[ndButton], a[ndButton]", "from": "size", "to": "scale" }
]
```

Keep every migration and codemod in later versions too: users may update
from any older version.

## Test

```bash
pnpm nx test registry
```

Parity tests compare each styled item's classes with shadcn's; every example
is rendered once. The harness (`apps/harness`) serves each example at
`/examples/<name>` for the e2e checks.
