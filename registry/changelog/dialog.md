# Dialog

## 2.0.0

Use native top-layer overlays. Import behavior-only parts from @ndop/primitives; ndop update migrates imports and native dialog markup. See the native overlay migration guide.

## 1.0.0

Stable release; no code changes since 0.2.0.

## 0.2.0

Every part of the item is now its own directive without the `Nd` prefix, which is kept for the headless primitives. Renames `NdDialog` to `Dialog`, `NdDialogClose` to `DialogClose`, `NdDialogPortal` to `DialogPortal` and `NdDialogTrigger` to `DialogTrigger`. Selectors and inputs are unchanged, and `ndop update` renames the imports and their uses in your code.

## 0.1.5

Adds the `dialog-unsaved-changes` example: a dialog that a click outside doesn't close. The files are unchanged.

## 0.1.4

Lists the item under Overlays in the docs. The files are unchanged.

## 0.1.3

Mirrors the close button and the header in right-to-left layouts: the close button sits at `end-4` instead of `right-4`, and the header aligns with `sm:text-start` instead of `sm:text-left`.

## 0.1.2

Removes the source notice at the top of `dialog.ts`. The credit for the shadcn/ui styles it was based on is on the docs site instead.

Lists the main example first.

## 0.1.1

Points the item at its API metadata, `metadata/dialog.json`, which the docs and the MCP server read. The files are unchanged.

## 0.1.0

First release.
