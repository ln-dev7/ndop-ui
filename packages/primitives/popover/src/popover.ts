import { Directionality } from '@angular/cdk/bidi';
import {
  afterNextRender,
  booleanAttribute,
  Directive,
  DestroyRef,
  DOCUMENT,
  inject,
  InjectionToken,
  Injector,
  input,
  model,
  signal,
  untracked,
  type TemplateRef,
  type ViewContainerRef,
} from '@angular/core';
import {
  bindOpenState,
  connectedPositions,
  focusReturnTarget,
  injectFocusFirst,
  injectId,
  injectNativePopover,
  type NdNativePopover,
  injectTabbables,
  placementOf,
  type NdPlacement,
} from '@ndop/primitives/internal';

/**
 * The enclosing {@link NdPopover}, injected by its parts.
 */
export const ND_POPOVER = new InjectionToken<NdPopover>('ND_POPOVER');

/**
 * Root of a popover: non-modal content anchored to a trigger (WAI-ARIA
 * `dialog` role without a focus trap). Renders the
 * `ng-template[ndPopoverPortal]` into a native popover positioned next to the
 * trigger, flipping to the opposite side when it doesn't fit. Escape, an
 * outside click or focus leaving the content closes it. Put it on an
 * `ng-container` so it adds no element.
 *
 * The popover never renders open on the server; an initial open state takes
 * effect after hydration.
 *
 * @see spec.md in this entry point for the full contract.
 *
 * @example
 * ```html
 * <ng-container ndPopover>
 *   <button ndPopoverTrigger>Filters</button>
 *   <ng-template ndPopoverPortal>
 *     <div ndPopoverContent side="bottom" align="start" aria-label="Filters">…</div>
 *   </ng-template>
 * </ng-container>
 * ```
 */
@Directive({
  selector: '[ndPopover]',
  exportAs: 'ndPopover',
  providers: [{ provide: ND_POPOVER, useExisting: NdPopover }],
})
export class NdPopover {
  /** Whether the popover is open. Two-way bindable with `[(open)]`. */
  readonly open = model(false);

  /** Initial open state when `open` is not bound. */
  readonly defaultOpen = input(false, { transform: booleanAttribute });

  /** Id of the content element, for the trigger's `aria-controls`. */
  readonly contentId = signal(injectId('nd-popover-content'));

  /** Where the content actually sits, after any flip. */
  readonly placement = signal<NdPlacement>({ side: 'bottom', align: 'center' });

  /** The trigger element. */
  trigger: HTMLElement | null = null;

  /** The content element, while rendered. */
  content: HTMLElement | null = null;

  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly directionality = inject(Directionality);
  private readonly focusFirst = injectFocusFirst();
  private readonly tabbables = injectTabbables();
  private preferred: NdPlacement = { side: 'bottom', align: 'center' };
  private offset = 4;
  private ref: NdNativePopover | null = null;
  private restoreFocusTo: HTMLElement | null = null;
  private returnFocusOnClose = true;

  private readonly overlay = injectNativePopover({
    anchor: () => this.trigger ?? this.document.body,
    positions: () => this.positions(),
    rtl: () => this.directionality.value === 'rtl',
    onPosition: (position) => this.placement.set(placementOf(position)),
    onDismiss: () =>
      this.close(
        this.document.activeElement === this.document.body ||
          !!this.content?.contains(this.document.activeElement),
      ),
  });

  private readonly hydrated = bindOpenState(this.open, this.defaultOpen, {
    show: () => this.show(),
    hide: () => this.hide(),
  });

  /** Flips the open state. */
  toggle(): void {
    this.returnFocusOnClose = true;
    this.open.update((open) => !open);
  }

  /**
   * Closes the popover.
   *
   * @param returnFocus - Whether focus goes back where it was before
   *   opening (Escape, close button) or stays where the user put it
   *   (outside click, focus leaving).
   */
  close(returnFocus: boolean): void {
    if (this.destroyRef.destroyed) return;
    this.returnFocusOnClose = returnFocus;
    if (!returnFocus) this.overlay.detach();
    this.open.set(false);
  }

  /**
   * Registers the template rendered while open.
   *
   * @param template - The `ng-template[ndPopoverPortal]`.
   * @param viewContainer - Where that template is declared.
   */
  registerPortal(
    template: TemplateRef<unknown>,
    viewContainer: ViewContainerRef,
  ): void {
    this.overlay.setTemplate(template, viewContainer);
    if (untracked(this.open) && untracked(this.hydrated)) {
      this.show();
    }
  }

  /**
   * Sets the preferred side, alignment and offset, from the content's
   * inputs.
   *
   * @param placement - Preferred side and alignment.
   * @param offset - Gap from the trigger, in pixels.
   */
  setPositioning(placement: NdPlacement, offset: number): void {
    this.preferred = placement;
    this.offset = offset;
    this.placement.set(placement);
    // Measure after content inputs and layout have settled.
    afterNextRender(
      () => {
        if (this.ref?.hasAttached()) {
          this.ref.updatePosition();
        }
      },
      { injector: this.injector },
    );
  }

  /**
   * Handles Tab at the content's edges and restores trigger-relative page
   * navigation when closing the native top-layer popover:
   * past the last element focus moves to whatever follows the trigger, and
   * before the first element it returns to the trigger. Either way the
   * popover closes.
   *
   * @param event - The keydown event from the content.
   */
  handleTab(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.content || !this.trigger) {
      return;
    }
    const inside = this.tabbables(this.content);
    const edge = event.shiftKey ? inside[0] : inside.at(-1);
    if (inside.length > 0 && edge !== event.target) {
      return;
    }
    event.preventDefault();
    const target = event.shiftKey ? this.trigger : this.nextAfterTrigger();
    this.close(false);
    target?.focus();
  }

  /**
   * CDK positions for the preferred placement.
   *
   * @returns Preferred position, then its fallback.
   */
  private positions() {
    return connectedPositions(
      this.preferred,
      this.offset,
      this.directionality.value === 'rtl',
    );
  }

  /**
   * Finds where Tab goes after leaving the content.
   *
   * @returns The first tabbable element after the trigger, outside the
   *   content, or `null`.
   */
  private nextAfterTrigger(): HTMLElement | null {
    const trigger = this.trigger;
    if (!trigger) {
      return null;
    }
    return (
      this.tabbables(this.document.body).find(
        (element) =>
          !trigger.contains(element) &&
          !this.content?.contains(element) &&
          trigger.compareDocumentPosition(element) &
            Node.DOCUMENT_POSITION_FOLLOWING,
      ) ?? null
    );
  }

  /** Renders the content and moves focus into it. */
  private show(): void {
    this.restoreFocusTo = focusReturnTarget(this.document, this.trigger);
    const ref = this.overlay.attach();
    if (!ref) {
      return;
    }
    this.ref = ref;
    afterNextRender(
      () => {
        if (this.content && untracked(this.open)) {
          this.focusFirst(this.content);
        }
      },
      { injector: this.injector },
    );
  }

  /** Hides native content and, unless dismissed elsewhere, restores focus. */
  private hide(): void {
    this.overlay.detach();
    const target = this.returnFocusOnClose ? this.restoreFocusTo : null;
    this.restoreFocusTo = null;
    this.returnFocusOnClose = true;
    afterNextRender(() => target?.focus(), { injector: this.injector });
  }
}
