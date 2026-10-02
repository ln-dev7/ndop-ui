import { Directive, inject } from '@angular/core';
import { ND_DIALOG } from './dialog';

/**
 * Optional backdrop rendered behind the content. Hidden from assistive
 * technology; a click on it closes the dialog unless `closeOnOverlayClick`
 * is `false`.
 *
 * @example
 * ```html
 * <div ndDialogOverlay class="fixed inset-0 bg-black/50"></div>
 * ```
 */
@Directive({
  selector: '[ndDialogOverlay]',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': 'dialog.open() ? "open" : "closed"',
    '(click)': 'close()',
  },
})
export class NdDialogOverlay {
  /** The dialog this overlay belongs to. */
  protected readonly dialog = inject(ND_DIALOG);

  /** Closes the dialog when overlay clicks are allowed. */
  protected close(): void {
    if (this.dialog.closeOnOverlayClick()) {
      this.dialog.open.set(false);
    }
  }
}
