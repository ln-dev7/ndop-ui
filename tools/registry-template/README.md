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

## Make it yours

1. Create a repository from this template, or copy this folder.
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
npx ndop add @sample/widget
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
SAMPLE_TOKEN=… npx ndop add @sample/widget
```

Without the variable, `ndop add @sample/widget` fails with "Registry
@sample needs the SAMPLE_TOKEN environment variable."

## In the Ndop repository

This folder is the source of the public template repository, and it's
tested with every change to Ndop:

- `pnpm nx build registry-template` builds it with the workspace's own CLI
  into `dist/registry-template`, in CI's main job.
- The `registries` case of the install test (`tools/registry-e2e`) copies
  it, builds it with its own `npm run build` against the `@ndop/cli` just
  published to a local registry, serves it behind a bearer token, and
  installs `@sample/widget` into a new Angular app.
- A unit test keeps `package.json` pinned to the workspace's `@ndop/cli`
  and Angular versions.

It's left out of the pnpm workspace, so its `package.json` names the
published `@ndop/cli`, as in the public repository. `project.json` is only
for Nx and isn't part of the template.

### Keeping the public repository in sync

After a release of `@ndop/cli`, from the Ndop repository, with the public
template repository checked out next to it as `../registry-template`:

```bash
rsync -a --delete --exclude .git --exclude project.json \
  --exclude node_modules --exclude public \
  tools/registry-template/ ../registry-template/
cd ../registry-template
npm install
npm run build
git add -A
git commit -m "chore: sync with ndop <version>"
git push
```

`npm install` refreshes `package-lock.json`, which the workflow's `npm ci`
needs and which this folder doesn't keep, since its `@ndop/cli` is
unpublished between releases. Mark the public repository as a template in
its settings, so users can create theirs from it.
