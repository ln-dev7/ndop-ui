import { Directionality } from '@angular/cdk/bidi';
import {
  createCloseScrollStrategy,
  createFlexibleConnectedPositionStrategy,
  type FlexibleConnectedPositionStrategy,
  type OverlayRef,
} from '@angular/cdk/overlay';
import {
  afterNextRender,
  booleanAttribute,
  DestroyRef,
  Directive,
  DOCUMENT,
  inject,
  InjectionToken,
  Injector,
  input,
  model,
  numberAttribute,
  signal,
  untracked,
  type TemplateRef,
  type ViewContainerRef,
} from '@angular/core';
import {
  bindOpenState,
  connectedPositions,
  injectId,
  injectOverlay,
  placementOf,
  type NdPlacement,
} from '@ndop/primitives/internal';

/**
 * The enclosing {@link NdTooltip}, injected by its parts.
 */
export const ND_TOOLTIP = new InjectionToken<NdTooltip>('ND_TOOLTIP');

/**
 * Root of a tooltip (WAI-ARIA Tooltip pattern): a short description shown
 * next to its trigger. Opens when the pointer rests on the trigger (after
 * `openDelay`) or when the trigger gets keyboard focus (at once); closes when
 * the pointer leaves trigger and content (after `closeDelay`), on blur and on
 * Escape. The content can be hovered, as WCAG 1.4.13 requires, and never
 * takes focus. Put it on an `ng-container` so it adds no element.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
 *
 * @example
 * ```html
 * <ng-container ndTooltip>
 *   <button ndTooltipTrigger aria-label="Delete">…</button>
 *   <ng-template ndTooltipPortal>
 *     <div ndTooltipContent side="top">Delete permanently</div>
 *   </ng-template>
 * </ng-container>
 * ```
 */
@Directive({
  selector: '[ndTooltip]',
  exportAs: 'ndTooltip',
  providers: [{ provide: ND_TOOLTIP, useExisting: NdTooltip }],
})
export class NdTooltip {
  /** Whether the tooltip is open. Two-way bindable with `[(open)]`. */
  readonly open = model(false);

  /** Initial open state when `open` is not bound. */
  readonly defaultOpen = input(false, { transform: booleanAttribute });

  /** Delay before opening on hover, in milliseconds. */
  readonly openDelay = input(700, { transform: numberAttribute });

  /** Delay before closing once the pointer has left, in milliseconds. */
  readonly closeDelay = input(300, { transform: numberAttribute });

  /** Id of the content element, referenced by the trigger's `aria-describedby`. */
  readonly contentId = signal(injectId('nd-tooltip-content'));

  /** Where the content actually sits, after any flip. */
  readonly placement = signal<NdPlacement>({ side: 'top', align: 'center' });

  /** The trigger element. */
  trigger: HTMLElement | null = null;

  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly directionality = inject(Directionality);
  private preferred: NdPlacement = { side: 'bottom', align: 'center' };
  private offset = 4;
  private strategy: FlexibleConnectedPositionStrategy | null = null;
  private ref: OverlayRef | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  private readonly overlay = injectOverlay({
    config: (injector) => {
      const strategy = createFlexibleConnectedPositionStrategy(
        injector,
        this.trigger ?? this.document.body,
      )
        .withPositions(this.positions())
        .withFlexibleDimensions(false)
        .withPush(false);
      strategy.positionChanges.subscribe((change) =>
        this.placement.set(placementOf(change.connectionPair)),
      );
      this.strategy = strategy;
      return {
        positionStrategy: strategy,
        scrollStrategy: createCloseScrollStrategy(injector),
        direction: this.directionality,
      };
    },
    onEscape: () => this.hideNow(),
  });

  private readonly hydrated = bindOpenState(this.open, this.defaultOpen, {
    show: () => (this.ref = this.overlay.attach()),
    hide: () => this.overlay.detach(),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  /** Opens after `openDelay`, unless something else changes the state first. */
  scheduleShow(): void {
    this.schedule(true, this.openDelay());
  }

  /** Closes after `closeDelay`, unless the pointer comes back first. */
  scheduleHide(): void {
    this.schedule(false, this.closeDelay());
  }

  /** Opens immediately. */
  showNow(): void {
    clearTimeout(this.timer);
    this.open.set(true);
  }

  /** Closes immediately. */
  hideNow(): void {
    clearTimeout(this.timer);
    this.open.set(false);
  }

  /** Keeps the tooltip open while the pointer is over it. */
  cancelScheduled(): void {
    clearTimeout(this.timer);
  }

  /**
   * Registers the template rendered while open.
   *
   * @param template - The `ng-template[ndTooltipPortal]`.
   * @param viewContainer - Where that template is declared.
   */
  registerPortal(
    template: TemplateRef<unknown>,
    viewContainer: ViewContainerRef,
  ): void {
    this.overlay.setTemplate(template, viewContainer);
    if (untracked(this.open) && untracked(this.hydrated)) {
      this.ref = this.overlay.attach();
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
    this.strategy?.withPositions(this.positions());
    // The content's inputs arrive while the CDK is still attaching the
    // portal; reposition once rendering is done.
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
   * Sets the open state after a delay, replacing any pending change.
   *
   * @param open - The state to set.
   * @param delay - Delay in milliseconds.
   */
  private schedule(open: boolean, delay: number): void {
    clearTimeout(this.timer);
    if (untracked(this.open) === open) {
      return;
    }
    this.timer = setTimeout(() => this.open.set(open), delay);
  }
}
