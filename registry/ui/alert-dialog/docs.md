---
keywords: alert dialog, confirm, confirmation, are you sure, delete, destructive, modal
---

An alert dialog interrupts with a question the user must answer before
going on, such as confirming a deletion. It's announced as an alert
dialog, labelled by its question and described by what answering means.
Clicking outside doesn't close it; Escape and Cancel do, and focus starts
on Cancel, the safe choice. Use `size="sm"` for a short, centered
question with buttons side by side.

Behavior-only parts now come directly from `@ndop/primitives`; styled parts
remain in your local item file. See [Migrating native overlays](/docs/getting-started/native-overlays)
for the imports, selectors and customization changes.

Content must be a native `dialog`. Style its `::backdrop` with `backdrop:`
utilities; a separate overlay element is unnecessary.

## Do

- Ask a question with a clear answer, and name the buttons after what
  they do, such as "Delete project" rather than "OK".
- Use the destructive variant for the action when it destroys something.
- Say what can't be undone.

## Don't

- Don't use it for information that needs no answer; use a Toast or an
  Alert.
- Don't put forms in it; use a Dialog.
