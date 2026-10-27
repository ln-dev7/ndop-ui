import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { ND_TOOLTIP } from './tooltip';

/**
 * The element the tooltip describes. Hovering it opens the tooltip after the
 * open delay, keyboard focus opens it at once, and leaving or blurring it
 * closes it. While open, the content's id is added to its
 * `aria-describedby`, keeping ids already there.
 *
 * @example
 * ```html
 * <button ndTooltipTrigger aria-label="Delete">…</button>
 * ```
 */
@Directive({
  selector: '[ndTooltipTrigger]',
  host: {
    '[attr.data-state]': 'tooltip.open() ? "open" : "closed"',
    '(pointerenter)': 'tooltip.scheduleShow()',
    '(pointerleave)': 'tooltip.scheduleHide()',
    '(focus)': 'onFocus()',
    '(blur)': 'tooltip.hideNow()',
  },
})
export class NdTooltipTrigger {
  /** The tooltip this trigger shows. */
  protected readonly tooltip = inject(ND_TOOLTIP);

  private readonly element: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    this.tooltip.trigger = this.element;
    inject(DestroyRef).onDestroy(() => {
      this.tooltip.trigger = null;
      this.tooltip.hideNow();
    });
  }

  /**
   * Opens at once for keyboard focus. Focus from a pointer is left to the
   * hover delay, so clicking a button doesn't flash its tooltip.
   */
  protected onFocus(): void {
    if (this.element.matches(':focus-visible')) {
      this.tooltip.showNow();
    }
  }
}
