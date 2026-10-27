import { Directive, inject } from '@angular/core';
import { ND_DIALOG } from './dialog';

/**
 * Legacy separate backdrop marker, retained for migration compatibility.
 * Native modal rendering uses the content element's `::backdrop` instead.
 *
 * @deprecated Style the native dialog's `::backdrop`; no overlay node is needed.
 *
 * @example
 * ```html
 * <dialog ndDialogContent aria-label="Details" class="backdrop:bg-black/50">…</dialog>
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
