---
keywords: dropdown, dropdown menu, menu, actions, options, kebab, more, overflow
---

A dropdown menu lists actions or options under a button, such as a
row's actions in a table or an account menu. It's a menu button: Enter,
Space or the arrow keys open it on the first or last item, the arrow
keys and typing move between items, and Escape closes it and returns to
the button. Items can be checkboxes, radios or open submenus, and can be
disabled while staying reachable.

## Do

- Name the button after what the menu is for, such as "Actions" or an
  icon with an `aria-label`.
- Group related items, with labels and separators.
- Mark dangerous actions with `variant="destructive"`.

## Don't

- Don't put links to pages in it; use Navigation Menu.
- Don't use it for choosing one value in a form; use a Select.
