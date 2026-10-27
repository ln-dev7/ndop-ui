import { NdNativeMenuTrigger } from '@ndop/primitives/internal';
import { Directionality } from '@angular/cdk/bidi';
import {
  booleanAttribute,
  DestroyRef,
  Directive,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  type OnInit,
  type TemplateRef,
} from '@angular/core';
import {
  bindOpenState,
  connectedPositions,
  type NdAlign,
  type NdSide,
} from '@ndop/primitives/internal';
import { ND_MENU_PLACEMENT, type NdMenuPlacement } from '@ndop/primitives/menu';

export type { NdAlign, NdSide } from '@ndop/primitives/internal';

/**
 * The button of a menu button (WAI-ARIA Menu Button pattern), composing
 * `CdkMenuTrigger`: its value is the `ng-template` of the menu it opens.
 * Enter, Space and the arrow keys open the menu and focus an item; closing
 * returns focus here. The menu's parts are `@ndop/primitives/menu`'s.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
 *
 * @example
 * ```html
 * <button [ndDropdownMenuTrigger]="actions">Actions</button>
 * <ng-template #actions>
 *   <div ndMenuContent><button ndMenuItem>Edit</button></div>
 * </ng-template>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuTrigger]',
  exportAs: 'ndDropdownMenuTrigger',
  providers: [
    { provide: ND_MENU_PLACEMENT, useExisting: NdDropdownMenuTrigger },
  ],
  hostDirectives: [NdNativeMenuTrigger],
  host: { '[attr.data-state]': 'open() ? "open" : "closed"' },
})
export class NdDropdownMenuTrigger implements NdMenuPlacement, OnInit {
  /** The `ng-template` of the menu it opens. */
  readonly ndDropdownMenuTrigger = input<TemplateRef<unknown> | null>(null);

  /** Whether the menu is open. Two-way bindable with `[(open)]`. */
  readonly open = model(false);

  /** Initial open state when `open` isn't bound, applied after hydration. */
  readonly defaultOpen = input(false, { transform: booleanAttribute });

  /** Side of the trigger the menu opens on, before flipping to fit. */
  readonly side = input<NdSide>('bottom');

  /** Alignment of the menu along that side. */
  readonly align = input<NdAlign>('start');

  /** Gap between the trigger and the menu, in pixels. */
  readonly sideOffset = input(4, { transform: numberAttribute });

  private readonly trigger = inject(NdNativeMenuTrigger);

  constructor() {
    effect(() => (this.trigger.menuTemplateRef = this.ndDropdownMenuTrigger()));
    const directionality = inject(Directionality);
    effect(() => {
      this.trigger.menuPosition = connectedPositions(
        { side: this.side(), align: this.align() },
        this.sideOffset(),
        directionality.value === 'rtl',
      );
      this.trigger.updatePosition();
    });

    const subscriptions = [
      this.trigger.opened.subscribe(() => this.open.set(true)),
      this.trigger.closed.subscribe(() => this.open.set(false)),
    ];
    inject(DestroyRef).onDestroy(() =>
      subscriptions.forEach((subscription) => subscription.unsubscribe()),
    );

    bindOpenState(this.open, this.defaultOpen, {
      show: () => {
        if (!this.trigger.isOpen()) {
          this.trigger.open();
        }
      },
      hide: () => {
        if (this.trigger.isOpen()) {
          this.trigger.close();
        }
      },
    });
  }

  ngOnInit(): void {
    // The CDK's own host bindings, such as aria-haspopup, read the template
    // on the first render, before effects run.
    this.trigger.menuTemplateRef = this.ndDropdownMenuTrigger();
  }
}
