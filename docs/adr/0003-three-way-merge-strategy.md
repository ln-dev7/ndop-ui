# ADR-0003: Three-way merge strategy and structural merge scope

- Status: Accepted, with Amendment 1
- Date: 2026-10-01
- Phase: 0
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Three-way merge update algorithm"

## Context

Updating owned code is Ndop's main promise and its biggest risk. RFC-0001 sets
two targets: at least 8 of 10 clean merges in the Phase 0 spike, and at least
90% clean updates on the Phase 5 fixture suite. This ADR fixes the merge
approach the spike measures and the CLI later implements.

## Decision

### Algorithm

The RFC's nine steps stand unchanged. This ADR fixes the open details:

1. **Inputs.** `base` comes from the immutable `/r/<name>@<version>.json`
   recorded in the lockfile, `local` from disk, `remote` from the target
   version.
2. **Normalization before merging.** Line endings become LF and a single
   trailing newline is enforced on all three inputs; the user's line-ending
   style is restored on write. When the project has a Prettier config, `base`
   and `remote` are formatted with it before merging, because `ndop add`
   formatted the installed file with that config: the formatted `base` is what
   the user actually started from. The spike measures the merge rate with and
   without this step.
3. **Fast paths.** `hash(local) == lockfile hash` → write `remote`.
   `base == remote` → skip. `local == remote` → record as merged, no write.
4. **Line merge.** diff3 semantics equivalent to `git merge-file`, using
   `node-diff3` 3.2.1: pure JS (no `git` binary needed on user machines),
   ships types, and has a browser build for the docs' in-browser update
   preview. The spike cross-checks every fixture against `git merge-file` and
   fails if the two disagree.
5. **Conflict markers.** Two-way markers as the RFC specifies:
   `<<<<<<< local`, `=======`, `>>>>>>> ndop@<version>`. A `--diff3` flag that
   adds a `||||||| base` section can come later without changing this ADR.
6. **Structural pass for `.ts`.** Deferred to Phase 5, and built only if the
   Phase 5 fixture suite shows line merge alone below 90%. Its scope, if built:
   keys of the `variants()` object (each variant and size entry), keys of the
   `host` object, and class members. Anything it can't place falls back to the
   line merge.

### What counts as a clean merge

A merge counts as clean only if it produces no conflict **and** its output is
byte-identical to a hand-written `expected.ts` for that fixture. A
conflict-free but wrong merge counts as a failure. Fixtures whose edits really
do collide with upstream are marked `expect: conflict`; for those, the spike
checks that markers appear and that the file is otherwise intact, and they
count against the clean rate.

### The spike

- `tools/merge-spike` (private Nx project): a merge function plus a Vitest
  suite that runs every fixture, prints a results table and fails if fewer
  than 8 of 10 merge cleanly. Running it as a test makes CI enforce the
  Phase 0 acceptance criterion.
- Fixtures in `tools/update-fixtures/button/`: `base.ts` (v1.0.0, the RFC's
  styled `Button`), `remote.ts` (v1.1.0), and ten `cases/NN-name/` folders
  with `local.ts`, `expected.ts` (absent for a true conflict) and
  `case.json` (what the edit does, where it overlaps upstream, and any
  Prettier overrides of the user's config).
- The upstream change v1.0.0 → v1.1.0 is realistic: add an `xs` size, change
  the focus ring classes in `base`, add a `link` variant, and add a `loading`
  input with `aria-busy` and `data-loading` host bindings. (The plan said
  "add TSDoc"; v1.0.0 already carries TSDoc, as RFC-0001 requires, so a
  feature change replaced it.)
- The ten local edits model common customizations:

| #   | Local edit                                                | Upstream overlap                                         |
| --- | --------------------------------------------------------- | -------------------------------------------------------- |
| 01  | Restyle the `default` variant's colors                    | None                                                     |
| 02  | Add a `success` variant                                   | Adjacent to the new `link` variant                       |
| 03  | Add an `xl` size                                          | Adjacent to the new `xs` size                            |
| 04  | Change default size to `sm`                               | None                                                     |
| 05  | Rename class `Button` to `AppButton`                      | Near the new class TSDoc                                 |
| 06  | Add a `fullWidth` input and use it in `classes()`         | Near the new input TSDoc                                 |
| 07  | Add a `data-variant` host binding                         | None                                                     |
| 08  | Extend the selector to `[ndButton]` on `div[role=button]` | None                                                     |
| 09  | Reformat with Prettier `printWidth: 100`                  | Whole file                                               |
| 10  | Edit the `base` class string (shadow and radius)          | Same line as upstream's focus ring change: true conflict |

The table is a plan, not a prediction; the results below report what happened.

### Phase 5 handoff

The merge function moves into `@ndop/cli` in Phase 5 and `tools/merge-spike`
is deleted. The fixtures stay as the seed of the update e2e suite.

## Results

Measured on 2026-10-01 by `pnpm nx test merge-spike`, with fixtures in
`tools/update-fixtures/button` (v1.0.0 → v1.1.0). Each `expected.ts` was
written as explicit edits to `remote.ts` before any merge ran: the user's
change applied to the new version, with the user's additions placed after
upstream's.

| Case                 | line     | line + Prettier | line + Prettier + union | `git merge-file` agrees |
| -------------------- | -------- | --------------- | ----------------------- | ----------------------- |
| 01-restyle-variant   | clean    | clean           | clean                   | yes                     |
| 02-add-variant       | conflict | conflict        | clean                   | yes                     |
| 03-add-size          | clean    | clean           | clean                   | yes                     |
| 04-default-size      | clean    | clean           | clean                   | yes                     |
| 05-rename-class      | clean    | clean           | clean                   | yes                     |
| 06-add-input         | conflict | conflict        | clean                   | yes                     |
| 07-add-host-binding  | conflict | conflict        | clean                   | yes                     |
| 08-extend-selector   | clean    | clean           | clean                   | yes                     |
| 09-reformat          | conflict | clean           | clean                   | yes                     |
| 10-edit-base-classes | conflict | conflict        | conflict                | yes                     |
| **Clean**            | **5/10** | **6/10**        | **9/10**                |                         |

Findings:

- **The strategy as accepted (line + Prettier) scores 6/10, below the
  Phase 0 gate.**
- Prettier normalization works: it turns a whole-file reformat (09) from a
  conflict into a fast-path replace.
- Every remaining failure except 10 is the same shape: both sides appended to
  the same list (a variant, a class member, a host binding), so the base
  region between them is empty. Line merge can't order two insertions;
  keeping both, upstream first, gives exactly the expected file in all three
  cases.
- 10 is a true conflict and stays one under every strategy, with
  well-formed markers.
- node-diff3 and `git merge-file` agree on all ten plain line merges.
- Authoring rule this depends on: registry items write extensible objects
  (variant maps, size maps, `host`) one entry per line. Prettier preserves
  that layout, and it keeps independent entries on separate lines.

## Amendment 1 (2026-10-01): union of pure insertions

Status: Accepted by Valery on 2026-10-02. The Phase 0 gate in CI
(`merge-spike` test) is measured on this strategy.

Add to step 4: when a conflicting region has an **empty base side** (both
sides only inserted lines at the same point), keep both, upstream's lines
first, then the user's. Any region where either side changed or deleted base
lines is still a conflict.

- Why: it scores 9/10 on the fixtures, and it is a cheap stand-in for the
  structural pass (step 6) on exactly the cases that pass targets.
- Risk: two insertions that clash semantically, such as both adding the same
  object key with different values, merge silently. TypeScript rejects
  duplicate keys and members, so `ndop update` must type-check merged files
  and report a failure there as a conflict. That check lands with the CLI in
  Phase 5.
- The structural pass stays planned for Phase 5. Where it can place entries
  by key, it replaces the union for `.ts` files.

## Consequences

- Users don't need `git` installed for `ndop update` to merge; the `git`
  clean-tree check (RFC step 9) is skipped with a warning outside a repo.
- Formatting through the user's Prettier config makes the merge base match
  what the user received, at the cost of loading Prettier during `update`.
- If the spike lands below 8 of 10, Phase 0 is not accepted. The next step is
  to bring the structural pass forward, decided in an amendment to this ADR.
