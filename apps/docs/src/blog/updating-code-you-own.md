---
title: 'Updating code you own: three-way merges in a component registry'
description: How Ndop UI merges upstream fixes into components you copied and edited, using snapshots, a lockfile and a three-way merge, and how often it works.
date: 2026-10-15
author: Valery Melou
---

Copy-paste component registries made one trade popular: instead of a
package you can't touch, you get the source. The CLI writes a Button into
your app, and from then on it is your file. You change the colors,
add a size, rename the class. Nothing in `node_modules` fights you.

The trade has a cost that shows up later. Upstream fixes a focus ring,
adds an `aria-busy` binding, or reworks a variant. Your copy doesn't
change, and the usual ways to pick up the fix are to add the component
again over your copy, losing your edits, or to read the upstream diff and
copy it across by hand. Skip both, and the copy falls further behind its
source with every release.

Ndop UI is an Angular registry built around that problem: its CLI
installs components as source files, and `ndop update` merges upstream's
changes into the files you edited. This post explains how, where it
stops, and how well it does on its tests.

## A merge needs a base

Merging two versions of a file needs a third: the version both sides
started from. Git has it for branches. A copied component usually doesn't:
once the file is in your repository, nothing records which release it
came from or what it looked like before you touched it. Ndop records both.

### Snapshots of every release

Every item in the registry has a version, and changing what an item
builds to requires a new one. `ndop build` writes each version to
`registry/snapshots/<name>@<version>.json`, committed to git, and serves
it at `/r/<name>@<version>.json`. Snapshots never change: the build fails
if a version's snapshot exists and the new build differs from it, and in
CI it fails if a version has no snapshot. So any version you installed
can be fetched again, byte for byte.

### The lockfile

`ndop add` writes `ndop.lock.json` in your project. For each
item it records the registry, the version, and for each file its path and
a SHA-256 hash. Here is Button's entry in a test project after an update:

```json title="ndop.lock.json"
{
  "$schema": "https://ndop.dev/schema/lock.json",
  "lockfileVersion": 1,
  "items": {
    "@ndop/button": {
      "name": "button",
      "registry": "@ndop",
      "version": "1.1.0",
      "files": [
        {
          "path": "src/app/ui/button/button.ts",
          "sha256": "8f2bb1b05598b66203b82137bbec58aaec5028ff5cc28d829b3b5df70e67710b"
        }
      ]
    }
  }
}
```

The hash is not the hash of the file on disk. It is the hash of the
_pristine_ file at its base version: the snapshot's text after the same
steps `ndop add` applies when it writes a file into your project. Imports
are rewritten from the registry's `@/` alias to your project's aliases,
the file is formatted with your Prettier config if you have one, and line
endings are normalized. That rebuilt text is what you actually received,
so it is the base the merge needs.

Recording the pristine hash, rather than the bytes written, matters after
the first update. If the lockfile recorded the merged file's hash, the
next update would see a matching hash, decide the file had never been
edited, and replace it with upstream's version, dropping your changes.
With the pristine hash, a file you edited keeps looking edited, and is
merged again next time.

## What `ndop update` does to each file

For every file of every item being updated, the CLI builds three texts:
the base (pristine, at the version in the lockfile), yours (the file on
disk), and the target (pristine, at the new version). Then:

1. **Unedited files are replaced.** If your file still hashes to the
   lockfile's value, you never changed it, and it becomes the new version.
2. **Unchanged files are skipped.** If the base and the target are the
   same, there is nothing to apply.
3. **Everything else is merged.** A line-based three-way merge with the
   semantics of `git merge-file`, implemented in JavaScript with
   `node-diff3`, so you don't need `git` installed for it to work. The
   merge's unit tests run `git merge-file` on the original ten Button
   cases and check that the two agree.

Line merging alone has a weak spot in component files. Registries write
extensible objects one entry per line: the variant map, the size map, the
`host` bindings. When you add an entry at the end of a map and upstream
adds one at the same place, both sides inserted lines at the same point.
A line merge can't order two insertions, so it reports a conflict, even
though the obvious answer is to keep both.

So `@ndop/merge` adds one rule: when a conflicting region is made only of
insertions on both sides, with no base lines changed or deleted, it keeps
both, upstream's lines first, then yours. A region where either side
changed or removed existing lines is still a conflict.

That rule could merge two things that clash, such as both sides adding
the same object key with different values. TypeScript rejects duplicate
keys and members, so after a union in a `.ts` file, the CLI type-checks
the merged file within your project's `tsconfig`. If it has errors your
own file didn't have, the file is merged again without the union, and
those regions become conflict markers. A silent duplicate becomes a
visible conflict.

For TypeScript there is one more pass. `@ndop/merge` first splits each
of the three versions into top-level declarations (classes, functions,
types, variable statements, the import block) and merges them by kind and
name: a declaration in all three is line-merged on its own, and one added
on either side is kept, yours after the declaration that precedes it in
your file. The splitter is a small tokenizer, not a parser, so it also
runs in the browser. A file it can't split goes through line merge alone.

Two test cases called for it. In one, upstream adds a `DialogFooter`
after `DialogHeader` while you add a `DialogBody` at the same point; the
two directives share boilerplate, the line merge aligns it, and the
result is valid code in the wrong order. In the other, upstream also
documents an existing declaration, and line merge, like `git merge-file`,
puts TSDoc comments on the wrong declarations. That compiles, so the type
check can't catch it. Merging by declaration fixes both.

## An example

The test suite's Button fixture is a small styled Button written for this
work. Its version 1.1.0 adds an `xs` size, a `link` variant and a
`loading` input with `aria-busy` and `data-loading` bindings, and changes
the focus ring classes. One test case installs 1.0.0 and adds an `xl`
size at the end of the size map:

```ts nocheck="a deliberate fragment: the size map of your copy"
size: {
  sm: 'h-8 px-3',
  md: 'h-9 px-4',
  lg: 'h-10 px-6',
  icon: 'size-9',
  xl: 'h-12 px-8 text-base', // [!code ++]
},
```

Upstream, the same map gains `xs` at the top:

```ts nocheck="a deliberate fragment: the size map upstream"
size: {
  xs: 'h-7 px-2 text-xs', // [!code ++]
  sm: 'h-8 px-3',
  md: 'h-9 px-4',
  lg: 'h-10 px-6',
  icon: 'size-9',
},
```

After `ndop update`, the file is upstream's 1.1.0 with your size kept:
the new focus ring, the `link` variant and the `loading` input are all
there, and so is `xl`. Expanded, the file highlights the two sizes.

````ts title="src/app/ui/button/button.ts" {16,21} collapse
import { booleanAttribute, computed, Directive, input } from '@angular/core';
import { cn, variants, type VariantOf } from '@ndop/core';

const buttonVariants = variants({
  base: 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      outline: 'border border-input bg-background hover:bg-accent',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      xs: 'h-7 px-2 text-xs',
      sm: 'h-8 px-3',
      md: 'h-9 px-4',
      lg: 'h-10 px-6',
      icon: 'size-9',
      xl: 'h-12 px-8 text-base',
    },
  },
  defaults: { variant: 'default', size: 'md' },
});

/**
 * Styled button. Apply to a native `button` or `a`.
 *
 * @example
 * ```html
 * <button ndButton variant="outline">Cancel</button>
 * ```
 */
@Directive({
  selector: 'button[ndButton], a[ndButton]',
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() || null',
    '[attr.data-loading]': 'loading() ? "" : null',
  },
})
export class Button {
  /** Visual style. */
  readonly variant = input<VariantOf<typeof buttonVariants, 'variant'>>('default');
  /** Height and padding. */
  readonly size = input<VariantOf<typeof buttonVariants, 'size'>>('md');
  /** Extra classes, merged last so they win. */
  readonly class = input('');
  /** Shows a busy state and sets `aria-busy` while an action runs. */
  readonly loading = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() => cn(buttonVariants({ variant: this.variant(), size: this.size() }), this.class()));
}
````

This is the file the test expects, written by hand before the merge ran,
and the merge produces it byte for byte. The landing page's update demo
plays the same case.

## When both sides changed the same line

Some edits really do collide. Another case rounds the button and adds a
shadow in the `base` class string, the same line where upstream changed
the focus ring. No rule can know which classes you want, so the file gets
conflict markers, with your line first:

```ts nocheck="a deliberate fragment: a file with conflict markers"
const buttonVariants = variants({
<<<<<<< local
  base: 'inline-flex items-center justify-center gap-2 rounded-full shadow-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
=======
  base: 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
>>>>>>> ndop@1.1.0
```

The command reports each conflict's file and line and exits with code 2.
The rest of the file is merged, and the item moves to the new version,
while the conflicted file keeps its old base and hash in the lockfile. A
later update won't merge a file that still has markers; it reports it as
unresolved and exits with 2 again.

You edit the line to keep what you want, then record it:

```bash pm
npx @ndop/cli update --continue
```

`--continue` doesn't merge again. It records each resolved file at the new
version with that version's pristine hash. Merging again would bring back
any upstream change you dropped on purpose.

Updates are also easy to undo. The CLI plans every file, lockfile change
and package before writing anything, and the files an update writes must
have no uncommitted changes, so `git checkout` reverts it. `--force`
skips that check.

## Renames, removals and breaking changes

A merge handles edits inside a file. Releases also move files, delete
them, and rename things you use.

- **Moved files.** An item lists its migrations, `{ from, to }` paths
  inside the item. When a version moves a file, your edited copy moves to
  the new path and is then merged, with the old path at the old version as
  its base.
- **Removed files.** When a migration removes a file (it has no `to`), an
  unedited copy is deleted, and an edited one is kept, dropped from the
  lockfile, and reported as yours. A file that disappears without a
  migration is kept and reported the same way.
- **Renamed APIs.** An item can declare codemods. There are two kinds:
  `rename-export`, which renames an imported name and its uses in files
  that import it from the item, and `rename-input`, which renames an input
  and its bindings on elements matching a selector, in inline and external
  templates. They run on your own files under `src/`; the item's own
  files are merged as usual.

Codemods are data the CLI applies, never code it downloads and runs:
registries are static JSON, and a third-party registry shouldn't be able
to run code on your machine through an update.

Theme variables get their own three-way merge, one variable at a time: a
value you didn't touch follows upstream, a value you changed stays yours
with a warning, and new variables are added. A token conflict never
becomes a marker in your stylesheet.

## Seeing an update before running it

Releases come with notes: `ndop build` fails when a version of a
component, block or theme has none. Each component's changelog page
shows them with a summary of what `ndop update` will do (files added,
changed and removed, migrations, codemods, dependency changes) and a diff
of each file against the previous version.

In the terminal, `ndop diff` shows your changes since you installed a
component and upstream's changes since that version, and writes nothing:

```bash pm
npx @ndop/cli diff button
```

`ndop update --dry-run` prints the planned changes as diffs, and
`--interactive` shows upstream's hunks one at a time so you can take some
and skip others; a skipped hunk stays skipped on later updates.

The changelog pages also have an update preview: paste your copy of a
file, pick the version you installed, and the page runs `@ndop/merge` in
the browser to show what the update would produce, conflict markers
included. It is the package the CLI runs, which is why the merge has no
Node dependencies.

## How well it works

The merge is measured by a fixture suite. Each case installs an item at
one version in a copy of the CLI's Angular 22 fixture project, applies a
user's edits, and runs `ndop update`. Expected files are written by hand
before any merge runs, never copied from its output. A merge is clean
only if nothing conflicts and every file matches byte for byte; expected
true conflicts count against the rate.

The 39 merge cases cover customizations of Ndop's own Button, Dialog,
Input, Label, Popover, Separator and Tooltip, plus multi-version jumps,
moved and deleted files, both codemod kinds, theme variables, a new
registry dependency, CRLF line endings and a reformatted file. Eight
behavior cases cover a dirty working tree with and without `--force`,
unresolved markers, `--continue`, a file you deleted, `--interactive`
without a terminal, an older target and a project outside git.

The recorded results:

| Merge                               | Clean merges  |
| ----------------------------------- | ------------- |
| Line merge with the union rule      | 34/39         |
| The same, after the structural pass | 36/39 (92.3%) |

The three misses are the three cases written as true conflicts, the
base-class edit above among them, and each ends with well-formed markers
and exit code 2. In one of them, keeping both sides' additions would have
duplicated the `xl` key; the type check turned it into a conflict. Every
behavior case passes, and for every case the suite also checks that each
lockfile hash is what a fresh install of that file's version records, and
that running the update a second time plans nothing.

The suite grew from ten Button cases, which merged 5 of 10 cleanly with
plain line merge, 6 with Prettier formatting the base and target, and 9
with the union rule. The tenth is the base-class conflict, a conflict
under every strategy.

The suite runs in CI whenever the CLI or the merge changes, and fails
below 90% clean or on any failing behavior case. Separately, the registry
install test creates an Angular 22 app with `ng new`, adds
`button@0.1.0`, edits it, runs `ndop update`, and builds the app again.

## What it means for agents

Agents that edit your components update them with the same CLI. Its
`--json` output gives each file's status (such as `merged`, `conflict` or
`unresolved`) and conflict lines, and the exit codes are fixed: 0 for
success, 1 for an error with nothing written, 2 for conflicts, so an agent
or a CI job doesn't parse text. Ndop's MCP server has no update tool, but its project context
lists the files you edited and those that still have markers from an
update, with the `--continue` command to run once they are resolved.

## Try it

In an Angular app, set up Ndop and add a component:

```bash pm
npx @ndop/cli init
```

```bash pm
npx @ndop/cli add button
```

Edit `src/app/ui/button/button.ts` however you like and commit it. When a
new version of Button is released, update:

```bash pm
npx @ndop/cli update
```

`ndop init` also adds `@ndop/cli` to your dev dependencies, so from then
on `npx ndop update` runs your project's own copy. The
[CLI guide](/docs/getting-started/cli) covers every option, and the
[Button changelog](/docs/components/button/changelog) shows what each
version changed.
