---
title: CLI
description: The ndop command, its options, and how it keeps every change previewable and repeatable.
order: 5
---

The `ndop` CLI sets up your app and adds components to it. Every command
plans its changes first, then applies them: `--dry-run` shows the plan as
diffs, and running a command twice changes nothing the second time.

Run it with your package manager's runner, as in `npx @ndop/cli init`; the
tabs on each command show the pnpm, Yarn and Bun forms. `ndop init` adds
`@ndop/cli` to your dev dependencies, as `ng new` adds `@angular/cli`, so
your project gets its own `ndop` command at the version your lockfile
pins. From then on, run it as `npx ndop add dialog`, which finds the
installed command with npm, pnpm and Bun alike, or as
`pnpm exec ndop add dialog`. The tables below write it as `ndop`. Pass
`--no-cli` to `init` to keep it out of your dependencies and run every
command through `npx @ndop/cli`.

## Commands

| Command                  | What it does                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `ndop init`              | Sets up an Angular app for Ndop.                                                       |
| `ndop add <items...>`    | Adds components and everything they depend on.                                         |
| `ndop list [words...]`   | Lists the registry's components, blocks, themes and libraries.                         |
| `ndop view <items...>`   | Shows an item's API, keyboard map and examples, and how to add it.                     |
| `ndop diff [items...]`   | Shows your changes to installed components, and what changed upstream since.           |
| `ndop update [items...]` | Updates installed components, merging upstream's changes into your edits.              |
| `ndop doctor`            | Checks your setup, and fixes what is safe to fix.                                      |
| `ndop verify [paths...]` | Checks components and pages that use Ndop; see [Verify](/docs/getting-started/verify). |
| `ndop build`             | For registry authors: validates items and writes the registry.                         |

## Options

`init`, `add` and `update` accept:

| Option             | Effect                                                    |
| ------------------ | --------------------------------------------------------- |
| `--cwd <path>`     | The project root, by default the current folder.          |
| `--dry-run`        | Prints the changes as diffs; writes and installs nothing. |
| `--json`           | Prints one machine-readable result and nothing else.      |
| `-y, --yes`        | Applies without asking.                                   |
| `--registry <url>` | Uses another registry; the URL contains `{name}`.         |

`init` also takes `--theme <name>`, `--project <name>` and `--no-cli`; `add` takes
`--overwrite`, and installs a specific version when you write one after
the name, as in `ndop add button@0.1.0`; `update` takes `--force`,
`--continue` and `--interactive`. `doctor` takes the same options, with
`--dry-run` and `--yes` applying to `--fix`, plus `--offline` and
`--project`. For coding agents, `init` takes `--agent`, `--mcp` and
`--verify`; see [Agents & MCP](/docs/getting-started/agents-mcp).

`list`, `view` and `diff` write nothing. They take `--cwd`, `--registry`
and `--json`; `list` also takes `--type`, `view` `--code`, and `diff`
`--to`.

## Browsing the registry

`ndop list` shows what you can add, grouped by type, with each item's
latest version and description. Words after it keep the items that
contain them, and `--type` keeps one type: `ui`, `block`, `theme`, `lib`
or `example`. Examples are listed only with `--type example`, since every
component has several:

```bash pm
npx @ndop/cli list --type block
```

```text
Blocks (12)
  dashboard-01   1.0.0  A dashboard of stat cards, an area char…
  dashboard-02   1.0.0  An analytics dashboard with tabs for ov…
  data-table-01  1.0.0  A table of tasks to search, filter, sor…
  hero-01        1.0.0  A hero section with a headline, two act…
  login-01       1.0.0  A sign-in form in a card, with email an…
…
```

It works outside an app, on Ndop's registry. In an app, it also lists the
items of the registries in your `ndop.json`, as `@acme/table`, and shows
which items you installed and at which version. Descriptions are cut to
fit the terminal, 64 columns wide above, and printed in full when the
output goes to a file or another program.

`ndop view` prints what you need to use an item without leaving the
terminal: the command that adds it, its docs page, its dependencies and
files, and for a component its usage, every part's selector and inputs,
its keyboard map, focus rules and examples. The start of its output, with
`…` where lines were left out:

```bash pm
npx @ndop/cli view button
```

```text
Button  button 1.0.0, component
Displays a button or a component that looks like a button.
…
  Install  npx @ndop/cli add button
  Docs     https://ndop.dev/docs/components/button
…
API
  Button  button[ndButton], a[ndButton]
…
    Role        native (button / link)
    [variant]   'default' | 'destructive' | 'outline' |
                'secondary' | 'ghost' | 'link' = 'default'
                Visual style.
…
Keyboard
  Enter  Activates the button, or follows the link; does nothing
         while disabled.
  Space  Activates a `button`; does nothing while disabled.
         Links don't react to Space.
```

`--code` adds the examples' source. An unknown name fails with the
closest ones, and `--json` prints the item with its files and metadata.

## Themes and URLs

`init --theme` and `add` take a name, a namespaced name such as
`@acme/table`, or the URL of an item's JSON. URLs must use HTTPS, except
on `localhost`. `theme:` in front of any of them checks that the item is a
theme:

```bash pm
npx @ndop/cli add theme:https://example.com/r/ocean.json
```

Adding a theme to a set-up app replaces the theme variables in your
stylesheet, light and dark. shadcn themes, `registry:style` items with
`cssVars` such as tweakcn's, install the same way.

`ndop.lock.json` records an item added by URL under that URL. `ndop update`
fetches the URL again, and merges your edits using
`<url without .json>@<version>.json` as the base, which `ndop build`
writes. If the site has no such file, files you didn't edit are replaced,
and edited ones are kept and reported, for you to update by hand.

## Your edits are safe

`ndop add` records a hash of every file it writes in `ndop.lock.json`. If
you edit a file and run `add` again, the file is kept and reported as
skipped, unless you pass `--overwrite`. To bring a new version's changes
into a file you edited, use `ndop update`.

## What changed

`ndop diff` shows, for each installed component, two diffs per file: your
changes since you installed it, and what changed upstream since that
version. It writes nothing.

```bash pm
npx @ndop/cli diff button
```

## Updating

`ndop update` brings components to their latest version without losing
your edits. A file you never changed is replaced. A file you changed is
merged with upstream's changes, the way `git merge` does, using the
version you installed as the common base:

```bash pm
npx @ndop/cli update
```

When you and upstream changed the same lines, the file gets conflict
markers, with your lines first, and the command exits with code 2. Edit
the file to keep what you want, then record it:

```bash pm
npx @ndop/cli update --continue
```

The files an update writes must be committed first, so `git checkout`
undoes it; `--force` skips that check. Theme variables you changed keep
your values, new files and dependencies are added, and files a new version
drops stay in your project as yours.

When a new version moves a file, your edited copy moves with it. When it
renames something you use, such as an input, `update` renames it in your
own components and templates as well. To pick which of upstream's changes
to take, file by file, add `--interactive`.

Every component's page links its changelog: what changed in each version,
what `ndop update` does for it, and the diffs. Its update preview merges
your copy of a file in the browser, so you can see the result before
running anything.

## Updating the CLI

Once `@ndop/cli` is in your dev dependencies, `npx ndop` runs your
project's copy, at the version your lockfile pins, and with npm so does
`npx @ndop/cli`. To move your project to the latest release, update the
package:

```bash pm
npm install -D @ndop/cli@latest
```

To run the latest release once without changing your project, name the
version:

```bash pm
npx @ndop/cli@latest diff
```

`ndop update` updates your components, not the CLI.

## Checking your setup

`ndop doctor` checks everything Ndop relies on and prints each problem with
its fix: the Node and Angular versions, the packages installed components
need, `ndop.json`, the `@/` alias, Tailwind, the theme tokens components
use, `provideNdop()` and the icon provider, the lockfile, zoneless and SSR
support, and the agent files. It writes nothing:

```bash pm
npx @ndop/cli doctor
```

`--fix` applies the safe fixes, the same edits `init` and `add` make:
installing missing packages, adding the `tsconfig.json` path, adding
missing tokens from your theme, registering the providers and refreshing
the agent files. Add `--dry-run` to see them as diffs first. It never
changes your components or resolves conflicts for you, and running it
again changes nothing.

When `@ndop/cli` isn't in your dependencies, because `init` ran with
`--no-cli` or before it added the package, `doctor` warns, and `--fix`
adds it. A warning doesn't fail the command, so you can leave it out.

It exits with code 1 while any error remains, so CI can run it. `--json`
prints the checks, and `--offline` skips the ones that need the registry,
such as whether your components are behind it.

## Building a registry

`ndop build` reads `registry.json` in `--cwd` and writes the static
registry under `r/` in `--output` (`dist/registry` by default). It fails,
writing nothing, when an item is invalid or doesn't compile. Items that
list `@ndop/<name>` dependencies can import their files; `ndop build`
fetches them from `--registry <url>`, else `NDOP_REGISTRY`, else ndop.dev,
and type-checks against them. See
[Build your own registry](/docs/patterns/build-your-own-registry).

With `--compat shadcn`, it also writes `r/compat/<name>.json` for every
component, block, library and theme, which the shadcn CLI installs in an
Angular app without a `components.json`:

```bash
npx shadcn add https://ndop.dev/r/compat/dialog.json
```

Files go where `ndop init` would put them, under `src/app/ui`,
`src/app/lib` and `src/app/blocks`, with imports between them made
relative. A theme becomes `src/ndop-theme.css`. shadcn then prints the
setup `ndop init` would have done: add a theme and the icons, import
`@ndop/core/styles.css` and the theme in `src/styles.css`, and register
`provideNdop()` and `provideIcons()`. Updates, aliases and agent files stay
`ndop` features.

| Option                    | Effect                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--compat shadcn`         | Also writes the shadcn-compatible items.                                                                                  |
| `--compat-base-url <url>` | The absolute URL `r/compat/` is served from, which items' dependencies point at. By default `https://ndop.dev/r/compat/`. |

For `--compat shadcn` to build, every dependency in `registryDependencies`
must be an item of the same registry or `@ndop/<name>`, which points at
Ndop's compat item. That is `https://ndop.dev/r/compat/<name>.json`, or
next to the `--registry` URL when it ends in `{name}.json`.

## Package managers

The CLI installs dependencies with the package manager your project uses,
detected from its lockfile or `packageManager` field. npm, pnpm and bun are
tested on every change.

## For agents and CI

Commands ask for confirmation only in an interactive terminal, and never
when the `CI` variable is set. An agent's commands can run in a real
terminal too, as in VS Code, so pass `--yes` there; the Ndop section of
your agents' instructions does. `--json` prints a single result that a
script or a coding agent can read:

```bash pm
npx @ndop/cli add dialog --yes --json
```

`ndop add` also refreshes the Ndop section of your agents' instructions,
and installs `@angular/cdk` for your Angular version when a component
needs it. The instructions tell agents to run `npx ndop`, or
`npx @ndop/cli` when the project doesn't depend on `@ndop/cli`.
