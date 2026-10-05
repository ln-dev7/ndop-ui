# Vendored shadcn/ui sources

shadcn/ui new-york-v4 registry items (MIT License, Copyright (c) 2023 shadcn),
fetched on 2026-10-02 (badge on 2026-10-03) from https://ui.shadcn.com/r/styles/new-york-v4/<item>.json.
The styled items' parity tests compare their classes with these files
(ADR-0014). Refresh deliberately, in its own commit, and review the diff.

| File | SHA-256 |
| ---- | ------- |
| `badge.json` | `0f988b37cf1c56e7ecc83b1dcf24c9af4e73ce4341da5caf2c9d9b07a551319b` |
| `button.json` | `4b8d7d848742727973c1b088af8d15f0b628272a1316f2d2fa344e73ddff9e9c` |
| `dialog.json` | `0115e3a57aa55a978c5fed0d77f7e98edd694215aae3e569def3fff722ba9f26` |
| `input.json` | `b1fffa12ba72ce30a291749012b47235eda110648b8106725ced22b5b31c8f1b` |
| `label.json` | `b03d6bc91da205758df87c5403d74bae4d742f1f4ac5ae0b94ad7a29ab6350ea` |
| `popover.json` | `78793171b536e0c335ad51b1313619e533566b514d3503ef60c94dc9d3ccfbef` |
| `separator.json` | `4242a9fe839cae9083acff1280b7cccfda10e97bbc83283aed12d2d12bebdc6a` |
| `tooltip.json` | `1b7b452b34beab05b22bd653963abd1c88ebd8e9ebcc89dcaebf4ac4938c929e` |

## Where the styled items come from

The registry's files carry no notices; the registry-level license notice,
the README's acknowledgements and the docs' credit cover them
(ADR-0014, amendment 1). This table keeps what each item's header used to
say: its source and every deliberate difference from it. Update it when
an item is re-copied or changes on purpose.

| Item | Copied | Differences from shadcn/ui new-york-v4 |
| ---- | ------ | -------------------------------------- |
| `badge` | 2026-10-03 | `destructive` uses `text-destructive-foreground`, not `text-white`: registry items use tokens only (RFC-0001, ADR-0006). An attribute on any element replaces `asChild`, so the hover styles shadcn scopes to links with `[a&]` apply to an `a[ndBadge]` the same way. |
| `button` | 2026-10-02 | `destructive` uses `text-destructive-foreground`, not `text-white`. `data-disabled:*` mirror `disabled:*`, because a disabled link has no `:disabled` state. |
| `dialog` | 2026-10-02 | shadcn renders the portal, overlay and close button inside `DialogContent`; directives can't render elements, so users write `ndDialogPortal`, `ndDialogOverlay` and `ndDialogCloseButton` (shadcn's close button classes). The close icon is `<svg ndIcon="x">` (ADR-0013). `data-[state=closed]` exit animations are kept, but the content is removed as soon as the dialog closes, so only enter animations play. The close button sits at `end-4` and the header aligns `sm:text-start`, not `right-4` and `sm:text-left`, so both mirror in right-to-left layouts (RFC-0001). |
| `input` | 2026-10-02 | None. |
| `label` | 2026-10-02 | None. |
| `popover` | 2026-10-02 | `data-[side=left\|right]` become `data-[side=start\|end]` with `slide-in-from-end\|start`: Ndop sides are logical (RFC-0001). `origin-(--radix-popover-content-transform-origin)` is dropped: the CDK overlay sets no such variable. No `PopoverAnchor`: the trigger is always the anchor. Exit animations don't play, as for Dialog. |
| `separator` | 2026-10-02 | shadcn defaults to decorative; Ndop keeps the primitive's semantic default (`role="separator"`), so `decorative` is passed for purely visual lines. |
| `tooltip` | 2026-10-02 | Sides are logical, as for Popover. `origin-(--radix-tooltip-content-transform-origin)` is dropped. No arrow: the primitive doesn't position one. Timing follows the primitive's contract (700 ms to open on hover, immediate on keyboard focus) rather than shadcn's instant default. |

The default theme's token values are shadcn/ui's "neutral" Tailwind v4
palette (https://ui.shadcn.com/r/colors/neutral.json, MIT License,
Copyright (c) 2023 shadcn), fetched on 2026-10-02. Its fonts are Geist and
Geist Mono (SIL Open Font License 1.1), installed from `@fontsource-variable`
(ADR-0006, amendment 1).
