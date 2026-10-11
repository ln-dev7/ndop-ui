import { Directionality } from '@angular/cdk/bidi';
import { CdkMenuBar, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import {
  DestroyRef,
  Directive,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
  type OnInit,
  type TemplateRef,
} from '@angular/core';
import {
  connectedPositions,
  type NdAlign,
  type NdSide,
} from '@ndop/primitives/internal';
import { ND_MENU_PLACEMENT, type NdMenuPlacement } from '@ndop/primitives/menu';

export type { NdAlign, NdSide } from '@ndop/primitives/internal';

/**
 * A menubar: the WAI-ARIA Menubar pattern, a horizontal bar of menus such
 * as a desktop app's File and Edit menus, composing the CDK's `CdkMenuBar`
 * (ADR-0004, amendment 3). It is one tab stop; the arrow keys move between
 * its triggers. Name it with `aria-label` or `aria-labelledby`.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
 *
 * @example
 * ```html
 * <div ndMenubar aria-label="Editor">
 *   <div [ndMenubarTrigger]="file">File</div>
 * </div>
 * <ng-template #file>
 *   <div ndMenuContent><div ndMenuItem>New tab</div></div>
 * </ng-template>
 * ```
 */
@Directive({
  selector: '[ndMenubar]',
  exportAs: 'ndMenubar',
  hostDirectives: [CdkMenuBar],
})
export class NdMenubar {}

/**
 * One menu of a {@link NdMenubar}: a `role="menuitem"` that opens the menu
 * in the `ng-template` it's given, composing `CdkMenuItem` and
 * `CdkMenuTrigger`. The menu's parts are `@ndop/primitives/menu`'s. Use a
 * `div`: on a `button`, browsers turn Space into a click, which would close
 * the menu it just opened.
 *
 * @example
 * ```html
 * <div [ndMenubarTrigger]="file">File</div>
 * ```
 */
@Directive({
  selector: '[ndMenubarTrigger]',
  exportAs: 'ndMenubarTrigger',
  providers: [{ provide: ND_MENU_PLACEMENT, useExisting: NdMenubarTrigger }],
  hostDirectives: [CdkMenuItem, CdkMenuTrigger],
  host: { '[attr.data-state]': 'isOpen() ? "open" : "closed"' },
})
export class NdMenubarTrigger implements NdMenuPlacement, OnInit {
  /** The `ng-template` of the menu it opens. */
  readonly ndMenubarTrigger = input<TemplateRef<unknown> | null>(null);

  /** Side of the trigger the menu opens on, before flipping to fit. */
  readonly side = input<NdSide>('bottom');

  /** Alignment of the menu along that side. */
  readonly align = input<NdAlign>('start');

  /** Gap between the trigger and the menu, in pixels. */
  readonly sideOffset = input(8, { transform: numberAttribute });

  /** Whether its menu is open. */
  readonly isOpen = signal(false);

  private readonly trigger = inject(CdkMenuTrigger);

  constructor() {
    effect(() => (this.trigger.menuTemplateRef = this.ndMenubarTrigger()));
    const directionality = inject(Directionality);
    effect(() => {
      this.trigger.menuPosition = connectedPositions(
        { side: this.side(), align: this.align() },
        this.sideOffset(),
        directionality.value === 'rtl',
      );
    });
    const subscriptions = [
      this.trigger.opened.subscribe(() => this.isOpen.set(true)),
      this.trigger.closed.subscribe(() => this.isOpen.set(false)),
    ];
    inject(DestroyRef).onDestroy(() =>
      subscriptions.forEach((subscription) => subscription.unsubscribe()),
    );
  }

  ngOnInit(): void {
    // The CDK's own host bindings, such as aria-haspopup, read the template
    // on the first render, before effects run.
    this.trigger.menuTemplateRef = this.ndMenubarTrigger();
  }
}
