---
title: Build your own registry
description: Publish your own components as a registry that ndop installs, public or private, from any static host.
order: 1
---

A registry is a folder of static JSON files: one per item, each with its
files' contents. `ndop build` writes it from your sources, any static host
serves it, and your users install from it with `ndop add`, next to Ndop's
own components. A registry can be public, or private behind a token.

The quickest start is the registry template: a minimal registry with one
`widget` item that depends on Ndop's Button, and a GitHub Actions workflow
that publishes it to GitHub Pages.

## The source: registry.json

A registry's source is a `registry.json` that lists its items, next to
their files. Its format is
[`https://ndop.dev/schema/registry.json`](https://ndop.dev/schema/registry.json),
and each item follows
[`https://ndop.dev/schema/registry-item.json`](https://ndop.dev/schema/registry-item.json),
a superset of shadcn's item format:

```json title="registry.json"
{
  "$schema": "https://ndop.dev/schema/registry.json",
  "name": "acme",
  "homepage": "https://ui.acme.dev",
  "items": [
    {
      "name": "widget",
      "type": "registry:ui",
      "version": "0.1.0",
      "title": "Widget",
      "description": "A card-like panel for one piece of a dashboard.",
      "registryDependencies": ["@ndop/button"],
      "files": [
        {
          "path": "ui/widget/widget.ts",
          "type": "registry:ui",
          "target": "{ui}/widget/widget.ts"
        }
      ],
      "angular": {
        "minVersion": "21.0.0",
        "exports": ["Widget", "WidgetAction"],
        "zoneless": true,
        "ssr": true
      },
      "ndop": { "metadata": "metadata/widget.json" }
    }
  ]
}
```

- `target` says where a file goes in the app. `{ui}`, `{lib}` and
  `{blocks}` are the folders from the app's
  [`ndop.json`](/docs/getting-started/ndop-json).
- `dependencies` lists npm packages the item imports, which `ndop add`
  installs.
- `registryDependencies` lists items to install first. A bare name, such
  as `"helper"`, is an item of the same registry; `@ndop/button` is Ndop's
  Button, from whichever registry the app uses for Ndop's items.
- `version` is the item's semantic version. Bump it whenever its files
  change.

A `registry:ui` item also needs a `docs.md` next to its file, with an intro
and "Do" and "Don't" lists, and its TSDoc on every export. `ndop build`
extracts both into `metadata/<name>.json`, which agents read through the
Ndop MCP server. Components, blocks and themes need a
`changelog/<name>.md` with a `## <version>` section per version.

An item's files may import Angular, the packages in its `dependencies`,
its own files, and through `@/` the files of the items it lists in
`registryDependencies`, as in `import { cn } from '@/lib/utils'`. Those
can be items of the same registry or Ndop's: an item that lists
`@ndop/button` can import `@/ui/button/button`, at the path it has in
Ndop's registry. The template's widget does, for its action:

```ts title="ui/widget/widget.ts"
import { Directive } from '@angular/core';
import { Button } from '@/ui/button/button';

@Directive({
  selector: 'button[sampleWidgetAction], a[sampleWidgetAction]',
  hostDirectives: [{ directive: Button, inputs: ['variant', 'size', 'class'] }],
})
export class WidgetAction {}
```

`ndop build` fetches the `@ndop/` items an item lists, and theirs in turn,
from Ndop's registry: `--registry <url>` if you pass it, else the
`NDOP_REGISTRY` environment variable, else ndop.dev. It type-checks your
files against theirs, so install the packages their files import as dev
dependencies; the build names any that's missing. Items of other
registries, such as `@acme/table`, are installed with yours but can't be
imported in code.

## Build it

Add the CLI and the Angular compiler, which the type-check runs, as dev
dependencies, and build:

```bash
npm install --save-dev @ndop/cli @angular/core @angular/compiler @angular/compiler-cli typescript
npx ndop build --output public
```

An item that imports Ndop's Button also needs what its files import, and
the Angular CDK's peers, at your Angular version:

```bash
npm install --save-dev @ndop/core @ndop/primitives @angular/cdk @angular/common @angular/forms @angular/platform-browser
```

`ndop build` validates every item, checks its imports, type-checks it with
`ngc`, checks its docs, and writes the registry to `public/r/`:

| File                      | Holds                                              |
| ------------------------- | -------------------------------------------------- |
| `r/index.json`            | Every item, without file contents.                 |
| `r/<name>.json`           | Each item's latest version, with its files.        |
| `r/<name>@<version>.json` | Every released version, which updates merge from.  |
| `r/metadata/<name>.json`  | Each component's API and docs, for agents.         |
| `r/changelog/<name>.json` | Each item's versions and what changed in each one. |

It writes nothing when a check fails. With `--dry-run` it only checks.

## Versions and updates

The first time a version builds, `ndop build` writes
`snapshots/<name>@<version>.json`. Commit it. If a version's files change
later without a version bump, the build fails, and with `--frozen-snapshots`
(the default when `CI` is set) a version without a committed snapshot
fails too.

Those snapshots become `r/<name>@<version>.json`, which is how
`ndop update` works for your users: it fetches the version they installed
as the merge base, so their local edits merge with your changes, three-way.
`ndop diff` uses them to show what changed. Never delete or edit a
published version.

## Host it

The output is static JSON, so any static host works: GitHub Pages,
Cloudflare Pages, Netlify, S3, or your own server. Serve `public/` as it
is, with `application/json` for `.json` files. The template's workflow
builds on every push to `main` and deploys to GitHub Pages; in the
repository's settings, set Pages to deploy from GitHub Actions.

## Install from it

Users add your registry to their `ndop.json` under a namespace, with a URL
template containing `{name}`:

```json title="ndop.json"
{
  "registries": {
    "@acme": "https://acme.github.io/ui/r/{name}.json"
  }
}
```

Then install items by namespace and name:

```bash pm
npx ndop add @acme/widget
```

`ndop add` installs the item's dependencies too, from their own
registries: `@acme/widget` brings Ndop's Button with it. `ndop.lock.json`
records each item under its namespace, as `@acme/widget`, so
`ndop update @acme/widget`, `ndop diff @acme/widget` and `ndop doctor`
work on it as on Ndop's items.

## Private registries

A private registry is the same JSON behind authentication. Users add
headers to its entry, and `${VAR}` in a header comes from an environment
variable, so the token stays out of the repository:

```json title="ndop.json"
{
  "registries": {
    "@acme": {
      "url": "https://ui.acme.dev/r/{name}.json",
      "headers": { "Authorization": "Bearer ${ACME_TOKEN}" }
    }
  }
}
```

```bash
ACME_TOKEN=… npx ndop add @acme/widget
```

When the variable isn't set, installing from that registry fails with
"Registry @acme needs the ACME_TOKEN environment variable."; the app's
other registries keep working. The headers are sent only to that
registry's URL. GitHub Pages can't check a token, so host a private
registry where you can, for example behind Cloudflare Access or a small
server that checks the `Authorization` header.

## Install by URL

Any item can also be installed from its URL, with no `ndop.json` entry:

```bash pm
npx ndop add https://acme.github.io/ui/r/widget.json
```

The lockfile records the URL, and `ndop update` fetches it again, merging
from `<url without .json>@<version>.json`, which `ndop build` writes. A
URL has no namespace, so bare names in its `registryDependencies` come
from Ndop's registry, as `@ndop/` ones do; items that depend on other
items of yours are better installed by namespace. URLs must use HTTPS,
except on `localhost`.

## Start from the template

The registry template is a folder with:

- `registry.json`, with the `widget` item;
- `ui/widget/widget.ts` and `docs.md`, its source and docs;
- `changelog/widget.md` and `snapshots/`, its release history;
- `package.json`, whose `build` script runs `ndop build --output public`;
- `.github/workflows/deploy.yml`, which builds and deploys to GitHub Pages.

To make it yours, rename the registry in `registry.json` and set its
`homepage`, replace the widget with your items, run `npm run build`, and
commit the snapshots it writes. Ndop's install test builds the template
and installs its widget behind a token on every change, so it keeps
working with the current CLI.
