# Architecture decision records

Each ADR records one decision: its context, the decision and its consequences.
Write one before starting work in a new area, and before any deviation from
[RFC-0001](../../rfcs/0001-ndop-ui.md). Number them in order; never reuse a
number. A superseded ADR stays, with its status pointing to the replacement.

| ADR                                             | Title                                                     | Status                        |
| ----------------------------------------------- | --------------------------------------------------------- | ----------------------------- |
| [0001](0001-stack-and-pinned-versions.md)       | Stack and pinned versions                                 | Accepted                      |
| [0002](0002-registry-format-shadcn-superset.md) | Registry format as a shadcn superset                      | Accepted, with amendment 1    |
| [0003](0003-three-way-merge-strategy.md)        | Three-way merge strategy and structural merge scope       | Accepted, with amendment 1    |
| [0004](0004-primitives-on-aria-and-cdk.md)      | Primitives on `@angular/aria` + CDK, and custom fallbacks | Accepted, with amendments 1–2 |
| [0005](0005-directive-only-styled-api.md)       | Directive-only styled API                                 | Accepted, with amendment 1    |
| [0006](0006-shadcn-compatible-tokens.md)        | Token naming compatible with shadcn                       | Accepted, with amendment 1    |
| [0007](0007-metadata-extraction.md)             | Metadata extraction approach                              | Accepted, with amendment 1    |
| [0008](0008-docs-search.md)                     | Docs search on Algolia DocSearch                          | Accepted                      |
| [0011](0011-cli-architecture.md)                | CLI architecture and stack                                | Accepted, with amendment 1    |
| [0012](0012-registry-source-and-build.md)       | Registry source, build and distribution                   | Accepted, with amendment 1    |
| [0013](0013-icons-adapter.md)                   | Icons adapter on `@lucide/angular`                        | Accepted                      |
| [0014](0014-styled-items-and-examples.md)       | Styled items and examples                                 | Accepted                      |
| [0015](0015-registry-install-test.md)           | Registry install test                                     | Accepted                      |
| [0016](0016-docs-site.md)                       | Docs site architecture and quality gates                  | Accepted, with amendments 1–2 |

Numbers 0009 and 0010 are reserved for the ADRs RFC-0001 schedules in later
phases.
