import { Directive, inject } from '@angular/core';
import { ND_DIALOG } from './dialog';

/**
 * Button that closes its {@link NdDialog}.
 *
 * @example
 * ```html
 * <button ndDialogClose>Cancel</button>
 * ```
 */
@Directive({
  selector: '[ndDialogClose]',
  host: { '(click)': 'dialog.open.set(false)' },
})
export class NdDialogClose {
  /** The dialog this button closes. */
  protected readonly dialog = inject(ND_DIALOG);
}
