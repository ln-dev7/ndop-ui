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

| Entry point                     | Directives                                                                                    | Contract                        |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------- |
| `@ndop/primitives/avatar`       | `NdAvatar`, `…Image`, `…Fallback`                                                             | [spec.md](avatar/spec.md)       |
| `@ndop/primitives/button`       | `NdButton`                                                                                    | [spec.md](button/spec.md)       |
| `@ndop/primitives/checkbox`     | `NdCheckbox`, `…Indicator`                                                                    | [spec.md](checkbox/spec.md)     |
| `@ndop/primitives/collapsible`  | `NdCollapsible`, `…Trigger`, `…Content`                                                       | [spec.md](collapsible/spec.md)  |
| `@ndop/primitives/dialog`       | `NdDialog`, `…Trigger`, `…Portal`, `…Overlay`, `…Content`, `…Title`, `…Description`, `…Close` | [spec.md](dialog/spec.md)       |
| `@ndop/primitives/form-field`   | `NdField`, `…Description`, `…Error`                                                           | [spec.md](form-field/spec.md)   |
| `@ndop/primitives/input`        | `NdInput`, `NdControlRegistry`                                                                | [spec.md](input/spec.md)        |
| `@ndop/primitives/input-otp`    | `NdInputOtp`, `…Input`, `…Group`, `…Slot`, `…Separator`                                       | [spec.md](input-otp/spec.md)    |
| `@ndop/primitives/label`        | `NdLabel`                                                                                     | [spec.md](label/spec.md)        |
| `@ndop/primitives/popover`      | `NdPopover`, `…Trigger`, `…Portal`, `…Content`, `…Close`                                      | [spec.md](popover/spec.md)      |
| `@ndop/primitives/progress`     | `NdProgress`, `…Indicator`                                                                    | [spec.md](progress/spec.md)     |
| `@ndop/primitives/radio-group`  | `NdRadioGroup`, `…Item`, `…Indicator`                                                         | [spec.md](radio-group/spec.md)  |
| `@ndop/primitives/separator`    | `NdSeparator`                                                                                 | [spec.md](separator/spec.md)    |
| `@ndop/primitives/slider`       | `NdSlider`, `…Track`, `…Range`, `…Thumb`                                                      | [spec.md](slider/spec.md)       |
| `@ndop/primitives/switch`       | `NdSwitch`, `…Thumb`                                                                          | [spec.md](switch/spec.md)       |
| `@ndop/primitives/toggle`       | `NdToggle`                                                                                    | [spec.md](toggle/spec.md)       |
| `@ndop/primitives/toggle-group` | `NdToggleGroup`, `…Item`                                                                      | [spec.md](toggle-group/spec.md) |
| `@ndop/primitives/tooltip`      | `NdTooltip`, `…Trigger`, `…Portal`, `…Content`                                                | [spec.md](tooltip/spec.md)      |

`@ndop/primitives/internal` holds shared building blocks and is not public
API.

## Docs

https://ndop.dev
