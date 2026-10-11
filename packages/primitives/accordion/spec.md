# Accordion: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)

## Markup

Each trigger is a native `button` inside a heading of the level that fits
the page.

```html
<div ndAccordion collapsible defaultValue="shipping">
  <div ndAccordionItem value="shipping">
    <h3 ndAccordionHeader>
      <button ndAccordionTrigger>Shipping</button>
    </h3>
    <div ndAccordionContent>Ships in two days.</div>
  </div>
</div>
```

## Parts, roles and attributes

| Part             | Selector                     | Role     | ARIA attributes                                         | Data attributes                                 |
| ---------------- | ---------------------------- | -------- | ------------------------------------------------------- | ----------------------------------------------- |
| Accordion        | `[ndAccordion]`              |          |                                                         |                                                 |
| AccordionItem    | `[ndAccordionItem]`          |          |                                                         | `data-state`, `data-disabled`                   |
| AccordionHeader  | `[ndAccordionHeader]`        |          |                                                         | `data-state`, `data-disabled`                   |
| AccordionTrigger | `button[ndAccordionTrigger]` |          | `aria-expanded`, `aria-controls`, `aria-disabled`, `id` | `data-state`, `data-disabled`                   |
| AccordionContent | `[ndAccordionContent]`       | `region` | `aria-labelledby`, `id`, `hidden`                       | `data-state`, `data-disabled`, `data-animating` |

- **Accordion** composes the CDK's `CdkAccordion`. `value` is a `model()`
  listing the open items' values, with `defaultValue` (one value or a
  list). `multiple` lets several items be open at once; without it,
  opening one closes the others. `collapsible` lets the open item close
  when only one may be open. `disabled` disables every item.
- **AccordionItem** composes `CdkAccordionItem`, with a required `value`
  and a `disabled` input. `data-state` is `open` or `closed`.
- **AccordionHeader** goes on the heading element (`h2` to `h6`) around the
  trigger; the heading keeps its native role.
- **AccordionTrigger** shows or hides its item's content. When it is the
  open item and can't close (one item at a time, not collapsible), it has
  `aria-disabled="true"`.
- **AccordionContent** is a region labelled by its trigger. It has the
  `hidden` attribute while closed and stays in the document, so it renders
  on the server and the browser's find-in-page can't miss it once open.
  When its item opens or closes, it sets `--nd-accordion-content-height`
  to its height, for the styled layer to animate, and gets the `hidden`
  attribute only once a closing animation ends, and has `data-animating`
  while an animation runs. Sections open or closed on the first render
  don't animate.

## Keyboard map

| Key              | Action                                                                    |
| ---------------- | ------------------------------------------------------------------------- |
| `Tab`            | Moves focus through the triggers and any open content, in document order. |
| `Enter`, `Space` | Opens or closes the focused trigger's item.                               |
| `ArrowDown`      | Moves focus to the next enabled trigger, wrapping to the first.           |
| `ArrowUp`        | Moves focus to the previous enabled trigger, wrapping to the last.        |
| `Home`           | Moves focus to the first enabled trigger.                                 |
| `End`            | Moves focus to the last enabled trigger.                                  |

## Focus behavior

- Every enabled trigger is in the tab order; opening or closing an item
  keeps focus on its trigger.
- Disabled triggers are skipped by the arrow keys.

## RTL behavior

Nothing mirrors: the arrow keys follow the vertical order of the triggers.
