# Vendored shadcn schemas

Snapshot of shadcn's registry schemas, used only by tests to enforce the
superset invariant in ADR-0002: every Ndop item, mapped to compat form, must
validate against these files. Refresh deliberately, in its own commit, and
re-run the schema tests.

| File                 | Source                                          | Fetched    | SHA-256                                                            |
| -------------------- | ----------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| `registry-item.json` | https://ui.shadcn.com/schema/registry-item.json | 2026-10-01 | `cdf0fba75a26ebf594018264eff2d55407ec14deb3071d0fce0e2b20848e5d44` |
| `registry.json`      | https://ui.shadcn.com/schema/registry.json      | 2026-10-01 | `e716ebe595bbc189db2627cb75f0484cd765a09eb397a89b1f1c49074220d4bb` |
