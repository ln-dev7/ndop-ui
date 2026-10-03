# workspace-plugin

Ndop's local Nx plugin: the repeatable scaffolding and build steps of this
workspace (RFC-0001, "Nx-first workflow"). It is private and Nx loads it
from source, so it has no build target.

| Kind      | Name             | Does                                                                      |
| --------- | ---------------- | ------------------------------------------------------------------------- |
| Generator | `primitive`      | Scaffolds a headless primitive: folder, `spec.md`, directive and tests.   |
| Executor  | `registry-build` | Builds a registry with `ndop build` (ADR-0012); `registry:build` uses it. |
| Plugin    | `createNodes`    | Infers a `typecheck` target for every project, with `ngc` or `tsc`.       |

```bash
pnpm nx g @ndop/workspace-plugin:primitive <name> --pattern=<apg-slug> --dry-run
pnpm nx build registry
pnpm nx test workspace-plugin
```
