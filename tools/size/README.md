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

Menu rows measure a complete public composition: the styled exports, the menu's
own primitive entry point and the generic menu entry point. `compositionEntries`
in the target config makes that list explicit and feeds the same sources to
AOT compilation and bundling. Removing forwarding exports must not make required
trigger code disappear from the measurement. Other registry rows measure their
styled exports and transitive dependencies. To additionally measure every export
of a whole primitive entry point, run:

```bash
pnpm nx check size --primitiveEntries=dialog
```

Compare revisions with identical composition entries, dependencies, compiler,
linker, minifier and gzip settings. The unchanged base is `bb3560d`; its runtime
sources are unchanged in the comparison. Bytes gzip:

| Complete menu composition | Base own | Pre-review PR own | Optimized own | Base with CDK | Optimized with CDK |
| ------------------------- | -------: | ----------------: | ------------: | ------------: | -----------------: |
| Dropdown Menu             |    3,584 |             6,759 |         6,442 |        23,363 |             25,666 |
| Context Menu              |    3,037 |             7,176 |         6,867 |        23,364 |             26,104 |
| Menubar                   |    3,481 |             6,690 |         6,368 |        23,413 |             25,753 |

The earlier styled-only menu figures omitted required primitive root triggers
and understated the cost after forwarding removal. They are superseded by this
table. The optimization uses the native implicit invoker anchor, numeric CSS
fallbacks and the already computed physical offsets, avoiding duplicated logical
position math, generated anchor names and mutations to the trigger's styles.
The net reduction is 317/309/322 bytes, including the closing-state correction.

**The original 4 kB own-code policy is still not met by these menus.** The three
8 kB allowances in `budgets.json` remain proposals in ADR-0032 and require
maintainer agreement. A passing check under those allowances does not establish
compliance with the original policy. Default budgets and measurement exclusions
are unchanged; no native code was moved into exempt shared packages.

The separately retained full `@ndop/primitives/dialog` entry changes from
2,396 to 3,205 bytes own code and from 12,124 to 2,971 bytes including CDK
(75.5% smaller with dependencies; 33.8% more own code). These figures include
the WebKit viewport scroll guard, not just the styled Dialog exports.
