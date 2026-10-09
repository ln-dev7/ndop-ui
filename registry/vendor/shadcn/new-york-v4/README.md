# Vendored shadcn/ui sources

shadcn/ui new-york-v4 registry items (MIT License, Copyright (c) 2023 shadcn),
fetched on 2026-10-02 (badge on 2026-10-03; the Phase 6 batch A items on 2026-10-09) from https://ui.shadcn.com/r/styles/new-york-v4/<item>.json.
The styled items' parity tests compare their classes with these files
(ADR-0014). Refresh deliberately, in its own commit, and review the diff.

| File | SHA-256 |
| ---- | ------- |
| `alert.json` | `413c97869ec0e53efa4a37f590833bcf4a7a57255f5a2e909c6bb5bac7b4570d` |
| `aspect-ratio.json` | `f80a95d041bfc0b7fb0f15c88eaccfb449803733b5254a83f2401e4383ced9e7` |
| `avatar.json` | `f843fc6e2d2fea1337bdcdc8b70c5189f84562d87f8e852e994f4bbdd7cd229d` |
| `badge.json` | `0f988b37cf1c56e7ecc83b1dcf24c9af4e73ce4341da5caf2c9d9b07a551319b` |
| `breadcrumb.json` | `18043f281e20e08fa017a3bba2b2dec462ebba2b0ebf9685b34225cf7b253bfa` |
| `button.json` | `4b8d7d848742727973c1b088af8d15f0b628272a1316f2d2fa344e73ddff9e9c` |
| `card.json` | `c7ebaa49ba2a0613838558f3892c5007523c2dc26d6b36a244145d454a796106` |
| `collapsible.json` | `fdc6666e9c728d7e731b0e4d67e11db81020aff47408c259549fc1aefcc8e3e7` |
| `dialog.json` | `0115e3a57aa55a978c5fed0d77f7e98edd694215aae3e569def3fff722ba9f26` |
| `empty.json` | `2c377f47c4e661d73a565d37c0678d2445edfdcae5446e5b79f23ccda9b80f1d` |
| `input.json` | `b1fffa12ba72ce30a291749012b47235eda110648b8106725ced22b5b31c8f1b` |
| `label.json` | `b03d6bc91da205758df87c5403d74bae4d742f1f4ac5ae0b94ad7a29ab6350ea` |
| `pagination.json` | `e70ae7251fdb0f3c4c7473b158a15b35fa0a84ce999ce3aea66e6d6d3d409750` |
| `popover.json` | `78793171b536e0c335ad51b1313619e533566b514d3503ef60c94dc9d3ccfbef` |
| `progress.json` | `ca0c7ae4d88b8039a9ee64653569cf8be6a058070d9f719d2294c9d49d56bcab` |
| `scroll-area.json` | `a5e2e040b90e584c5282ee7ea758d1af5f5fbd88ecc89f11dddb098462d1e865` |
| `separator.json` | `4242a9fe839cae9083acff1280b7cccfda10e97bbc83283aed12d2d12bebdc6a` |
| `skeleton.json` | `1ed4d99f9d632d9697a054eefcd19932abd68cef7808407986f6e14da401edf7` |
| `spinner.json` | `9516791ff6443cb5dee344f4f61df812c6b1fa455b86eb2febd10acc66c0c178` |
| `table.json` | `35a45f90ee92883533c4c1029212d38bd263694e90ea54fbfaf66a099f7d3cc4` |
| `textarea.json` | `2367d3964326b19ca2355f872d08153c86932abd4b103b5fd02039a3f2cb8ae5` |
| `tooltip.json` | `1b7b452b34beab05b22bd653963abd1c88ebd8e9ebcc89dcaebf4ac4938c929e` |

## Where the styled items come from

The registry's files carry no notices; the registry-level license notice,
the README's acknowledgements and the docs' credit cover them
(ADR-0014, amendment 1). This table keeps what each item's header used to
say: its source and every deliberate difference from it. Update it when
an item is re-copied or changes on purpose.

| Item | Copied | Differences from shadcn/ui new-york-v4 |
| ---- | ------ | -------------------------------------- |
| `alert` | 2026-10-09 | `role` is an input (`alert` by default, as shadcn has it), so callouts rendered with the page can be `none` or `status`. The destructive description is full `text-destructive`: shadcn's `/90` is 4.49:1 on the card, under WCAG's 4.5:1. |
| `aspect-ratio` | 2026-10-09 | The CSS `aspect-ratio` property instead of Radix's padding wrapper; `relative w-full` added. |
| `avatar` | 2026-10-09 | The image covers the fallback (`absolute inset-0`) once loaded instead of replacing it. The fallback and group count use `text-foreground`: shadcn's `text-muted-foreground` on `bg-muted` is 4.3:1, under WCAG's 4.5:1. The badge sits at `end-0`, and groups reverse their spacing in RTL. |
| `badge` | 2026-10-03 | `destructive` uses `text-destructive-foreground`, not `text-white`: registry items use tokens only (RFC-0001, ADR-0006). An attribute on any element replaces `asChild`, so the hover styles shadcn scopes to links with `[a&]` apply to an `a[ndBadge]` the same way. |
| `breadcrumb` | 2026-10-09 | The current page is text with `aria-current="page"`, without shadcn's `role="link" aria-disabled`. Separators and the ellipsis hold the user's icons, sized with `[&>svg]:` and turned around in RTL. The landmark is named "Breadcrumb". |
| `button` | 2026-10-02 | `destructive` uses `text-destructive-foreground`, not `text-white`. `data-disabled:*` mirror `disabled:*`, because a disabled link has no `:disabled` state. |
| `card` | 2026-10-09 | Parts are attributes on the user's elements, so a card can be a `section` or `article` and its title a heading. |
| `collapsible` | 2026-10-09 | None: the item re-exports the primitive's parts, which have no styles. |
| `dialog` | 2026-10-02 | shadcn renders the portal, overlay and close button inside `DialogContent`; directives can't render elements, so users write `ndDialogPortal`, `ndDialogOverlay` and `ndDialogCloseButton` (shadcn's close button classes). The close icon is `<svg ndIcon="x">` (ADR-0013). `data-[state=closed]` exit animations are kept, but the content is removed as soon as the dialog closes, so only enter animations play. The close button sits at `end-4` and the header aligns `sm:text-start`, not `right-4` and `sm:text-left`, so both mirror in right-to-left layouts (RFC-0001). |
| `empty` | 2026-10-09 | None. |
| `input` | 2026-10-02 | None. |
| `label` | 2026-10-02 | None. |
| `pagination` | 2026-10-09 | Previous and next are their own directives, with logical padding (`sm:ps-2.5`, `sm:pe-2.5`) and chevrons turned around in RTL; the user writes their icon and text, so the `hidden sm:block` and `sr-only` classes live in the examples. No `role="navigation"` on the `nav`. Links can be `button`s. |
| `popover` | 2026-10-02 | `data-[side=left\|right]` become `data-[side=start\|end]` with `slide-in-from-end\|start`: Ndop sides are logical (RFC-0001). `origin-(--radix-popover-content-transform-origin)` is dropped: the CDK overlay sets no such variable. No `PopoverAnchor`: the trigger is always the anchor. Exit animations don't play, as for Dialog. |
| `progress` | 2026-10-09 | The indicator is sized by width rather than translated, so it fills from the start side in RTL (`w-full` dropped), and pulses across the bar while indeterminate. |
| `scroll-area` | 2026-10-09 | Native scrolling with `scrollbar-color` and `scrollbar-width: thin` instead of Radix's custom scrollbar, so the scrollbar and thumb classes are gone (ADR-0021). The region is focusable, with the viewport's focus ring, and scrolls vertically, horizontally or both. |
| `separator` | 2026-10-02 | shadcn defaults to decorative; Ndop keeps the primitive's semantic default (`role="separator"`), so `decorative` is passed for purely visual lines. |
| `skeleton` | 2026-10-09 | `aria-hidden="true"` on the placeholder; the loading region says it's busy instead. |
| `spinner` | 2026-10-09 | An attribute on a wrapper (`span[ndSpinner]`) that spins the icon inside it, since `ndIcon` owns its `svg`'s ARIA; `inline-flex [&>svg]:size-full` added. The label is an input. |
| `table` | 2026-10-09 | The scroll container is its own directive, `ndTableContainer`. `text-left` and `pr-0` become `text-start` and `pe-0`. |
| `textarea` | 2026-10-09 | None. It composes the Input primitive, so it reflects the bound field's invalid and disabled states. |
| `tooltip` | 2026-10-02 | Sides are logical, as for Popover. `origin-(--radix-tooltip-content-transform-origin)` is dropped. No arrow: the primitive doesn't position one. Timing follows the primitive's contract (700 ms to open on hover, immediate on keyboard focus) rather than shadcn's instant default. |

The default theme's token values are shadcn/ui's "neutral" Tailwind v4
palette (https://ui.shadcn.com/r/colors/neutral.json, MIT License,
Copyright (c) 2023 shadcn), fetched on 2026-10-02. Its fonts are Geist and
Geist Mono (SIL Open Font License 1.1), installed from `@fontsource-variable`
(ADR-0006, amendment 1).
