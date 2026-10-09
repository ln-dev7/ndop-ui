---
keywords: form field, field, form, label, description, help text, error message, validation, fieldset, legend
---

A field lays out one form control with its label, description and error,
and links them for screen readers: the control's description lists the
help text and, once the control is invalid and has been touched, the
error, which then appears and is announced. The field turns destructive
with it. Fields stack the label above the control, sit side by side for
checkboxes and switches, or switch between the two by width; field sets
and groups space related fields.

## Do

- Put each control in its own field, with a label.
- Write errors that say how to fix the problem, such as "Enter an email
  address like ada@example.com".
- Group related fields in a field set with a legend, such as an address.

## Don't

- Don't show errors before people have left the field.
- Don't put more than one text control in a field; give each its own.
