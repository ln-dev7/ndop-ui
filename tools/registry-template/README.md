# Ndop registry template

A minimal third-party registry for [Ndop UI](https://ndop.dev): one
`widget` item that depends on Ndop's Button, built with `ndop build` into
static JSON and deployed to GitHub Pages. Copy it to publish your own
Angular components, so that your users install them with
`ndop add @you/<item>`, next to Ndop's.

The full guide is
[Build your own registry](https://ndop.dev/docs/patterns/build-your-own-registry).

## What's in it

| Path                           | Holds                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `registry.json`                | The registry's items, without file contents.                                                   |
| `ui/widget/widget.ts`          | The widget's source, installed to `{ui}/widget/widget.ts` in apps.                             |
| `ui/widget/docs.md`            | Its intro and Do and Don't lists, served to agents with its API.                               |
| `changelog/widget.md`          | Its release notes, a `## <version>` section per version.                                       |
| `snapshots/`                   | Every released version, written by `ndop build`; commit them.                                  |
| `package.json`                 | `@ndop/cli`, the Angular compiler, the packages Ndop's Button imports, and the `build` script. |
| `.github/workflows/deploy.yml` | Builds on every push to `main` and deploys `public/` to GitHub Pages.                          |
| `package-lock.json`            | The exact versions `npm ci` installs in the workflow; commit it.                               |
| `.nvmrc`                       | The Node.js major the workflow builds with.                                                    |
| `LICENSE`                      | The template's MIT license; replace it with your own.                                          |

## Make it yours

1. On [the template's page](https://github.com/ndop-ui/registry-template),
   select **Use this template**, then **Create a new repository**. Or copy
   its files into a repository of yours.
2. In `registry.json`, set `name` and `homepage`, and replace `widget` with
   your items. A bare name in `registryDependencies` is an item of your
   registry; `@ndop/<name>` is one of Ndop's, whose files your items can
   import, as the widget imports `@/ui/button/button`.
3. Build:

   ```bash
   npm install
   npm run build
   ```

   `ndop build` checks every item, type-checks it with `ngc`, and writes the
   registry to `public/r/`. Commit the `snapshots/` it writes for each new
   version.

4. In the repository's settings, under Pages, set the source to GitHub
   Actions, and push to `main`. The registry is then at
   `https://<owner>.github.io/<repo>/r/<name>.json`.

When you change an item, bump its `version` and add a section to its
changelog. The build fails when an item changes without a version bump, so
your users' `ndop update` can always merge from the version they have.

## Install from it

Users add the registry to their `ndop.json` under a namespace:

```json
{
  "registries": {
    "@sample": "https://<owner>.github.io/<repo>/r/{name}.json"
  }
}
```

```bash
npx @ndop/cli add @sample/widget
```

That installs the widget and Ndop's Button, and records both in
`ndop.lock.json`, so `ndop update` and `ndop diff` work on them.

### Private registries

For a private registry, serve `public/` from a host that checks a token,
such as a server behind Cloudflare Access (GitHub Pages can't), and have
users send it from an environment variable:

```json
{
  "registries": {
    "@sample": {
      "url": "https://registry.example.com/r/{name}.json",
      "headers": { "Authorization": "Bearer ${SAMPLE_TOKEN}" }
    }
  }
}
```

```bash
SAMPLE_TOKEN=… npx @ndop/cli add @sample/widget
```

Without the variable, `ndop add @sample/widget` fails with "Registry
@sample needs the SAMPLE_TOKEN environment variable."

## In the Ndop repository

This section is for Ndop's maintainers; `pnpm nx run registry-template:export`
leaves it out of the public repository.

This folder is the source of the public template repository,
[`ndop-ui/registry-template`](https://github.com/ndop-ui/registry-template),
and it's tested with every change to Ndop:

- `pnpm nx build registry-template` builds it with the workspace's own CLI
  into `dist/registry-template`, in CI's main job.
- `pnpm nx run registry-template:export` writes the public repository's
  files to `dist/registry-template-repo`: this folder without
  `project.json` and local build output, this README without this
  section, and the workspace's `LICENSE`.
- The `registries` case of the install test (`tools/registry-e2e`) runs
  that export, builds the copy with its own `npm run build` against the
  `@ndop/cli` just published to a local registry, serves it behind a
  bearer token, and installs `@sample/widget` into a new Angular app. So
  what the public repository gets is what's tested.
- A unit test keeps `package.json` pinned to the workspace's `@ndop/cli`
  and Angular versions, and the release's `release-version` target pins
  its `@ndop/*` to the version being released.

It's left out of the pnpm workspace, so its `package.json` names the
published `@ndop/cli`, as in the public repository.

### Keeping the public repository in sync

After a release of the `@ndop/*` packages is on npm, or a change to this
folder, from the Ndop repository, with the public repository cloned next
to it as `../registry-template`:

```bash
pnpm nx run registry-template:export
rsync -a --delete --exclude .git --exclude package-lock.json \
  --exclude node_modules --exclude public \
  dist/registry-template-repo/ ../registry-template/
cd ../registry-template
npm install
npm run build
git add -A
git commit -m "chore: sync with ndop <version>"
git push
```

`npm install` refreshes `package-lock.json` against npm, which the
workflow's `npm ci` needs and which this folder doesn't keep, since its
`@ndop/*` are unpublished between releases. `npm run build` must write
`public/r/index.json` and `public/r/widget.json` before you push. The
push runs the repository's "Deploy registry" workflow; check it's green
and that `https://ndop-ui.github.io/registry-template/r/widget.json`
serves the new version.
