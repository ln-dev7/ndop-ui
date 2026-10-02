# @ndop/primitives

Headless, signal-based Angular directives for state, keyboard, focus, ARIA and
overlay wiring. No styles. Zoneless, SSR-safe, and tested against each
primitive's written accessibility contract.

> Not released yet. See [RFC-0001](../../rfcs/0001-ndop-ui.md).

## Install

```bash
pnpm add @ndop/primitives @angular/cdk
```

## Usage

Each primitive is its own entry point (ADR-0004):

```ts
import { NdDialog, NdDialogContent, NdDialogTrigger } from '@ndop/primitives/dialog';
```

| Entry point                  | Directives                                                                                    | Contract                     |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------- |
| `@ndop/primitives/button`    | `NdButton`                                                                                    | [spec.md](button/spec.md)    |
| `@ndop/primitives/dialog`    | `NdDialog`, `…Trigger`, `…Portal`, `…Overlay`, `…Content`, `…Title`, `…Description`, `…Close` | [spec.md](dialog/spec.md)    |
| `@ndop/primitives/input`     | `NdInput`, `NdControlRegistry`                                                                | [spec.md](input/spec.md)     |
| `@ndop/primitives/label`     | `NdLabel`                                                                                     | [spec.md](label/spec.md)     |
| `@ndop/primitives/popover`   | `NdPopover`, `…Trigger`, `…Portal`, `…Content`, `…Close`                                      | [spec.md](popover/spec.md)   |
| `@ndop/primitives/separator` | `NdSeparator`                                                                                 | [spec.md](separator/spec.md) |
| `@ndop/primitives/tooltip`   | `NdTooltip`, `…Trigger`, `…Portal`, `…Content`                                                | [spec.md](tooltip/spec.md)   |

`@ndop/primitives/internal` holds shared building blocks and is not public
API.

## Docs

https://ndop.dev
