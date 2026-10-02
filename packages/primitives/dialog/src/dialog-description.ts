import {
  DestroyRef,
  Directive,
  HostAttributeToken,
  inject,
} from '@angular/core';
import { injectId } from '@ndop/primitives/internal';
import { ND_DIALOG } from './dialog';

/**
 * The dialog's description; its id describes the content
 * (`aria-describedby`). Keeps an id the element already has.
 *
 * @example
 * ```html
 * <p ndDialogDescription>Changes are saved when you close.</p>
 * ```
 */
@Directive({
  selector: '[ndDialogDescription]',
  host: { '[attr.id]': 'id' },
})
export class NdDialogDescription {
  /** The element id. */
  protected readonly id =
    inject(new HostAttributeToken('id'), { optional: true }) ??
    injectId('nd-dialog-description');

  constructor() {
    const dialog = inject(ND_DIALOG);
    dialog.descriptionId.set(this.id);
    inject(DestroyRef).onDestroy(() => dialog.descriptionId.set(null));
  }
}
