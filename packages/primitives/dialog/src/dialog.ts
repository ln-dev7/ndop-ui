import { FocusTrapFactory, type FocusTrap } from '@angular/cdk/a11y';
import {
  createBlockScrollStrategy,
  createGlobalPositionStrategy,
} from '@angular/cdk/overlay';
import {
  afterNextRender,
  booleanAttribute,
  Directive,
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
  focusReturnTarget,
  injectId,
  injectOverlay,
} from '@ndop/primitives/internal';

/**
 * The enclosing {@link NdDialog}, injected by its parts.
 */
export const ND_DIALOG = new InjectionToken<NdDialog>('ND_DIALOG');

/**
 * Root of a modal dialog (WAI-ARIA Dialog (Modal) pattern). Holds the open
 * state and renders the `ng-template[ndDialogPortal]` content into a CDK
 * overlay while open: page scroll is blocked, focus is trapped in the
 * content and returned on close, and Escape closes. Put it on an
 * `ng-container` so it adds no element.
 *
 * The dialog never renders open on the server; an initial open state takes
 * effect after hydration.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 *
 * @example
 * ```html
 * <ng-container ndDialog [(open)]="open">
 *   <button ndDialogTrigger>Edit profile</button>
 *   <ng-template ndDialogPortal>
 *     <div ndDialogOverlay></div>
 *     <div ndDialogContent>
 *       <h2 ndDialogTitle>Edit profile</h2>
 *       <button ndDialogClose>Close</button>
 *     </div>
 *   </ng-template>
 * </ng-container>
 * ```
 */
@Directive({
  selector: '[ndDialog]',
  exportAs: 'ndDialog',
  providers: [{ provide: ND_DIALOG, useExisting: NdDialog }],
})
export class NdDialog {
  /** Whether the dialog is open. Two-way bindable with `[(open)]`. */
  readonly open = model(false);

  /** Initial open state when `open` is not bound. */
  readonly defaultOpen = input(false, { transform: booleanAttribute });

  /** Whether Escape closes the dialog. */
  readonly closeOnEscape = input(true, { transform: booleanAttribute });

  /** Whether a click on `[ndDialogOverlay]` closes the dialog. */
  readonly closeOnOverlayClick = input(true, { transform: booleanAttribute });

  /** Id of the content element, for the trigger's `aria-controls`. */
  readonly contentId = signal(injectId('nd-dialog-content'));

  /** Id of the title element, when one is rendered. */
  readonly titleId = signal<string | null>(null);

  /** Id of the description element, when one is rendered. */
  readonly descriptionId = signal<string | null>(null);

  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private content: HTMLElement | null = null;
  private trigger: HTMLElement | null = null;
  private focusTrap: FocusTrap | null = null;
  private restoreFocusTo: HTMLElement | null = null;

  private readonly overlay = injectOverlay({
    config: (injector) => ({
      positionStrategy: createGlobalPositionStrategy(injector),
      scrollStrategy: createBlockScrollStrategy(injector),
      hasBackdrop: false,
    }),
    onEscape: (event) => {
      if (this.closeOnEscape()) {
        event.preventDefault();
        this.open.set(false);
      }
    },
  });

  private readonly hydrated = bindOpenState(this.open, this.defaultOpen, {
    show: () => this.show(),
    hide: () => this.hide(),
  });

  /** Flips the open state. */
  toggle(): void {
    this.open.update((open) => !open);
  }

  /**
   * Registers the template rendered while open.
   *
   * @param template - The `ng-template[ndDialogPortal]`.
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
   * Registers the trigger, where focus returns when nothing else had it.
   *
   * @param element - The `[ndDialogTrigger]` element, or `null` on destroy.
   */
  registerTrigger(element: HTMLElement | null): void {
    this.trigger = element;
  }

  /**
   * Registers the content element so focus can be trapped in it.
   *
   * @param element - The `[ndDialogContent]` element, or `null` on destroy.
   */
  registerContent(element: HTMLElement | null): void {
    this.content = element;
  }

  /** Renders the content and moves focus into it. */
  private show(): void {
    this.restoreFocusTo = focusReturnTarget(this.document, this.trigger);
    if (!this.overlay.attach()) {
      return;
    }
    // The content's own children render with the next change detection, so
    // the trap looks for focusable elements once they exist.
    afterNextRender(
      () => {
        if (!this.content || !untracked(this.open)) {
          return;
        }
        this.focusTrap = this.focusTrapFactory.create(this.content);
        if (!this.focusTrap.focusInitialElement()) {
          this.content.focus();
        }
      },
      { injector: this.injector },
    );
  }

  /** Removes the content and restores focus. */
  private hide(): void {
    this.focusTrap?.destroy();
    this.focusTrap = null;
    this.overlay.detach();
    const target = this.restoreFocusTo;
    this.restoreFocusTo = null;
    // Restore after the overlay has detached; restoring earlier lets the
    // focus trap's anchors take focus back while they are being removed.
    afterNextRender(() => target?.focus(), { injector: this.injector });
  }
}
