# ADR-0010: Lockfile format and update safety rules

- Status: Accepted (approved by Valery on 2026-10-08)
- Date: 2026-10-08
- Phase: 5
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Registry spec" (lockfile),
  "Three-way merge update algorithm", Phase 5; ADR-0002, ADR-0003,
  ADR-0011, ADR-0012

## Context

`ndop.lock.json` exists since Phase 2: per item its name, registry and
version, and per file its path and the SHA-256 of what `ndop add` wrote
(ADR-0002). The RFC's update algorithm relies on it: the recorded version is
the merge base, and a file whose hash still matches was never edited.

Three gaps show up once `update` is designed against the code:

1. **The base isn't the registry file.** `add` rewrites `@/…` imports to the
   project's aliases and formats with the project's Prettier before writing
   and hashing. The snapshot at `/r/<name>@<version>.json` holds the
   registry's text, so it has to go through the same steps to become what
   the user actually received.
2. **What the hash means after a merge.** RFC step 7 says to "record the new
   version and hash". If that is the hash of the merged bytes, the next
   update sees a matching hash, takes the "never edited" fast path, and
   replaces the file with plain upstream, dropping the user's edits.
3. **Partly updated items.** One item can have a file that merged cleanly
   and one that conflicted. The lockfile has one version per item, and step 7
   says to advance only the files that merged.

Nothing has been published yet, so the format can still change without a
migration.

## Decision

### Lockfile format

Still `lockfileVersion: 1`. Each file entry gains an optional `version`:

```json
{
  "$schema": "https://ndop.dev/schema/lock.json",
  "lockfileVersion": 1,
  "items": {
    "@ndop/button": {
      "name": "button",
      "registry": "@ndop",
      "version": "0.2.0",
      "files": [
        { "path": "src/app/ui/button/button.ts", "sha256": "…" },
        { "path": "src/app/ui/button/button-group.ts", "sha256": "…", "version": "0.1.2" }
      ]
    }
  },
  "agentFiles": {}
}
```

- **Item `version`** is the version the user updated to.
- **File `version`** is there only when a file's base is behind the item's:
  a conflict not yet marked resolved, or a file the user deleted. Every
  other file's base is the item's version.
- **`sha256` is the hash of the pristine file at its base version**: what
  `ndop add` would write for that version in this project today. For a fresh
  install that is also the bytes written, so nothing changes for `add`. After
  a merge, the bytes on disk differ from the hash, and that is the point: the
  file contains the user's edits and must be merged again next time.

### The pristine file

The **pristine** text of a registry file at a version is its snapshot
content, passed through the same steps as `add`:

1. Import rewriting for `.ts` files (`@/ui/…` to the project's aliases).
2. Formatting with the project's Prettier config, if it has one.
3. LF line endings with a single trailing newline. The user's line ending is
   restored on write (ADR-0003).

`update` and `diff` build both the base and the target this way. If the
rebuilt base doesn't hash to the lockfile's `sha256`, the project's
aliases, Prettier version or config changed since install. The merge still
runs, with a warning that it may conflict more than usual.

### Fetching a version

- `<name>@<version>` is fetched by putting `<name>@<version>` where `{name}`
  goes in the registry's URL template. That gives `/r/button@0.1.2.json` on
  ndop.dev, and namespaced or private registries must serve the same path
  (the `ndop build` output already does).
- `ndop add <name>@<version>` installs a given version. The update fixture
  suite and the real-app update test need it.

### Safety rules for `ndop update`

1. **Plan, then write.** Every file, lockfile change and package is planned
   before anything is written, as with `add` (ADR-0011). An error while
   planning writes nothing.
2. **Clean working tree.** The files the plan writes, including the
   lockfile, must have no uncommitted changes, so `git checkout` undoes an
   update. `--force` skips the check. Outside a git repo the check is
   skipped with a warning (ADR-0003). `--dry-run` doesn't check.
3. **Never overwrite an edit without merging it.** A file is replaced
   outright only when its hash matches the lockfile. Otherwise it's merged,
   or left alone.
4. **Conflicts** are written with the markers ADR-0003 fixes. The command
   exits with code 2, and each conflict's file and line are reported. The
   file keeps its old base version and hash in the lockfile, and the item
   moves to the new version.
5. **Unresolved conflicts block.** A file that still has `<<<<<<< local`
   markers is not merged again. It's reported as unresolved, and the
   command exits 2.
6. **Resolving.** After fixing the markers, `ndop update --continue` records
   each pending file with no markers left at its item's version and that
   version's pristine hash, without merging again. Merging again would
   bring back any upstream change the user dropped on purpose.
7. **Files the user deleted** are not restored. Their lockfile entry keeps
   its old version and is reported as `missing`. `ndop add <item>
--overwrite` brings them back.
8. **New upstream files** are created. If something already sits at the
   target path, it's left alone and reported, as `add` does.
9. **Only forward.** A target older than the installed version is refused.
   Codemods only run forward (ADR-0020).
10. **The lockfile is right after every run:** every hash is pristine at its
    file's base version, `version` is set only on pending or missing files,
    and running the same `ndop update` again plans nothing.

### Exit codes for `diff` and `update`

`0` for success, `1` for an error (nothing written), `2` for an update
applied with conflicts or blocked by unresolved ones. With `--json` the
same outcomes are in the output, so agents and CI don't need to parse
text.

## Consequences

- The lockfile stays small: no stored base text. The cost is a network fetch
  of the base snapshot on every `update` and `diff`, and a Prettier run.
  Both are cached for the length of one command.
- `get_project_context` (MCP) and `ndop diff` read edits the same way:
  `sha256(local) == sha256` means unedited.
- If a project changes its aliases or Prettier config after installing,
  merges may conflict more often. The warning tells the user why.
- The `sha256` description in `packages/schema`, "Hash of the bytes written,
  after formatting", becomes "Hash of the pristine file at its base version".
