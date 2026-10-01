# Ndop UI

An agent-native, signals-first component ecosystem for Angular: owned code, a
registry, a CLI that can safely update code you've edited, and docs and
tooling built for both humans and coding agents.

> Pre-release. The design is [RFC-0001](rfcs/0001-ndop-ui.md); decisions
> that refine it are in [docs/adr](docs/adr).

| Path                     | What                                             |
| ------------------------ | ------------------------------------------------ |
| `apps/docs`              | Analog docs site                                 |
| `packages/*`             | Published `@ndop/*` packages                     |
| `registry/`              | Source of the copy-in registry items             |
| `tools/workspace-plugin` | Nx generators and inferred targets for this repo |
| `tools/update-fixtures`  | Fixtures for `ndop update` merges                |
| `tools/merge-spike`      | Phase 0 merge spike (temporary)                  |

See [CONTRIBUTING.md](CONTRIBUTING.md) to build and test. MIT licensed.
