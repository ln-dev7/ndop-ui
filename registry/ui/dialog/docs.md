A dialog interrupts the page to ask for a decision or information, and
blocks the rest of the page until it closes. It follows the WAI-ARIA modal
dialog pattern: focus moves into the dialog and stays there, Escape and the
close button close it, and focus returns to the trigger. Its content renders
in an `ng-template` portal, so nothing is in the page until it opens.

## Do

- Give every dialog an `ndDialogTitle`; it names the dialog for screen
  readers.
- Add an `ndDialogDescription` when the title alone doesn't explain what is
  being asked.
- Keep one task per dialog, with the main action in the footer.
- Bind `[(open)]` when the dialog's state matters to the page, for example
  to close it after a successful save.

## Don't

- Don't open a dialog from another dialog; replace its content or use a
  page instead.
- Don't put long or scrolling forms in a dialog; send people to a page.
- Don't use a dialog for messages that don't need an answer; show them
  inline.
