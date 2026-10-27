import {
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import type { NdAlign, NdSide } from '@ndop/primitives/internal';
import {
  ND_TOOLTIP,
  NdTooltip,
  NdTooltipPortal,
} from '@ndop/primitives/tooltip';

export type { NdAlign, NdSide } from '@ndop/primitives/internal';

/**
 * Root of a hover card: a preview of what's behind a link, such as a
 * profile behind a username, for sighted pointer and keyboard users. It
 * composes the Tooltip primitive's root, so it shares its delays (700 ms to
 * open, 300 ms to close), positioning and Escape handling, but its content
 * has no role and nothing refers to it: the link must say everything on its
 * own. Put it on an `ng-container`.
 *
 * @see spec.md in this entry point for the full contract.
 *
 * @example
 * ```html
 * <ng-container ndHoverCard>
 *   <a ndHoverCardTrigger href="/ada">&#64;ada</a>
 *   <ng-template ndHoverCardPortal>
 *     <div ndHoverCardContent>Ada Lovelace, first programmer.</div>
 *   </ng-template>
 * </ng-container>
 * ```
 */
@Directive({
  selector: '[ndHoverCard]',
  exportAs: 'ndHoverCard',
  hostDirectives: [
    {
      directive: NdTooltip,
      inputs: ['open', 'defaultOpen', 'openDelay', 'closeDelay'],
      outputs: ['openChange'],
    },
  ],
})
export class NdHoverCard {}

/**
 * What opens an {@link NdHoverCard}, usually a link: hovering it, or
 * focusing it with the keyboard, opens the card after the open delay;
 * leaving it, or blur, closes it after the close delay.
 *
 * @example
 * ```html
 * <a ndHoverCardTrigger href="/ada">&#64;ada</a>
 * ```
 */
@Directive({
  selector: '[ndHoverCardTrigger]',
  host: {
    '[attr.data-state]': 'card.open() ? "open" : "closed"',
    '(pointerenter)': 'card.scheduleShow()',
    '(pointerleave)': 'card.scheduleHide()',
    '(focus)': 'focus()',
    '(blur)': 'card.scheduleHide()',
  },
})
export class NdHoverCardTrigger {
  protected readonly card = inject(ND_TOOLTIP);
  private readonly element: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    this.card.trigger = this.element;
    inject(DestroyRef).onDestroy(() => {
      this.card.trigger = null;
      this.card.hideNow();
    });
  }

  /** Opens on keyboard focus only; a click's focus is the pointer's. */
  protected focus(): void {
    if (this.element.matches(':focus-visible')) {
      this.card.scheduleShow();
    }
  }
}

/**
 * Marks the `ng-template` an {@link NdHoverCard} renders while open.
 *
 * @example
 * ```html
 * <ng-template ndHoverCardPortal>…</ng-template>
 * ```
 */
@Directive({
  selector: 'ng-template[ndHoverCardPortal]',
  hostDirectives: [NdTooltipPortal],
})
export class NdHoverCardPortal {}

/**
 * The card. It stays open while the pointer is over it, and sits on its
 * trigger's `side`, flipping to fit the viewport; `data-side` and
 * `data-align` say where it ended up.
 *
 * @example
 * ```html
 * <div ndHoverCardContent side="top">…</div>
 * ```
 */
@Directive({
  selector: '[ndHoverCardContent]',
  host: {
    '[attr.data-state]': 'card.open() ? "open" : "closed"',
    '[attr.data-side]': 'card.placement().side',
    '[attr.data-align]': 'card.placement().align',
    '(pointerenter)': 'card.cancelScheduled()',
    '(pointerleave)': 'card.scheduleHide()',
  },
})
export class NdHoverCardContent {
  /** Side of the trigger it sits on, before flipping. */
  readonly side = input<NdSide>('bottom');

  /** Alignment along that side. */
  readonly align = input<NdAlign>('center');

  /** Gap between the trigger and the card, in pixels. */
  readonly sideOffset = input(4, { transform: numberAttribute });

  protected readonly card = inject(ND_TOOLTIP);

  constructor() {
    effect(() =>
      this.card.setPositioning(
        { side: this.side(), align: this.align() },
        this.sideOffset(),
      ),
    );
  }
}
