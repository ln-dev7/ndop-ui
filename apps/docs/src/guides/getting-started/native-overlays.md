---
title: Migrating native overlays
description: Upgrade overlay items to native dialogs and popovers while keeping your customizations.
order: 15
---

Overlay items 2.x use the browser's top layer. Dialog, Alert Dialog, Sheet
and Drawer use `HTMLDialogElement.showModal()`. Popover, Tooltip, Hover Card,
Dropdown Menu, Context Menu, Select and Combobox use the Popover API.
Upgrade the CLI first, then preview the registry update:

```bash
npm install --save-dev @ndop/cli@^2
npx ndop update dialog alert-dialog sheet drawer popover tooltip hover-card dropdown-menu context-menu menubar select combobox --dry-run
```

Apply the same command without `--dry-run` after reviewing the diff. The new
items require `@ndop/primitives` and `@ndop/core` 2.x; the CLI plans these
package updates with the files. Keep the existing import of `@ndop/core/styles.css`.

## Imports and markup

Styled parts carry presentation. Behavior-only parts now come directly from
the primitives package. For example:

```ts
import { NdDialog, NdDialogTrigger, NdDialogClose } from '@ndop/primitives/dialog';
import { DialogContent, DialogTitle } from '@/ui/dialog/dialog';
```

```html
<ng-container ndDialog [(open)]="open">
  <button ndDialogTrigger>Edit profile</button>
  <dialog ndDialogContent class="backdrop:bg-black/70">
    <h2 ndDialogTitle>Edit profile</h2>
    <button ndDialogClose>Done</button>
  </dialog>
</ng-container>
```

Use a native `dialog` for every modal content part, including `ndSheetContent`
and `ndDrawerContent`. Remove separate overlay elements; style the native
`::backdrop` with `backdrop:` utilities or a CSS rule. Sheets use `NdDialog`,
`NdDialogTrigger` and `NdDialogClose` with `ndDialog` selectors; their styled
content/header/footer retain the `ndSheetContent` family of selectors.
Menu groups use `NdMenuGroup`/`NdMenuRadioGroup` with their generic selectors.
Select and Combobox roots and unstyled parts come from their primitive packages.

The codemods preserve existing local aliases and public barrel names, so the
result may use `NdDialog as Dialog`. They migrate Sheet template references
to use `#panel="ndDialog"` while keeping the local `panel` name. Ordinary static Tailwind
classes on an old overlay become `backdrop:` classes on its content. Local
lazy portal templates remain supported for compatibility, but new modal
markup can declare the content directly as above.

## Review custom behavior

Updates prepare the whole plan before writing files. Namespace/dynamic imports,
computed or imported inline templates, custom overlay event handlers, custom
CSS classes, arbitrary backdrop utilities or ambiguous content/overlay pairs
stop preparation with an actionable message. Convert these cases manually,
then run the update again. For computed or imported inline templates, use a
literal/local literal constant or an external `templateUrl` during migration;
afterwards you can restore composition using the migrated markup. No partially
migrated files are written on failure.
Literal inline templates, local literal constants and external HTML templates
are supported. Repeating an update is safe, including after resolving item
merge conflicts with `ndop update --continue`.

Removed forwarding parts no longer supply their old `data-slot` attributes.
Change custom CSS or tests that target these slots to use the directive
attribute, or add your own explicit slot. Styled content and item slots remain.

## Browser behavior

Native modal dialogs make the background inert and handle Escape cancellation.
The open model also follows native `close` events, including forms with
`method="dialog"`. `closeOnEscape` and `closeOnOverlayClick` remain available;
Alert Dialog keeps backdrop dismissal disabled. Focus returns to a connected
trigger, with a fallback for browsers that need it. A nested popup consumes its
own Escape before its dialog closes.

Tab and Shift+Tab follow native modality: browser controls can receive focus
before navigation re-enters the active modal. The background page cannot.
There is no custom focus trap. Scroll locking preserves the document position
until the final modal closes.

Popovers use native light dismiss and synchronize `open` from native toggle
events. Tooltip and Hover Card use hint popovers where supported and a manual
hint fallback otherwise, keeping parent popovers open. Positioning uses CSS
anchors where supported with JavaScript flipping/shifting and a fallback that
tracks scrolling, resizing and disconnected anchors. Native APIs must be
available in the browser; older browsers need application-supplied polyfills.
Nothing opens on the server; bound initial state applies after hydration.

Exit motion uses `data-state`, `@starting-style` and discrete display/overlay
transitions. Reduced-motion preferences are respected. Test your customized
content, backdrop and focus behavior in the browsers your application supports.
