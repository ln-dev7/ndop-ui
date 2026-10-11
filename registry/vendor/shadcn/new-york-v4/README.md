# Vendored shadcn/ui sources

shadcn/ui new-york-v4 registry items (MIT License, Copyright (c) 2023 shadcn),
fetched on 2026-10-02 (badge on 2026-10-03; the Phase 6 batch A and B items on 2026-10-09, batch C and D on 2026-10-10) from https://ui.shadcn.com/r/styles/new-york-v4/<item>.json.
The styled items' parity tests compare their classes with these files
(ADR-0014). Refresh deliberately, in its own commit, and review the diff.

| File | SHA-256 |
| ---- | ------- |



## Where the styled items come from
(ADR-0014, amendment 1). This table keeps what each item's header used to
The registry's files carry no notices; the registry-level license notice,
an item is re-copied or changes on purpose.
say: its source and every deliberate difference from it. Update it when
the README's acknowledgements and the docs' credit cover them
| ---- | ------ | -------------------------------------- |
| Item | Copied | Differences from shadcn/ui new-york-v4 |
| `accordion.json` | `93254d43d27259998b10c7bb5261f85bdc44509d46309a5c10a1e5d126a8d279` |
| `alert-dialog.json` | `03c0d4de131a9b049e9080724666045c8785074af7e07040a0a0f922a810e7c2` |
| `alert-dialog` | 2026-10-10 | `text-left` becomes `text-start`. Action and Cancel are directives on the user's `button` with Button's classes, `variant` and `size`, instead of wrapping a Button. Exit animations don't play, as for Dialog. |
| `alert.json` | `413c97869ec0e53efa4a37f590833bcf4a7a57255f5a2e909c6bb5bac7b4570d` |
| `alert` | 2026-10-09 | `role` is an input (`alert` by default, as shadcn has it), so callouts rendered with the page can be `none` or `status`. The destructive description is full `text-destructive`: shadcn's `/90` is 4.49:1 on the card, under WCAG's 4.5:1. |
| `aspect-ratio.json` | `f80a95d041bfc0b7fb0f15c88eaccfb449803733b5254a83f2401e4383ced9e7` |
| `aspect-ratio` | 2026-10-09 | The CSS `aspect-ratio` property instead of Radix's padding wrapper; `relative w-full` added. |
| `avatar.json` | `f843fc6e2d2fea1337bdcdc8b70c5189f84562d87f8e852e994f4bbdd7cd229d` |
| `avatar` | 2026-10-09 | The image covers the fallback (`absolute inset-0`) once loaded instead of replacing it. The fallback and group count use `text-foreground`: shadcn's `text-muted-foreground` on `bg-muted` is 4.3:1, under WCAG's 4.5:1. The badge sits at `end-0`, and groups reverse their spacing in RTL. |
| `badge.json` | `0f988b37cf1c56e7ecc83b1dcf24c9af4e73ce4341da5caf2c9d9b07a551319b` |
| `badge` | 2026-10-03 | `destructive` uses `text-destructive-foreground`, not `text-white`: registry items use tokens only (RFC-0001, ADR-0006). An attribute on any element replaces `asChild`, so the hover styles shadcn scopes to links with `[a&]` apply to an `a[ndBadge]` the same way. |
| `breadcrumb.json` | `18043f281e20e08fa017a3bba2b2dec462ebba2b0ebf9685b34225cf7b253bfa` |
| `breadcrumb` | 2026-10-09 | The current page is text with `aria-current="page"`, without shadcn's `role="link" aria-disabled`. Separators and the ellipsis hold the user's icons, sized with `[&>svg]:` and turned around in RTL. The landmark is named "Breadcrumb". |
| `button.json` | `4b8d7d848742727973c1b088af8d15f0b628272a1316f2d2fa344e73ddff9e9c` |
| `button` | 2026-10-02 | `destructive` uses `text-destructive-foreground`, not `text-white`. `data-disabled:*` mirror `disabled:*`, because a disabled link has no `:disabled` state. |
| `card.json` | `c7ebaa49ba2a0613838558f3892c5007523c2dc26d6b36a244145d454a796106` |
| `card` | 2026-10-09 | Parts are attributes on the user's elements, so a card can be a `section` or `article` and its title a heading. |
| `checkbox.json` | `567b649e4cd68c05bfdc58ca00fa04aee38bca291cd6f16ed7776ec06ba3d6bd` |
| `checkbox` | 2026-10-09 | Adds `data-[state=indeterminate]` styles matching the checked ones, for a mixed checkbox. The check icon is the user's `<svg ndIcon="check">`, sized by the indicator with `[&>svg]:size-3.5`. |
| `collapsible.json` | `fdc6666e9c728d7e731b0e4d67e11db81020aff47408c259549fc1aefcc8e3e7` |
| `collapsible` | 2026-10-09 | None: the item re-exports the primitive's parts, which have no styles. |
| `combobox.json` | `ecc152a123416631dd63058fdd92834a690947dd71b8b9746c6889b0aadb934b` |
| `command.json` | `c1f02d0805a0c5c55428e3350214ca8150a4ce98a40ec962118ec66709f60038` |
| `context-menu.json` | `e9680a7b71840b7203e1625acab8754d7c18122b66289baf281c3a6e31246ada` |
| `context-menu` | 2026-10-10 | As Dropdown Menu, on the Menu primitive and `CdkContextMenuTrigger`. |
| `dialog.json` | `0115e3a57aa55a978c5fed0d77f7e98edd694215aae3e569def3fff722ba9f26` |
| `dialog` | 2026-10-02 | shadcn renders the portal, overlay and close button inside `DialogContent`; directives can't render elements, so users write `ndDialogPortal`, `ndDialogOverlay` and `ndDialogCloseButton` (shadcn's close button classes). The close icon is `<svg ndIcon="x">` (ADR-0013). `data-[state=closed]` exit animations are kept, but the content is removed as soon as the dialog closes, so only enter animations play. The close button sits at `end-4` and the header aligns `sm:text-start`, not `right-4` and `sm:text-left`, so both mirror in right-to-left layouts (RFC-0001). |
| `drawer.json` | `3a7c12a2ebfd888f76d3eb5a19ab12f64a8b09d37b8138492b39ac32e4fd8d09` |
| `drawer` | 2026-10-10 | vaul's behavior is the primitive's own code. `data-[vaul-drawer-direction=…]` becomes the primitive's `data-[direction=…]`, with logical sides (`right`/`left` become `end`/`start`). The handle is `ndDrawerHandle`, written by the user. The content follows the drag through `--nd-drawer-drag` with a spring-back transition, off for reduced motion, and slides in on open. |
| `dropdown-menu.json` | `235b1231cf71d94225eccd6c19117e7fa7b09cf256d23a199d63aee53265fd52` |
| `dropdown-menu` | 2026-10-10 | Built on the Menu primitive (`@angular/cdk/menu`). Logical sides and spacing (`ps-8`, `pe-2`, `start-2`, `ms-auto`, `data-[side=start\|end]`). The Radix custom properties are gone: `max-h-[80vh]` replaces the available-height one, and the transform origin is dropped. Checkbox and radio indicators are `ndDropdownMenuItemIndicator`, with the user's icon; the sub-trigger's chevron is the user's too. Group and radio group have no classes, as in shadcn. |
| `empty.json` | `2c377f47c4e661d73a565d37c0678d2445edfdcae5446e5b79f23ccda9b80f1d` |
| `empty` | 2026-10-09 | None. |
| `field.json` | `5524eca8a5aca35b2f02dac696144053ea8d3d02f722676942e4e92bb08efeb2` |
| `form-field` | 2026-10-09 | From shadcn/ui's `field` (`field.json`); named Form Field, as RFC-0001 does, and its classes are `Field`, `FieldLabel` and so on, as shadcn's are. The primitive sets `data-invalid` and `data-disabled` as presence attributes from the control, so `data-[invalid=true]:` and `group-data-[disabled=true]/field:` become `data-invalid:` and `group-data-disabled/field:`. `FieldError` shows the messages the user writes inside it rather than rendering an `errors` list, and is hidden until the field is invalid. `FieldSeparator` draws its line with `::before` and takes its text in `ndFieldSeparatorContent`, since a directive can't add elements. `FieldLabel` includes Label's classes, as shadcn's wraps Label. In a checked choice card, descriptions are `text-foreground/80`: shadcn's `text-muted-foreground` on the `bg-primary/5` tint is 4.27:1, under WCAG's 4.5:1. |
| `hover-card.json` | `205af771916016bd2d483032060ca4c10eb3f72887230d1acc258c2229e4e63a` |
| `hover-card` | 2026-10-10 | As Popover: logical sides and no `origin-(--radix-hover-card-content-transform-origin)`. |
| `input-otp.json` | `4700e3d241168a63ef104531a643c7949b170b47351e6b005137f99d0b6b4a41` |
| `input-otp` | 2026-10-09 | The `input-otp` library's behavior is the primitive's own code. Slots use logical sides (`border-e`, `first:rounded-s-md`) and the primitive's `data-active` and `data-invalid` presence attributes; slots are hidden from assistive technology, so they carry no `aria-invalid`. The fake caret is the slot's `::after`. The root adds `relative w-fit` for the invisible input stretched over the slots, and sets `dir="ltr"`. |
| `input.json` | `b1fffa12ba72ce30a291749012b47235eda110648b8106725ced22b5b31c8f1b` |
| `input` | 2026-10-02 | None. |
| `label.json` | `b03d6bc91da205758df87c5403d74bae4d742f1f4ac5ae0b94ad7a29ab6350ea` |
| `label` | 2026-10-02 | None. |
| `menubar.json` | `a2e17191b5c4fda9e05ca144845ccb687bd8b23665e27032d95f1d20635bc48f` |
| `navigation-menu.json` | `43549da4f61ef6040c62c7ed9eede9bf0c304c7a6378a3e515c5a47d6421e50d` |
| `pagination.json` | `e70ae7251fdb0f3c4c7473b158a15b35fa0a84ce999ce3aea66e6d6d3d409750` |
| `pagination` | 2026-10-09 | Previous and next are their own directives, with logical padding (`sm:ps-2.5`, `sm:pe-2.5`) and chevrons turned around in RTL; the user writes their icon and text, so the `hidden sm:block` and `sr-only` classes live in the examples. No `role="navigation"` on the `nav`. Links can be `button`s. |
| `popover.json` | `78793171b536e0c335ad51b1313619e533566b514d3503ef60c94dc9d3ccfbef` |
| `popover` | 2026-10-02 | `data-[side=left\|right]` become `data-[side=start\|end]` with `slide-in-from-end\|start`: Ndop sides are logical (RFC-0001). `origin-(--radix-popover-content-transform-origin)` is dropped: the CDK overlay sets no such variable. No `PopoverAnchor`: the trigger is always the anchor. Exit animations don't play, as for Dialog. |
| `progress.json` | `ca0c7ae4d88b8039a9ee64653569cf8be6a058070d9f719d2294c9d49d56bcab` |
| `progress` | 2026-10-09 | The indicator is sized by width rather than translated, so it fills from the start side in RTL (`w-full` dropped), and pulses across the bar while indeterminate. |
| `radio-group.json` | `299fa36d5c5df3aefa40a59d8d3f92a1ccc9feae6b5187135851d9846348f1af` |
| `radio-group` | 2026-10-09 | The indicator centers the icon with flex instead of `absolute top-1/2 left-1/2` and translates; the circle is the user's `<svg ndIcon="circle">`. The group adds `group/radio-group`, so items turn destructive while the group is invalid (`aria-invalid` is on the group). |
| `resizable.json` | `d6aa302ab794f451e9a38a68c746ded280eba15bcc4b9cf7a453624c4bcbafc6` |
| `scroll-area.json` | `a5e2e040b90e584c5282ee7ea758d1af5f5fbd88ecc89f11dddb098462d1e865` |
| `scroll-area` | 2026-10-09 | Native scrolling with `scrollbar-color` and `scrollbar-width: thin` instead of Radix's custom scrollbar, so the scrollbar and thumb classes are gone (ADR-0021). The region is focusable, with the viewport's focus ring, and scrolls vertically, horizontally or both. |
| `select.json` | `ca3189ea8101a04f144b6d0f0e7330841639bfa5f4d57e7cca0894d39b30817b` |
| `separator.json` | `4242a9fe839cae9083acff1280b7cccfda10e97bbc83283aed12d2d12bebdc6a` |
| `separator` | 2026-10-02 | shadcn defaults to decorative; Ndop keeps the primitive's semantic default (`role="separator"`), so `decorative` is passed for purely visual lines. |
| `sheet.json` | `bdf118300491675f05a9181af491217ba690929338aefd108437c2b07d25432f` |
| `sheet` | 2026-10-10 | Sides are logical: `right` and `left` become `end` and `start` (`end-0`, `border-s`, `slide-in-from-end`), the default is `end`, and the close button sits at `end-4`. The close button is `ndSheetCloseButton`, with the user's icon and name. The root and parts compose the Dialog primitive, as shadcn's compose Radix Dialog. |
| `skeleton.json` | `1ed4d99f9d632d9697a054eefcd19932abd68cef7808407986f6e14da401edf7` |
| `skeleton` | 2026-10-09 | `aria-hidden="true"` on the placeholder; the loading region says it's busy instead. |
| `slider.json` | `99f6044fa83df91dfda17d3cc57cf5297c3759d57fd483665e518e4961208e73` |
| `slider` | 2026-10-09 | Thumbs are positioned by the styled item from their values (`inset-inline-start` or `bottom`, pulled back by their own size so they stay inside the track), and the range from the thumbs' positions; each thumb holds one value. `bg-white` becomes `bg-background`: tokens only. Thumbs turn destructive while invalid. |
| `sonner.json` | `439c5d5256091829350d3136309f55f8ba788f1cc0f0dbad016ce6b5b2765488` |
| `spinner.json` | `9516791ff6443cb5dee344f4f61df812c6b1fa455b86eb2febd10acc66c0c178` |
| `spinner` | 2026-10-09 | An attribute on a wrapper (`span[ndSpinner]`) that spins the icon inside it, since `ndIcon` owns its `svg`'s ARIA; `inline-flex [&>svg]:size-full` added. The label is an input. |
| `switch.json` | `cc526c3a4827be315be746355a988e22dacc99d663ed31924fd30c2507cdc005` |
| `switch` | 2026-10-09 | The thumb also moves left when checked in right-to-left layouts (`rtl:data-[state=checked]:-translate-x-[calc(100%-2px)]`). Adds `aria-invalid` styles like Checkbox's. |
| `table.json` | `35a45f90ee92883533c4c1029212d38bd263694e90ea54fbfaf66a099f7d3cc4` |
| `table` | 2026-10-09 | The scroll container is its own directive, `ndTableContainer`. `text-left` and `pr-0` become `text-start` and `pe-0`. |
| `tabs.json` | `49320e6dcf56570753bb14ed3f5d66acf07d12e183c0e9024466995b25be5b1d` |
| `textarea.json` | `2367d3964326b19ca2355f872d08153c86932abd4b103b5fd02039a3f2cb8ae5` |
| `textarea` | 2026-10-09 | None. It composes the Input primitive, so it reflects the bound field's invalid and disabled states. |
| `toast` | 2026-10-10 | From shadcn/ui's `sonner` (`sonner.json`), which wraps the Sonner library; Ndop's toasts are the Toast primitive's own code, styled after Sonner's default look with tokens. The region keeps shadcn's `toaster group` classes. Icons for each type are the user's markup, in the region the app's shell renders. |
| `toggle-group.json` | `7b010cdf719088efdf887e392fbdc9fdd0b76d4f7b3b0e9db319616a90e8cf16` |
| `toggle-group` | 2026-10-09 | Joined items use logical sides (`first:rounded-s-md`, `last:rounded-e-md`, `border-s-0`, `first:border-s`), so the bar mirrors in right-to-left layouts. Vertical groups stack (`data-[orientation=vertical]:flex-col`). Items take the group's variant and size through dependency injection instead of React context. |
| `toggle.json` | `8c9f96fb87e2aa88961f4ded82fa9867ef0dadbc3e5ec51d16f1ebfa820037ea` |
| `toggle` | 2026-10-09 | None. |
| `tooltip.json` | `1b7b452b34beab05b22bd653963abd1c88ebd8e9ebcc89dcaebf4ac4938c929e` |
| `tooltip` | 2026-10-02 | Sides are logical, as for Popover. `origin-(--radix-tooltip-content-transform-origin)` is dropped. No arrow: the primitive doesn't position one. Timing follows the primitive's contract (700 ms to open on hover, immediate on keyboard focus) rather than shadcn's instant default. |

The default theme's token values are shadcn/ui's "neutral" Tailwind v4
palette (https://ui.shadcn.com/r/colors/neutral.json, MIT License,
Copyright (c) 2023 shadcn), fetched on 2026-10-02. Its fonts are Geist and
Geist Mono (SIL Open Font License 1.1), installed from `@fontsource-variable`
(ADR-0006, amendment 1).
