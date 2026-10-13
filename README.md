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

See [CONTRIBUTING.md](CONTRIBUTING.md) to build and test, and
[ROADMAP.md](ROADMAP.md) for what comes after 1.0. MIT licensed.

## Acknowledgements

- [shadcn/ui](https://ui.shadcn.com) (MIT, copyright (c) 2023 shadcn): the
  styled items' classes and the default theme's palette are adapted from
  its new-york-v4 style. [`registry/vendor/shadcn`](registry/vendor/shadcn/new-york-v4/README.md)
  records what was copied and every difference. The registry serves the
  full notices at `/r/LICENSE.txt` ([`registry/LICENSE.txt`](registry/LICENSE.txt)).
- [Angular CDK](https://material.angular.dev/cdk) for overlays, focus
  management and keyboard handling.
- [Geist](https://vercel.com/font) (SIL Open Font License 1.1), the default
  theme's fonts, and [Lucide](https://lucide.dev) (ISC), the default icons,
  both installed from npm with their own licenses.
