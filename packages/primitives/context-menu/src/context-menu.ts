import {
  NdNativeMenuTrigger,
  NdNativeContextMenuTrigger,
} from '@ndop/primitives/internal';
import {
  afterNextRender,
  booleanAttribute,
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  effect,
  Injector,
  input,
  signal,
  type OnInit,
  type TemplateRef,
} from '@angular/core';
import { ND_MENU_PLACEMENT } from '@ndop/primitives/menu';

/**
 * An area with its own native popover menu: its value
 * is the `ng-template` of the menu. A right click or long press opens the
 * menu at the pointer; Shift + F10 or the context-menu key opens it at the
 * area's corner and focuses its first item. The menu's parts are
 * `@ndop/primitives/menu`'s. Make the area focusable and named, and offer
 * its actions elsewhere too.
 *
 * @see spec.md in this entry point for the full contract.
 *
 * @example
 * ```html
 * <div [ndContextMenuTrigger]="actions" tabindex="0" aria-label="Canvas">…</div>
 * <ng-template #actions>
 *   <div ndMenuContent><button ndMenuItem>Paste</button></div>
 * </ng-template>
 * ```
 */
@Directive({
  selector: '[ndContextMenuTrigger]',
  exportAs: 'ndContextMenuTrigger',
  providers: [
    { provide: ND_MENU_PLACEMENT, useValue: { side: () => 'bottom' } },
  ],
  hostDirectives: [NdNativeContextMenuTrigger],
  host: {
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(keydown)': 'keydown($event)',
  },
})
export class NdContextMenuTrigger implements OnInit {
  /** The `ng-template` of the menu it opens. */
  readonly ndContextMenuTrigger = input<TemplateRef<unknown> | null>(null);

  /** Leaves the browser's own context menu. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly trigger = inject(NdNativeMenuTrigger);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Whether its menu is open. */
  readonly isOpen = signal(false);

  constructor() {
    effect(() => {
      this.trigger.menuTemplateRef = this.ndContextMenuTrigger();
      this.trigger.disabled = this.disabled();
    });
    const document = inject(DOCUMENT);
    const injector = inject(Injector);
    const subscriptions = [
      this.trigger.opened.subscribe(() => this.isOpen.set(true)),
      this.trigger.closed.subscribe(() => {
        this.isOpen.set(false);
        // The CDK doesn't refocus a context menu's area. Focus left inside
        // the closed menu falls to the body; a click elsewhere has already
        // moved it, and keeps it.
        afterNextRender(
          () => {
            const active = document.activeElement;
            if (!active || active === document.body) {
              this.element.focus();
            }
          },
          { injector },
        );
      }),
    ];
    inject(DestroyRef).onDestroy(() =>
      subscriptions.forEach((subscription) => subscription.unsubscribe()),
    );
  }

  ngOnInit(): void {
    // Set before the first render, which the CDK's handlers rely on.
    this.trigger.menuTemplateRef = this.ndContextMenuTrigger();
    this.trigger.disabled = this.disabled();
  }

  /**
   * Opens the menu from the keyboard. Browsers differ on whether Shift +
   * F10 fires `contextmenu`, so the trigger fires it itself, as a keyboard
   * one (button 0), which makes the CDK focus the first item.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    if (
      this.disabled() ||
      !(event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey))
    ) {
      return;
    }
    event.preventDefault();
    const rect = this.element.getBoundingClientRect();
    this.element.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: rect.left,
        clientY: rect.bottom,
      }),
    );
  }
}
