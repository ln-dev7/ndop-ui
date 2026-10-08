# update-fixtures

The update fixture suite
([ADR-0020](../../docs/adr/0020-diff-and-update.md)): realistic edits to
installed items, and what `ndop update` must make of them.

```bash
pnpm nx e2e update-fixtures
pnpm nx e2e update-fixtures --cases=button/
```

Each case runs in a copy of `packages/cli/fixtures/ng22` under
`tmp/update-e2e`: `ndop init`, `ndop add <item>@<from>`, a commit, the
user's edits, then `ndop update <item>@<to>`, in process with packages
recorded instead of installed. The suite checks:

- the files against the case's `expected/` folder, byte for byte, and the
  status of each file;
- the exit code against the statuses: 2 for conflicts, 1 for errors;
- conflict markers are well formed;
- every lockfile hash is what a fresh `ndop add` of that file's base
  version records, and only pending files keep their own version;
- running the update again would change nothing.

Merge cases count toward the clean rate, which must be at least 90%. A
merge is clean when nothing conflicts and every file matches `expected/`;
expected true conflicts count against it. Behavior cases, such as a dirty
working tree or `--continue`, must all pass. The results table goes to
`dist/update-e2e/report.md`.

## Layout

Each folder is a scenario: a small registry and the cases updated against
it.

| Path                           | Holds                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `<scenario>/scenario.json`     | The items it serves, with per-version changes, or `snapshots` of real items        |
| `<scenario>/versions/<v>/`     | Each version's files, by registry path                                             |
| `<scenario>/cases/<NN-name>/`  | `case.json`, `local/` (the user's files), `expected/` (the project after updating) |

`case.json` names the item and versions, the kind of case, and what to
expect: statuses, an exit code, a true conflict, warnings, dependencies,
text a file must contain. `runs` describes several updates in a row, with
a folder laid over the project before each.

## Writing a case

Write `local/` as the user's edit to the old version, and `expected/` as
the same edit made by hand to the new version, before running the suite.
Never copy what the merge produced into `expected/`: the suite measures
the merge against what a careful person would write.
