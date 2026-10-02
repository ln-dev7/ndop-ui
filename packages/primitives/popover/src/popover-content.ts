import {
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  HostAttributeToken,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import type { NdAlign, NdSide } from '@ndop/primitives/internal';
import { ND_POPOVER } from './popover';

/**
 * The popover panel: `role="dialog"`, `tabindex="-1"`, with `data-side` and
 * `data-align` reporting where it actually sits. Name it with `aria-label`
 * or `aria-labelledby`. Focus moving outside it, other than to the trigger,
 * closes the popover.
 *
 * @example
 * ```html
 * <div ndPopoverContent side="end" align="start" aria-label="Filters">…</div>
 * ```
 */
@Directive({
  selector: '[ndPopoverContent]',
  host: {
    role: 'dialog',
    tabindex: '-1',
    '[attr.id]': 'popover.contentId()',
    '[attr.data-state]': 'popover.open() ? "open" : "closed"',
    '[attr.data-side]': 'popover.placement().side',
    '[attr.data-align]': 'popover.placement().align',
    '(keydown)': 'popover.handleTab($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class NdPopoverContent {
  /** Preferred side of the trigger; `start` and `end` swap in RTL. */
  readonly side = input<NdSide>('bottom');

  /** Preferred alignment along that side. */
  readonly align = input<NdAlign>('center');

  /** Gap from the trigger, in pixels. */
  readonly sideOffset = input(4, { transform: numberAttribute });

  /** The popover this content belongs to. */
  protected readonly popover = inject(ND_POPOVER);

  private readonly element: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    const ownId = inject(new HostAttributeToken('id'), { optional: true });
    if (ownId) {
      this.popover.contentId.set(ownId);
    }
    this.popover.content = this.element;
    inject(DestroyRef).onDestroy(() => (this.popover.content = null));

    effect(() =>
      this.popover.setPositioning(
        { side: this.side(), align: this.align() },
        this.sideOffset(),
      ),
    );
  }

  /**
   * Closes the popover when focus lands outside it. A null related target
   * (the window losing focus) and the trigger, whose click toggles the
   * popover itself, are ignored.
   *
   * @param event - The focusout event.
   */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (
      next &&
      !this.element.contains(next) &&
      !this.popover.trigger?.contains(next)
    ) {
      this.popover.close(false);
    }
  }
}
