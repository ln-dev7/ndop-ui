# Contributing to Ndop UI

[RFC-0001](rfcs/0001-ndop-ui.md) is the source of truth for what Ndop is and
how it is built; decisions that refine it live in [docs/adr](docs/adr).
Open an issue before starting anything large.

## Setup

Use the Node version in `.nvmrc` and the pnpm version in `package.json`'s
`packageManager` field.

```bash
pnpm install
```

## Everyday commands

All tasks run through Nx.

| Task                          | Command                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| Everything CI runs            | `pnpm nx run-many -t lint typecheck test build e2e`                      |
| Only what your change affects | `pnpm nx affected -t lint typecheck test build e2e`                      |
| Docs dev server               | `pnpm nx serve docs`                                                     |
| Format check / fix            | `pnpm nx format:check` / `pnpm nx format:write`                          |
| New primitive                 | `pnpm nx g @ndop/workspace-plugin:primitive <name> --pattern=<apg-slug>` |
| Merge tests (Button fixtures) | `pnpm nx test merge`                                                     |

## Rules

- Scaffold with `nx g` (check `--help`, run `--dry-run` first). Ndop's own
  shapes come from `@ndop/workspace-plugin` generators.
- Every export has TSDoc; lint enforces it. Inline comments explain why,
  never what. No commented-out code, and no TODO without an issue link.
- Deviating from the RFC needs an ADR first.
- Changes to published packages need a changeset: `pnpm changeset`.

## Code in guides

`pnpm nx guides docs`, part of `typecheck`, compiles every `ts` and
`angular-html` block of the guides in `apps/docs/src/guides` against the
registry, and validates `ndop.json` and `registry.json` blocks
([ADR-0030](docs/adr/0030-compiled-guide-code.md)). Write whole files that
import what they use, through packages or `@/`. A block that is another
library's code or a deliberate fragment opts out with a reason in its
fence: ` ```angular-html nocheck="Angular Material's markup" `.

## Definition of done for a component

From [RFC-0001](rfcs/0001-ndop-ui.md), "Component catalog and definition of
done": nothing ships until it meets every item below. Items with no
behavior beyond native HTML (Card, Table, Alert and the like) have no
primitive or `spec.md` of their own; [ADR-0021](docs/adr/0021-catalog-completion.md)
lists them.

- [ ] `spec.md` with ARIA pattern, roles, keyboard map, focus rules, RTL notes
- [ ] Primitive with signals API, controlled and uncontrolled modes, forms
      integration where it bears a value
- [ ] Styled item using tokens only, logical properties only, `class` input
      merged last
- [ ] At least two examples, including one realistic one (e.g. dialog with
      a form)
- [ ] Unit, axe, keyboard, SSR, zoneless and visual tests passing in light,
      dark and RTL
- [ ] Metadata complete (every public input described), docs page
      generated, `.md` twin present
- [ ] Within its bundle-size budget
- [ ] Installs and builds in the registry e2e; covered in the agent eval suite

Scaffold a component with the `primitive`, `styled-item` and `example`
generators, so it starts in the same shape as the others.

## Adding a theme

A theme is a `registry:theme` item: CSS variables for light and dark
([ADR-0023](docs/adr/0023-themes-and-theme-studio.md)). The `theme`
generator copies the default theme's tokens into
`registry/themes/<name>/theme.css` and adds its `registry.json` entry at
0.1.0 and its changelog. Community themes pass `--author`, which the
gallery shows.

```bash
pnpm nx g @ndop/workspace-plugin:theme ocean --description="Cool blues for calm dashboards." --author="Your name" --dry-run
```

Then:

1. Edit the values in `theme.css`. The [theme studio](https://ndop.dev/themes/studio)
   shows the contrast of each pair as you go.
2. Build the registry with `pnpm nx build registry`. It fails when a
   foreground and background pair is under 4.5:1, in light or in dark.
3. If the theme uses another font, load it in the harness's stylesheet; a
   unit test names the `@fontsource` import it needs.
4. Add its theme sheet baselines, light and dark, with
   `pnpm nx run harness-e2e:visual:update --grep="theme-sheet ocean"`.
   The visual tests run the browser in Docker.

## Adding a block

A block is a `registry:block` item: a page-level composition of registry
components that compiles with mock data
([ADR-0022](docs/adr/0022-blocks.md)). The `block` generator writes the
page component at `registry/blocks/<name>/<name>.ts`, its `registry.json`
entry at 0.1.0 with its gallery category, its changelog, and the harness
route that renders and tests it.

```bash
pnpm nx g @ndop/workspace-plugin:block login-03 --category=auth --description="A login form beside an image." --dry-run
```

`--category` is one of `auth`, `dashboard`, `settings`, `data-table`,
`sidebar` or `marketing`. Then:

1. Build the page from registry items, importing them from `@/ui/…`, and
   list them in its `registryDependencies`.
2. Build the registry with `pnpm nx build registry`, which type-checks it.
3. Add its visual baselines with
   `pnpm nx run harness-e2e:visual:update --grep=login-03`. The harness's
   e2e also checks it with axe and renders it on the server.
4. The registry install test, `pnpm nx e2e registry-e2e`, installs and
   builds every block.

## Deploying the docs

The Deploy workflow (`.github/workflows/deploy.yml`,
[ADR-0028](docs/adr/0028-release-and-deploy.md)) builds the docs and uploads
them, with the theme URL Function in `apps/docs/functions`, to Cloudflare
Pages with `pnpm nx deploy docs`, then checks the deployment with
`pnpm nx smoke docs --url=<url>`: pages without a trailing-slash redirect,
the 404 page, `/r/index.json`, a theme URL and the service worker.

- **Pull requests** get a preview of their branch, linked from a comment on
  the pull request that each push updates. Pull requests from forks and
  from Dependabot get none: GitHub gives them no secrets.
- **master** deploys to production once CI has passed on the commit.

It needs, under the repository's Settings, Secrets and variables, Actions:

| Name                       | Kind     | Value                                                                     |
| -------------------------- | -------- | ------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`     | Secret   | An account API token with one permission: Account, Cloudflare Pages, Edit |
| `CLOUDFLARE_ACCOUNT_ID`    | Secret   | The Cloudflare account's ID                                               |
| `CLOUDFLARE_PAGES_PROJECT` | Variable | The Pages project's name, `ndop`                                          |

The project is `ndop`, a Direct Upload project with `master` as its
production branch and `ndop.dev` as its custom domain, so previews are at
`https://<branch>.ndop.pages.dev`. It was created once with:

```bash
pnpm exec wrangler pages project create ndop --production-branch=master
```

To try a build locally with the Function as Pages runs it, run
`pnpm nx serve-pages docs` (http://localhost:8788), then
`pnpm nx smoke docs --url=http://localhost:8788`.

## Releasing

Releases follow [ADR-0028](docs/adr/0028-release-and-deploy.md).

### npm packages

The nine public packages, `@ndop/cli`, `@ndop/core`, `@ndop/primitives`,
`@ndop/schema`, `@ndop/metadata`, `@ndop/merge`, `@ndop/verify`,
`@ndop/mcp` and `@ndop/eslint-plugin`, form one Changesets **fixed** group
(`.changeset/config.json`): they always release together, at one
version. Each publishes its build output, `dist/packages/<name>`
(`publishConfig.directory`), and pnpm replaces their `workspace:^`
ranges with `^<version>` when it packs them.

`packages/ndop`, the unscoped `ndop` alias of `@ndop/cli`, is private and
not released: npm refused the name ([ADR-0031](docs/adr/0031-cli-entry-point.md)).
If npm releases it, make it public, add it to the fixed group and to the
build list below, and document `npx ndop` as an alternative to
`npx @ndop/cli`.

1. A pull request that changes a published package adds a changeset with
   `pnpm changeset`, written for the package's users.
2. Once CI passes on master, the Release workflow
   (`.github/workflows/release.yml`) opens or updates the version pull
   request, "chore(repo): version packages". It runs
   `pnpm nx run @ndop/source:release-version`: `changeset version` bumps
   the group and writes each package's `CHANGELOG.md`, and the registry
   template's `@ndop/*` dev dependencies move to the new version.
   GitHub doesn't run workflows on pull requests that a workflow opened,
   so close and reopen it to run CI on it.
3. Merging it releases. Once CI passes on that commit, the workflow builds
   and packs the packages whose version isn't on npm, runs the registry
   install test against those exact tarballs
   (`pnpm nx e2e registry-e2e --packDir=<folder>`), then publishes them in
   the `npm` environment through npm's trusted publishing, with
   provenance and no npm token. It then pushes a git tag and a GitHub
   release per package, such as `@ndop/cli@1.0.0`.

To rehearse locally, without publishing:
`pnpm nx run-many -t build -p cli core primitives schema metadata merge verify mcp eslint-plugin`,
then `pnpm changeset pack --out-dir tmp/pack` and
`pnpm nx e2e registry-e2e --packDir=tmp/pack`.

### Registry items

Items keep their own versions (ADR-0012). The `item-release` generator
sets the new version and adds the changelog section; `{previous}` in the
notes stands for each item's version before:

```bash
pnpm nx g @ndop/workspace-plugin:item-release button --bump=minor --notes="Adds an xs size." --dry-run
```

Then build the registry with `pnpm nx build registry`, outside CI, and
commit the new snapshots in `registry/snapshots`: they are the merge bases
of `ndop update` (ADR-0010).

### One-time setup

npm lets a trusted publisher be added only to a package that exists
([npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust)), so each
package is first published once by hand, as a placeholder. This needs npm
11.15.0 or later, and two-factor authentication on the npm account that
owns the `ndop` organization.

1. In the repository's Settings, Actions, General, turn on "Allow GitHub
   Actions to create and approve pull requests". The `npm` environment is
   created on the first publish; add required reviewers to it under
   Settings, Environments if a release should wait for an approval.
2. Log in with `npm login`, then pack the placeholders and read the
   commands it prints:

   ```bash
   pnpm nx run @ndop/source:release-bootstrap
   ```

   It packs `0.0.0` of every package that isn't on npm yet into
   `tmp/release-bootstrap`: its name, license and repository, and the
   note "Placeholder; the first release is 1.0.0.". Nothing is published.

3. Publish them and add the trusted publishers. npm asks for your second
   factor in the terminal:

   ```bash
   pnpm nx run @ndop/source:release-bootstrap --publish --trust
   ```

   `--trust` runs, for each package,
   `npm trust github <package> --file release.yml --repo ndop-ui/ui --env npm --allow-publish --yes`.
   On npmjs.com instead, each package's Settings, Trusted publishing,
   GitHub Actions takes:

   | Field                | Value         |
   | -------------------- | ------------- |
   | Organization or user | `ndop-ui`     |
   | Repository           | `ui`          |
   | Workflow filename    | `release.yml` |
   | Environment name     | `npm`         |

4. Merge the version pull request within two days: npm requires a new
   trusted publisher's first publish to happen within two days of its
   creation.
5. Optionally, under each package's Settings, Publishing access, choose
   "Require two-factor authentication and disallow tokens"; trusted
   publishing isn't affected. Once 1.0.0 is out, deprecate the
   placeholders, for example
   `npm deprecate "@ndop/cli@0.0.0" "Placeholder; install 1.0.0 or later."`.
