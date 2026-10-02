import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { ND_POPOVER } from './popover';

/**
 * Button that opens and closes its {@link NdPopover}, and anchors the
 * content. Sets `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`
 * while open, and `data-state`.
 *
 * @example
 * ```html
 * <button ndPopoverTrigger>Filters</button>
 * ```
 */
@Directive({
  selector: '[ndPopoverTrigger]',
  host: {
    'aria-haspopup': 'dialog',
    '[attr.aria-expanded]': 'popover.open()',
    '[attr.aria-controls]': 'popover.open() ? popover.contentId() : null',
    '[attr.data-state]': 'popover.open() ? "open" : "closed"',
    '(click)': 'popover.toggle()',
  },
})
export class NdPopoverTrigger {
  /** The popover this trigger controls. */
  protected readonly popover = inject(ND_POPOVER);

  constructor() {
    this.popover.trigger = inject(ElementRef).nativeElement;
    inject(DestroyRef).onDestroy(() => (this.popover.trigger = null));
  }
}
