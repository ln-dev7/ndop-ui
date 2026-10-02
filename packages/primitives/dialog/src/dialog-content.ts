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
 * description. Focus is trapped inside it while open.
 *
 * @example
 * ```html
 * <div ndDialogContent class="fixed left-1/2 top-1/2 -translate-1/2">…</div>
 * ```
 */
@Directive({
  selector: '[ndDialogContent]',
  host: {
    role: 'dialog',
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
