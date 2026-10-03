import { addAriaReferencedId, removeAriaReferencedId } from '@angular/cdk/a11y';
import {
  DestroyRef,
  Directive,
  effect,
  HostAttributeToken,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import type { NdAlign, NdSide } from '@ndop/primitives/internal';
import { ND_TOOLTIP } from './tooltip';

/**
 * The tooltip panel: `role="tooltip"`, never focusable, with `data-side` and
 * `data-align` reporting where it actually sits. While it is rendered, its id
 * is in the trigger's `aria-describedby`. Hovering it keeps the tooltip open.
 *
 * @example
 * ```html
 * <div ndTooltipContent>Delete permanently</div>
 * ```
 */
@Directive({
  selector: '[ndTooltipContent]',
  host: {
    role: 'tooltip',
    '[attr.id]': 'tooltip.contentId()',
    '[attr.data-state]': 'tooltip.open() ? "open" : "closed"',
    '[attr.data-side]': 'tooltip.placement().side',
    '[attr.data-align]': 'tooltip.placement().align',
    '(pointerenter)': 'tooltip.cancelScheduled()',
    '(pointerleave)': 'tooltip.scheduleHide()',
  },
})
export class NdTooltipContent {
  /**
   * Preferred side of the trigger; `start` and `end` swap in RTL. Defaults
   * to `top`, as in Radix and shadcn.
   */
  readonly side = input<NdSide>('top');

  /** Preferred alignment along that side. */
  readonly align = input<NdAlign>('center');

  /** Gap from the trigger, in pixels. */
  readonly sideOffset = input(4, { transform: numberAttribute });

  /** The tooltip this content belongs to. */
  protected readonly tooltip = inject(ND_TOOLTIP);

  constructor() {
    const ownId = inject(new HostAttributeToken('id'), { optional: true });
    if (ownId) {
      this.tooltip.contentId.set(ownId);
    }

    const trigger = this.tooltip.trigger;
    const id = this.tooltip.contentId();
    if (trigger) {
      addAriaReferencedId(trigger, 'aria-describedby', id);
      inject(DestroyRef).onDestroy(() =>
        removeAriaReferencedId(trigger, 'aria-describedby', id),
      );
    }

    effect(() =>
      this.tooltip.setPositioning(
        { side: this.side(), align: this.align() },
        this.sideOffset(),
      ),
    );
  }
}
