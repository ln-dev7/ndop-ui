import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { ND_DIALOG } from './dialog';

/**
 * Button that opens and closes its {@link NdDialog}.
 *
 * Sets `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` (only
 * while open, since the content doesn't exist when closed) and
 * `data-state`.
 *
 * @example
 * ```html
 * <button ndDialogTrigger>Edit profile</button>
 * ```
 */
@Directive({
  selector: '[ndDialogTrigger]',
  host: {
    'aria-haspopup': 'dialog',
    '[attr.aria-expanded]': 'dialog.open()',
    '[attr.aria-controls]': 'dialog.open() ? dialog.contentId() : null',
    '[attr.data-state]': 'dialog.open() ? "open" : "closed"',
    '(click)': 'dialog.toggle()',
  },
})
export class NdDialogTrigger {
  /** The dialog this trigger controls. */
  protected readonly dialog = inject(ND_DIALOG);

  constructor() {
    this.dialog.registerTrigger(inject(ElementRef).nativeElement);
    inject(DestroyRef).onDestroy(() => this.dialog.registerTrigger(null));
  }
}
