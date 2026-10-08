# ADR-0020: `ndop diff`, `ndop update` and the update preview

- Status: Accepted (approved by Valery on 2026-10-08), with amendment 1.
  Deviates from RFC-0001 with a new package, `@ndop/merge`, and moves the
  site-wide docs version switcher to Phase 7
- Date: 2026-10-08
- Phase: 5
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "CLI", "Three-way merge
  update algorithm", "Documentation site" (changelog, update preview),
  Phase 5; ADR-0003, ADR-0010, ADR-0011, ADR-0012, ADR-0016

## Context

Phase 5 delivers the RFC's flagship feature:

- `ndop diff` and `ndop update`, with `--interactive`, migrations and
  codemods;
- an update e2e fixture suite;
- changelog pages with version diffs, and an in-browser "update preview".

It is accepted at ≥ 90% clean merges on the fixture suite, valid conflict
markers with a non-zero exit, and a correct lockfile after every run.

ADR-0003 fixes the merge: `node-diff3` line merge, Prettier normalization,
fast paths, two-way markers, and the union of pure insertions (amendment 1),
which brought the spike to 9/10. It leaves several things to Phase 5:

- moving the merge into the CLI;
- type-checking merged `.ts` files;
- the structural pass, to be built only if the suite scores below 90%.

ADR-0010 fixes the lockfile and the safety rules. This ADR fixes everything
else.

What exists today:

- Every published version is a committed snapshot, and `ndop build` serves
  each one at `/r/<name>@<version>.json` (ADR-0012). Button, Dialog, Input,
  Label, Popover, Separator and Tooltip have versions 0.1.0 to 0.1.2 or
  0.1.3.
- The item schema has `migrations` (`{ from, to? }`), but nothing uses it.
- `add` already replaces files whose hash matches and skips edited ones
  (ADR-0011, amendment 1).
- The docs list an item's versions but have no changelog. ADR-0016 deferred
  "version switcher, changelog diffs" to this phase.
- The docs app may import only `type:primitives`, `type:core`,
  `type:schema` and `type:registry` projects, so it can't reach the CLI's
  code.

## Decision

### One merge for the CLI and the browser: `@ndop/merge`

A new published package, `packages/merge` (`@ndop/merge`). It is a
deviation from RFC-0001's package list.

- **What it holds:** the spike's merge (normalization, fast paths, diff3,
  union of pure insertions, markers, EOL restore), the "partial remote" used
  by `--interactive`, and marker detection.
- **What it doesn't depend on:** Node APIs, Prettier or TypeScript. It
  takes already-normalized strings, so it runs unchanged in the browser.
  Its only dependency is `node-diff3`.
- **Project setup:** tag `type:merge`. Module boundaries let `type:tooling`
  (the CLI) and `type:app` (the docs) depend on it.
- **The spike retires:** its code moves here, and `tools/merge-spike` is
  deleted (ADR-0003, "Phase 5 handoff").
- **Why a package and not a copy:** the update preview has to produce
  exactly what `ndop update` would. One implementation is the only way to
  promise that.

### `ndop diff [items...]`

For every file of the given items (all installed items by default), it
shows two unified diffs:

- **Your changes:** the pristine base against the file on disk.
- **Upstream:** the pristine base against the pristine latest version, or
  `--to <version>`.

Other states it reports:

- pending files (ADR-0010: conflicts still to resolve, or files the user
  deleted);
- upstream file renames, deletions and codemods that `update` would apply.

`--json` returns per item: installed version, latest version, and per
file: path, state (`unchanged`, `edited`, `missing`, `conflicted`) and both
patches. It writes nothing, and exits 0 unless it errors.

### `ndop update [items[@version]...]`

The RFC's nine steps, with ADR-0003's details and ADR-0010's rules. Per
item:

- **Which items:** no argument means every installed item with a newer
  version. The default target is the latest version; `@version` pins one.
- **Order:** items are processed in dependency order. A newly added
  `registryDependency` is installed as `add` would; an outdated one is
  reported, not updated, unless it's named too.
- **npm dependencies:** new ones are installed. Removed ones are left in
  place and reported.
- **Order of work:** migrations, then codemods, then the per-file merge,
  then CSS variables, the lockfile and the agent files (ADR-0017).
- **Type-check after a union (ADR-0003, amendment 1):** when a `.ts` file
  merged using the union of insertions, the CLI type-checks it within the
  project's `tsconfig`, using ts-morph with the planned contents. If the
  merged file has errors the local file didn't have, the file is merged
  again without the union, so those regions become conflict markers. A
  silent duplicate key or member becomes a visible conflict.
- **CSS variables:** each variable gets a three-way merge, base, local and
  remote, in its own block (`:root`, `.dark`, `@theme`):
  - **Changed upstream and unedited locally:** it's updated.
  - **Edited locally:** the user's value stays, with a warning.
  - **New upstream:** it's added.
  - **Removed upstream:** it stays.

  A conflict on a token is never a marker in the stylesheet.

- **Output:** a table per item with item, from, to, and counts of files
  clean, merged and conflicted, like the RFC's. `--json` adds each file's
  status (`replaced`, `merged`, `unchanged`, `created`, `renamed`,
  `deleted`, `kept`, `conflict`, `unresolved`, `missing`) and its conflict
  lines.
- **Shared options:** `--dry-run` prints the planned diffs. `--yes`,
  `--cwd` and `--registry` are shared with `add`.
- **New options:** `--force` (ADR-0010, rule 2), `--continue` (ADR-0010,
  rule 6) and `--interactive`.

### `--interactive`

For each file that needs a real merge, the CLI shows upstream's hunks (base
against remote), one at a time, and the user accepts or skips each. The
accepted hunks are applied to the base to make a partial remote, which is
merged with the local file as usual. The result is a normal three-way merge,
so markers and the lockfile behave the same way.

- A skipped hunk stays skipped: the lockfile records the new version's
  pristine hash, so the next update won't offer it again.
- Fast-path files aren't asked about.
- `--interactive` needs a TTY. Without one it fails before planning, with
  exit code 1.

### Migrations

`migrations` keeps its schema (`{ from, to? }`, paths inside the registry
item, ADR-0002). An item lists every migration it has ever had, and
authors never remove one.

- A migration applies when the lockfile has a file installed from `from`
  and the target version has no file at `from`.
- **Rename:** the local file moves to the new target path with the user's
  edits. It's then merged with base = the old path at the old version and
  remote = the new path at the target version. Chains (a → b → c) are
  followed.
- **Deletion:** when there's no `to`, an unedited file is deleted, and an
  edited one is kept, dropped from the lockfile and reported as yours now.
- **Files that disappear without a migration** are kept, dropped from the
  lockfile, and reported.
- The write plan gains a `delete` action for these cases. `--dry-run` shows
  it.

### Codemods: declarative only

Registries are static JSON, and namespaced or private ones are third-party.
So Ndop never downloads code to run. A codemod is data that the CLI applies.
The item schema gains `codemods`:

```json
"codemods": [
  { "since": "0.3.0", "kind": "rename-export", "from": "ButtonSize", "to": "ButtonScale" },
  { "since": "0.3.0", "kind": "rename-input", "selector": "button[ndButton]", "from": "size", "to": "scale" }
]
```

- **When one runs:** when the update crosses its version (installed <
  `since` ≤ target). Like migrations, the list is cumulative.
- **Where:** on the project's own files under `src/`, not on the item's
  files, which the merge handles. The project's files must be clean too
  (ADR-0010, rule 2).
- **`rename-export`:** renames the imported name and its uses in files
  that import it from the item's module (ts-morph).
- **`rename-input`:** renames the attribute and its bindings (`from`,
  `[from]`, `(fromChange)`, `[(from)]`) on elements matching `selector`.
  This covers inline and external templates, which are parsed with the
  project's own `@angular/compiler`.
- **More kinds** come by amendment when a real breaking change needs them.
- **shadcn-compat output** drops `codemods`, as it drops `migrations`.

### Changelog data

- **Where notes are written:** each item's release notes go in
  `registry/changelog/<name>.md`, with one `## <version>` section per
  version. Snapshots are immutable, so the notes can't go inside them.
  Examples and lib items have no folder of their own, so the notes get a
  folder of their own instead of sitting beside the source.
- **What the build checks:** `ndop build` fails when a snapshot version of a
  `registry:ui`, `registry:block` or `registry:theme` item, the kinds with
  docs pages, has no section. For other items the notes are optional.
- **What the build emits:** `/r/changelog/<name>.json`. Per version, it
  holds the notes plus a summary computed from consecutive snapshots:
  files added, changed and removed; migrations; codemods; dependency
  changes. This summary is the RFC's "what `ndop update` will do" note.
- **Validation:** the format gets a schema in `packages/schema`.
- **Existing versions:** their notes are filled in from the git history of
  `registry/snapshots`.

### Docs: changelog and update preview

- **Changelog page:** each component gets one, at
  `/docs/components/<name>/changelog`. Every version shows its notes, its
  "what `ndop update` will do" summary, and a diff of each file against the
  version before, rendered with Shiki's diff notation, all prerendered. It
  has a `.md` twin and is linked from the component page's footer, which
  today lists versions as plain text.
- **What the update preview does:** on the changelog page, the user picks
  the installed version and a file, pastes their copy, and sees what
  `ndop update` to the latest version would produce. It runs `@ndop/merge`
  in the browser, with conflict markers highlighted.
- **Formatting in the preview:** Prettier's standalone build formats base
  and remote with its default options. The preview says that projects with
  a different Prettier config, or other import aliases, may merge
  differently.
- **Loading cost:** the preview is a lazily hydrated island, and Prettier
  loads only when the user runs a preview. That keeps it out of the page's
  Lighthouse budget (ADR-0016).
- **Site-wide version switcher:** deferred to Phase 7 (deviation). Until
  1.0 there is one docs version, and it covers both supported Angular
  majors. The changelog already shows every version of every component.
  ADR-0016's Phase 5 note moves to Phase 7.

### Update e2e fixture suite

- **Location:** `tools/update-fixtures` (the RFC's place). Each scenario is
  a mini registry, holding snapshots of one item at several versions, plus
  cases. Each case holds the local edits, the expected files, and the
  expected `ndop update --json` statuses, exit code and lockfile.
- **What a case covers:** realistic customizations of Ndop's own items,
  across Button, Dialog, Input, Label, Popover, Separator and Tooltip.
  It also covers:
  - multi-version jumps;
  - renames and deletions;
  - both codemod kinds;
  - CSS variables;
  - a new registry dependency;
  - CRLF;
  - a file the user deleted;
  - `--continue`;
  - a dirty tree.

  ADR-0003's ten Button cases carry over.

- **How cases are written:** each `expected` file is written by hand, before
  any merge runs, as ADR-0003 required. The case list is part of the
  Phase 5 plan Valery approves, so the suite isn't tuned to the merge.
  True conflicts are kept to the share real customizations would hit: 3
  of the 38 merge cases.
- **Two kinds of case.** Merge cases count toward the clean rate. Behavior
  cases (a dirty tree, unresolved markers, `--continue`, a file the user
  deleted, a missing TTY) aren't merges, and every one of them must pass.
- **How it runs:** a workspace-plugin executor, `update-e2e`, uses the
  built CLI. For each case it:
  1. copies the CLI's Angular 22 fixture project into a temp folder;
  2. runs `git init`;
  3. runs `ndop add <item>@<base>` against the scenario's registry over
     `file:`;
  4. applies the edits and commits them;
  5. runs `ndop update --json`;
  6. checks files, statuses, exit code and lockfile (ADR-0010, rule 10);
  7. checks that a second run plans nothing.

  It prints a results table and fails when merge cases are below 90%
  clean, or when any behavior case fails. Clean means no conflict and
  byte-identical to `expected`, as in ADR-0003. Expected conflicts count
  against the rate.

- **One real-app case:** in the registry install test, `ndop add
button@0.1.0`, a local edit, `ndop update`, then `ng build`.
- **The structural `.ts` pass** is built only if the suite lands below 90%,
  as ADR-0003 says. The result goes into this ADR.

### Out of scope

- An MCP `update` tool. `get_project_context` gains the `conflicted` state
  only.
- A `--diff3` marker style (ADR-0003).
- Downgrades.

## Consequences

- One more published package. In exchange, the in-browser preview and the
  CLI produce exactly the same merge.
- Third-party registries can ship breaking changes with codemods without
  shipping code. In exchange, codemods are limited to the kinds the CLI
  knows.
- Every release of a documented registry item now needs a changelog
  section, which the build enforces.
- The fixture suite, not the spike, becomes the CI gate for merge quality.

## Amendment 1 (2026-10-08): the update preview doesn't format by default

Status: Accepted by Valery on 2026-10-08.

"Docs: changelog and update preview" says the preview formats base and
remote with Prettier's default options. Those defaults use double quotes,
while Ndop's files and most Angular projects use single quotes, so a
typical pasted file would differ on almost every line and merge as one
large conflict.

- **No formatting by default.** The preview merges against the
  registry's text as it is. It is already formatted the way `ndop add`
  writes it in a project without a Prettier config of its own.
- **"My project formats differently"** is an opt-in setting with the two
  options that change most lines: quotes and print width. Only when it's
  on does the page load Prettier's standalone build, to format base and
  remote with those options.
- **A note on import aliases:** a project whose `ndop.json` aliases differ
  from the registry's `@/` gets other import paths. Those lines can show
  up as changes.

## Results

Measured on 2026-10-08 by `pnpm nx e2e update-fixtures`, on Node 22 and 24,
with ADR-0003's structural pass (amendment 2). The suite has 39 merge
cases, case 39 added with that amendment, and 8 behavior cases.

| Case                                        | Result   |
| ------------------------------------------- | -------- |
| brand/33-brand-new-tokens                   | clean    |
| brand/34-brand-keep-your-token              | clean    |
| button/01-restyle-variant                   | clean    |
| button/02-add-variant                       | clean    |
| button/03-add-size                          | clean    |
| button/04-default-size                      | clean    |
| button/05-rename-class                      | clean    |
| button/06-add-input                         | clean    |
| button/07-add-host-binding                  | clean    |
| button/08-extend-selector                   | clean    |
| button/09-reformat                          | clean    |
| button/10-edit-base-classes                 | conflict |
| button/26-button-xl-clash                   | conflict |
| button/37-button-crlf                       | clean    |
| button/38-button-wide-prettier              | clean    |
| card/27-card-move-edited                    | clean    |
| card/28-card-move-untouched                 | clean    |
| card/29-card-move-twice                     | clean    |
| card/30-card-keep-edited-deleted            | clean    |
| chips/35-chips-new-item                     | clean    |
| chips/36-chips-new-package                  | clean    |
| dialog/24-dialog-add-body                   | clean    |
| dialog/25-dialog-remove-description         | clean    |
| dialog-docs/39-dialog-body-next-to-new-docs | clean    |
| input/22-input-add-ghost-variant            | clean    |
| input/23-input-rounder-base                 | conflict |
| snapshots/11-button-restyle-outline         | clean    |
| snapshots/12-button-add-xl-size             | clean    |
| snapshots/13-dialog-darker-overlay          | clean    |
| snapshots/14-dialog-wider-content           | clean    |
| snapshots/15-dialog-add-body                | clean    |
| snapshots/16-input-taller                   | clean    |
| snapshots/17-label-larger-text              | clean    |
| snapshots/18-popover-wider                  | clean    |
| snapshots/19-separator-muted                | clean    |
| snapshots/20-tooltip-primary-colors         | clean    |
| snapshots/21-tooltip-add-arrow              | clean    |
| stat/31-stat-rename-export                  | clean    |
| stat/32-stat-rename-input                   | clean    |
| button/40-dirty-tree                        | passed   |
| button/41-dirty-tree-forced                 | passed   |
| button/42-unresolved-markers                | passed   |
| button/43-continue                          | passed   |
| button/44-deleted-locally                   | passed   |
| button/45-interactive-without-terminal      | passed   |
| button/46-older-target                      | passed   |
| button/47-outside-git                       | passed   |

- **Clean merges: 36/39 (92.3%).** The three that aren't clean are the
  true conflicts, each with well-formed markers and exit code 2. In 26,
  keeping both sides' additions would duplicate the `xl` key; the type
  check turns it into a conflict.
- **Every behavior case passes**, and no case breaks a rule: exit codes
  match the statuses, markers are well formed, every lockfile hash is what
  a fresh install of its version records, and a second run plans nothing.
- **Line merge alone scored 34/38** before case 39, and 34/39 with it.
  Case 24 merged in a different order from the expected file. Case 39
  merged "cleanly" with TSDoc comments on the wrong declarations, as
  `git merge-file` does too. Both pass with the structural pass.
- **The registry install test** adds `button@0.1.0` to a real Angular 22
  app, edits it, runs `ndop update` and builds again; it passes.
- **Fixture bugs fixed during the run:** the one-off script that wrote the
  cases produced three inconsistent fixtures: a blank line at the end of
  case 25, an anchor that moved between versions in case 24, and DialogTitle's
  TSDoc dropped from Dialog 1.0.0. Each was fixed to match its description,
  with the expected file written before rerunning; none was copied from merge
  output.
