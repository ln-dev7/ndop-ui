import {
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  inject,
} from '@angular/core';
import { ND_DIALOG } from './dialog';

/**
 * The dialog box: `role="dialog"`, `aria-modal="true"`, `tabindex="-1"`,
 * and `aria-labelledby` / `aria-describedby` pointing at the title and
 * description. Native modality makes the background page inert while open.
 *
 * @example
 * ```html
 * <dialog ndDialogContent class="fixed left-1/2 top-1/2 -translate-1/2">…</dialog>
 * ```
 */
@Directive({
  selector: 'dialog[ndDialogContent]',
  host: {
    '(cancel)': 'dialog.cancel($event)',
    '(close)': 'dialog.closed()',
    '(pointerdown)': 'dialog.pointerDown($event)',
    '(click)': 'dialog.backdropClick($event)',
    'aria-modal': 'true',
    tabindex: '-1',
    '[attr.id]': 'dialog.contentId()',
    '[attr.aria-labelledby]': 'dialog.titleId()',
    '[attr.aria-describedby]': 'dialog.descriptionId()',
    '[attr.data-state]': 'dialog.open() ? "open" : "closed"',
  },
})
export class NdDialogContent {
  /** The dialog this content belongs to. */
  protected readonly dialog = inject(ND_DIALOG);

  constructor() {
    const ownId = inject(new HostAttributeToken('id'), { optional: true });
    if (ownId) {
      this.dialog.contentId.set(ownId);
    }
    this.dialog.registerContent(inject(ElementRef).nativeElement);
    inject(DestroyRef).onDestroy(() => this.dialog.registerContent(null));
  }
}
