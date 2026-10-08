# @ndop/merge

The three-way merge behind `ndop update` and the update preview on the docs'
changelog pages
([ADR-0003](../../docs/adr/0003-three-way-merge-strategy.md),
[ADR-0020](../../docs/adr/0020-diff-and-update.md)). It uses no Node APIs,
so the CLI and the browser merge a file the same way.

> Not released yet. You don't need it to use Ndop: the `ndop` CLI depends on
> it.

## Install

```bash
npm install @ndop/merge
```

## Usage

```ts
import { threeWayMerge } from '@ndop/merge';

const outcome = threeWayMerge({
  base, // the file as you installed it
  local, // the file on disk
  remote, // the file at the new version
  remoteVersion: '0.2.0',
});
// outcome.status: 'replaced' | 'unchanged' | 'merged' | 'conflict'
```

Conflicts are written as `<<<<<<< local`, `=======` and
`>>>>>>> ndop@0.2.0` markers. When both sides only added lines at the same
point, both are kept, upstream's first; pass `union: false` to get a
conflict there instead.

`upstreamHunks()` and `partialRemote()` apply only some of upstream's
changes, as `ndop update --interactive` does, and `conflictMarkers()` finds
conflicts left in a file.

Formatting is up to you: `ndop update` formats `base` and `remote` with the
project's Prettier config first, so they match what was installed.

## Tests

```bash
pnpm nx test merge
```

They include ADR-0003's ten Button cases from `tools/update-fixtures/button`,
cross-checked against `git merge-file`, so `git` must be on the `PATH`.
