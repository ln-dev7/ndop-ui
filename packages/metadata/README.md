# @ndop/metadata

Build-time extraction of Ndop UI component metadata (ADR-0007). For each
`registry:ui` item it reads the API with Angular's own documentation
extractor, adds what that misses (inputs forwarded through `hostDirectives`,
defaults, enum values, host data attributes), merges the composed
primitive's `spec.md` and the item's `docs.md`, and returns the content of
`metadata/<name>.json`. One file feeds the docs site, the playground, the
MCP server and `llms.txt`.

`ndop build` runs it; you rarely call it directly.

```ts
import { extractMetadata } from '@ndop/metadata';

const result = await extractMetadata({ root, items, tsconfig });
```

`@angular/compiler-cli`, `typescript` and, for bundle sizes, `esbuild` are
loaded from the registry's own project, so they are optional peer
dependencies.

## Docs

https://ndop.dev/docs
