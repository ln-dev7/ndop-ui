# Architecture decision records

Each ADR records one decision: its context, the decision and its consequences.
Write one before starting work in a new area, and before any deviation from
[RFC-0001](../../rfcs/0001-ndop-ui.md). Number them in order; never reuse a
number. A superseded ADR stays, with its status pointing to the replacement.

| ADR                                                      | Title                                                     | Status                         |
| -------------------------------------------------------- | --------------------------------------------------------- | ------------------------------ |
| [0001](0001-stack-and-pinned-versions.md)                | Stack and pinned versions                                 | Accepted                       |
| [0002](0002-registry-format-shadcn-superset.md)          | Registry format as a shadcn superset                      | Accepted, with amendments 1–2  |
| [0003](0003-three-way-merge-strategy.md)                 | Three-way merge strategy and structural merge scope       | Accepted, with amendments 1–2  |
| [0004](0004-primitives-on-aria-and-cdk.md)               | Primitives on `@angular/aria` + CDK, and custom fallbacks | Accepted, with amendments 1–5  |
| [0005](0005-directive-only-styled-api.md)                | Directive-only styled API                                 | Accepted, with amendments 1–2  |
| [0006](0006-shadcn-compatible-tokens.md)                 | Token naming compatible with shadcn                       | Accepted, with amendments 1–2  |
| [0007](0007-metadata-extraction.md)                      | Metadata extraction approach                              | Accepted, with amendments 1–2  |
| [0008](0008-docs-search.md)                              | Docs search on Algolia DocSearch                          | Accepted                       |
| [0009](0009-mcp-server.md)                               | MCP tool surface and transports                           | Accepted                       |
| [0010](0010-lockfile-and-update-safety.md)               | Lockfile format and update safety rules                   | Accepted                       |
| [0011](0011-cli-architecture.md)                         | CLI architecture and stack                                | Accepted, with amendments 1–3  |
| [0012](0012-registry-source-and-build.md)                | Registry source, build and distribution                   | Accepted, with amendment 1     |
| [0013](0013-icons-adapter.md)                            | Icons adapter on `@lucide/angular`                        | Accepted                       |
| [0014](0014-styled-items-and-examples.md)                | Styled items and examples                                 | Accepted, with amendments 1–5  |
| [0015](0015-registry-install-test.md)                    | Registry install test                                     | Accepted                       |
| [0016](0016-docs-site.md)                                | Docs site architecture and quality gates                  | Accepted, with amendments 1–15 |
| [0017](0017-agent-context-files.md)                      | Agent context files                                       | Accepted, with amendment 1     |
| [0018](0018-verify-and-eslint-plugin.md)                 | `ndop verify` and the ESLint plugin                       | Accepted, with amendment 1     |
| [0019](0019-agent-eval-suite.md)                         | Agent eval suite                                          | Accepted, with amendments 1–3  |
| [0020](0020-diff-and-update.md)                          | `ndop diff`, `ndop update` and the update preview         | Accepted, with amendment 1     |
| [0021](0021-catalog-completion.md)                       | Completing the v1 catalog                                 | Accepted, with amendments 1–5  |
| [0022](0022-blocks.md)                                   | Blocks and the blocks gallery                             | Accepted                       |
| [0023](0023-themes-and-theme-studio.md)                  | Themes, the theme studio and the theme gallery            | Accepted, with amendment 1     |
| [0024](0024-doctor.md)                                   | `ndop doctor`                                             | Accepted                       |
| [0025](0025-third-party-registries-and-shadcn-compat.md) | Third-party registries and the shadcn-compatible output   | Accepted, with amendment 1     |
| [0026](0026-brand-and-landing-page.md)                   | Brand, landing page and OG images                         | Accepted, with amendments 1–2  |
| [0027](0027-installable-docs.md)                         | Installable docs (favicons and PWA)                       | Accepted, with amendment 1     |
| [0028](0028-release-and-deploy.md)                       | The 1.0.0 release and the docs deployment                 | Accepted, with amendment 1     |
| [0029](0029-launch.md)                                   | Launch checklist and success metrics                      | Accepted                       |
| [0030](0030-compiled-guide-code.md)                      | Compiled guide code                                       | Accepted                       |
| [0031](0031-cli-entry-point.md)                          | `@ndop/cli` as the CLI's entry point                      | Accepted                       |
| [0032](0032-native-overlays.md)                          | Native modal dialogs and top-layer popovers               | Proposed with issue #3         |
