import {
  DestroyRef,
  Directive,
  HostAttributeToken,
  inject,
} from '@angular/core';
import { injectId } from '@ndop/primitives/internal';
import { ND_DIALOG } from './dialog';

/**
 * The dialog's title; its id labels the content (`aria-labelledby`). Keeps
 * an id the element already has.
 *
 * @example
 * ```html
 * <h2 ndDialogTitle>Edit profile</h2>
 * ```
 */
@Directive({
  selector: '[ndDialogTitle]',
  host: { '[attr.id]': 'id' },
})
export class NdDialogTitle {
  /** The element id. */
  protected readonly id =
    inject(new HostAttributeToken('id'), { optional: true }) ??
    injectId('nd-dialog-title');

  constructor() {
    const dialog = inject(ND_DIALOG);
    dialog.titleId.set(this.id);
    inject(DestroyRef).onDestroy(() => dialog.titleId.set(null));
  }
}
