# Select: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Select-only combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/):
a button-like combobox that shows its value and opens a listbox of
options, on the CDK's `CdkListbox` in a CDK overlay (ADR-0004,
amendment 3).

## Markup

The listbox is written in place, after the trigger. It has the `hidden`
attribute while closed, so its options render on the server and the
trigger can show the selected option's text; opening moves it into an
overlay next to the trigger, and closing puts it back.

```html
<label ndLabel for="fruit">Fruit</label>
<ng-container ndSelect [(value)]="fruit">
  <button ndSelectTrigger id="fruit">
    <span ndSelectValue placeholder="Pick a fruit"></span>
  </button>
  <div ndSelectContent>
    <div ndSelectGroup aria-labelledby="fruit-label">
      <div ndSelectLabel id="fruit-label">Fruits</div>
      <div ndSelectItem value="apple">
        <span ndSelectItemText>Apple</span>
        <span ndSelectItemIndicator>✓</span>
      </div>
    </div>
  </div>
</ng-container>
```

## Parts, roles and attributes

| Part                | Selector                  | Role       | ARIA attributes                                                                                        | Data attributes                                   |
| ------------------- | ------------------------- | ---------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Select              | `[ndSelect]`              |            |                                                                                                        |                                                   |
| SelectTrigger       | `button[ndSelectTrigger]` | `combobox` | `aria-haspopup`, `aria-expanded`, `aria-controls`, `aria-required`, `aria-invalid`, `aria-describedby` | `data-state`, `data-placeholder`, `data-disabled` |
| SelectValue         | `[ndSelectValue]`         |            |                                                                                                        | `data-placeholder`                                |
| SelectContent       | `[ndSelectContent]`       | `listbox`  | `aria-labelledby` or `aria-label`, `aria-orientation`, `id`, `hidden`                                  | `data-state`, `data-side`                         |
| SelectItem          | `[ndSelectItem]`          | `option`   | `aria-selected`, `aria-disabled`, `id`                                                                 | `data-state`, `data-highlighted`, `data-disabled` |
| SelectItemText      | `[ndSelectItemText]`      |            |                                                                                                        |                                                   |
| SelectItemIndicator | `[ndSelectItemIndicator]` |            | `hidden`                                                                                               | `data-state`                                      |
| SelectGroup         | `[ndSelectGroup]`         | `group`    |                                                                                                        |                                                   |
| SelectLabel         | `[ndSelectLabel]`         |            |                                                                                                        |                                                   |
| SelectSeparator     | `[ndSelectSeparator]`     |            | `aria-hidden`                                                                                          |                                                   |

- **Select** goes on an `ng-container`. `value` is a `model()` holding the
  selected option's value, or `null`, with `defaultValue`. `open` is a
  `model()` too. `disabled`, `required` and `invalid` set the trigger's
  state.
- **SelectTrigger** is a native `button`. Name it with a
  `label[ndLabel]` whose `for` is its `id`, or with `aria-label`. The
  select owns its value, so the trigger is a `ControlValueAccessor` that
  Signal Forms (`[formField]`), reactive and template-driven forms bind
  (ADR-0004, amendments 1 and 4): put the forms directive on it, as on a
  native `select`. It joins a Form Field's description and error. Its text
  is the selected option's, through **SelectValue**, which shows
  `placeholder` (and has `data-placeholder`) while nothing is selected.
- **SelectContent** composes `CdkListbox`. It takes its name from the
  trigger's labels, or its `aria-label`. While open, it sits below the
  trigger (`side`, default `bottom`; `align`, default `start`;
  `sideOffset`, default `4`), at least as wide as the trigger, and flips
  to fit the viewport; `data-side` says where it ended up. The trigger's
  width is in `--nd-select-trigger-width`.
- **SelectItem** composes `CdkOption`, with a required `value` and a
  `disabled` input. Its text is that of its **SelectItemText**, or its
  own, unless `label` is set. `data-highlighted` marks the focused option.
- **SelectItemIndicator** has the `hidden` attribute unless its option is
  selected.
- **SelectGroup** has `role="group"`; name it with `aria-labelledby`
  pointing at a **SelectLabel**. **SelectSeparator** is decorative.
- The listbox is never shown on the server; an initial open state takes
  effect after hydration.

## Keyboard map

| Key                    | Action                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `Enter`, `Space`       | On the trigger, opens the listbox; on an option, selects it, closes and focuses the trigger.                            |
| `ArrowDown`, `ArrowUp` | On the trigger, opens the listbox; in it, moves to the next or previous enabled option.                                 |
| `Home`, `End`          | In the listbox, moves to the first or last enabled option.                                                              |
| `a`                    | Typeahead: on the closed trigger, selects the next option starting with the typed letters; in the listbox, moves to it. |
| `Escape`               | Closes the listbox and focuses the trigger.                                                                             |
| `Tab`                  | Closes the listbox and moves focus on from the trigger.                                                                 |

## Focus behavior

- Opening focuses the selected option, or the first enabled one.
- Selecting an option, `Escape` and `Tab` close the listbox; the first two
  return focus to the trigger. A click outside closes it where focus is.
- Focus leaving the trigger and listbox marks a bound field touched.

## RTL behavior

`start` and `end` alignments are logical and swap in right-to-left
layouts. The listbox is vertical, so its arrow keys don't change.
