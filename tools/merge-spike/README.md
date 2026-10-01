# @ndop/merge-spike

Phase 0 spike of the three-way merge behind `ndop update`
([ADR-0003](../../docs/adr/0003-three-way-merge-strategy.md)). Private and
temporary: the merge moves into `@ndop/cli` in Phase 5 and this project is
deleted. The fixtures it reads in `tools/update-fixtures/button` stay as the
seed of the update e2e suite.

## Run

```bash
pnpm nx test merge-spike
```

The test prints the results table recorded in ADR-0003, cross-checks every
plain line merge against `git merge-file` (so `git` must be on the `PATH`), and
fails below 8 of 10 clean merges.
