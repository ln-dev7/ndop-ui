# size

Bundle-size budgets of the registry's components (ADR-0021).

```bash
pnpm nx run size:check
```

The `size` executor compiles every `registry:ui` item and the primitives
it composes ahead of time with `ngc`, bundles each item with esbuild and
gzips it, twice. Angular and `@ndop/core`'s shared utilities are always
left out, since every app has them once.

- **Own code** leaves out the Angular CDK too. Budgets in `budgets.json`
  (bytes; `default` for items without their own) apply to it, since it's
  the code Ndop controls.
- **With CDK** adds the CDK code the item pulls in, which overlays share:
  the first overlay an app adds costs about 10 kB more. It's reported,
  not budgeted (ADR-0021, amendment 1).

It fails when an item's own code is over budget, and writes
`dist/size/report.json`.
