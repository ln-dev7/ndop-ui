# Slider: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) and, with two or
more thumbs, [Slider (Multi-Thumb)](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/).

## Parts, roles and attributes

| Part        | Selector          | Role     | ARIA attributes                                                                                                          | Data attributes                                     |
| ----------- | ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Slider      | `[ndSlider]`      |          |                                                                                                                          | `data-orientation`, `data-disabled`                 |
| SliderTrack | `[ndSliderTrack]` |          |                                                                                                                          | `data-orientation`, `data-disabled`                 |
| SliderRange | `[ndSliderRange]` |          |                                                                                                                          | `data-orientation`                                  |
| SliderThumb | `[ndSliderThumb]` | `slider` | `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext`, `aria-orientation`, `aria-disabled`, `aria-invalid` | `data-orientation`, `data-disabled`, `data-invalid` |

- **Slider** sets the scale for its thumbs: `min` (default `0`), `max`
  (default `100`) and `step` (default `1`). `orientation` is `horizontal`
  (default) or `vertical`. `disabled` (default `false`) disables every
  thumb. It has no role: the thumbs are the controls.
- **SliderThumb** owns one value: `value` is a `model()` (two-way
  `[(value)]`, default `0`); unbound, it starts from `defaultValue`. The
  thumb shows and announces its value snapped to `step` and within `min`
  and `max`, and the values it sets are always snapped and within them.
  Each thumb needs a name, from `aria-label` or `aria-labelledby`. Put two
  thumbs in one slider for a range.
- With several thumbs, in document order, a thumb can't pass its
  neighbors: its `aria-valuemin` and `aria-valuemax` are the values of the
  thumbs before and after it, or the slider's bounds.
- `valueText` (optional) sets `aria-valuetext`, for values a number
  doesn't say well, such as "Monday" or "$40".
- A thumb is focusable (`tabindex="0"`) unless the slider is disabled,
  when it has `aria-disabled="true"` and no `tabindex`.
- **Forms**: each thumb owns its value, so it implements
  `ControlValueAccessor` and Signal Forms' `FormValueControl` (a number),
  and every forms library binds it through its value accessor (ADR-0004,
  amendments 1 and 4). Invalid means the `invalid` input without a forms
  library, or a bound field that is invalid and touched:
  `aria-invalid="true"` and `data-invalid`. Leaving a thumb marks its
  field touched. Inside a form field, a thumb's `aria-describedby` lists
  the field's description and error.
- **SliderRange** spans from the slider's start to a single thumb, or
  between the lowest and highest of several. It and the thumbs expose
  their positions as percentages for styling; the primitive sets no
  styles.
- **Pointer**: pressing anywhere on the slider moves the nearest thumb
  there and focuses it; dragging moves it until the pointer is released.

## Keyboard map

| Key                      | Action                                                                |
| ------------------------ | --------------------------------------------------------------------- |
| `ArrowRight`, `ArrowUp`  | Increases the focused thumb's value by one step.                      |
| `ArrowLeft`, `ArrowDown` | Decreases the focused thumb's value by one step.                      |
| `PageUp`                 | Increases the value by ten steps.                                     |
| `PageDown`               | Decreases the value by ten steps.                                     |
| `Home`                   | Sets the value to its minimum: the slider's, or the previous thumb's. |
| `End`                    | Sets the value to its maximum: the slider's, or the next thumb's.     |

## Focus behavior

- Keys and dragging keep focus on the thumb; pressing the slider's track
  focuses the thumb it moves.
- Leaving a thumb marks its bound field touched.

## RTL behavior

Horizontal sliders run from the start side, so the minimum is on the right
in right-to-left layouts, and `ArrowLeft` increases the value while
`ArrowRight` decreases it. Vertical sliders run bottom to top in either
direction. Direction comes from the nearest `dir` attribute, on the
slider or an ancestor.
