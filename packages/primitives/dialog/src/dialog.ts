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
  DestroyRef,
  type EmbeddedViewRef,
  type TemplateRef,
  type ViewContainerRef,
} from '@angular/core';
import {
  bindOpenState,
  focusReturnTarget,
  injectId,
  injectModalScrollLock,
} from '@ndop/primitives/internal';

/**
 * The enclosing {@link NdDialog}, injected by its parts.
 */
export const ND_DIALOG = new InjectionToken<NdDialog>('ND_DIALOG');

/**
 * Root of a modal dialog (WAI-ARIA Dialog (Modal) pattern). Holds the open
 * state and opens its native `<dialog ndDialogContent>` with `showModal()`.
 * The browser makes the rest of the page inert, handles focus and Escape,
 * and returns focus on close. Put it on an
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
 *
 *     <dialog ndDialogContent>
 *       <h2 ndDialogTitle>Edit profile</h2>
 *       <button ndDialogClose>Close</button>
 *     </dialog>
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
  private readonly scrollLock = injectModalScrollLock();
  private content: HTMLDialogElement | null = null;
  private trigger: HTMLElement | null = null;
  private view: EmbeddedViewRef<unknown> | null = null;
  private template: TemplateRef<unknown> | null = null;
  private viewContainer: ViewContainerRef | null = null;
  private pointerStartedInside = false;
  private openedFromTrigger = false;
  private focusBeforeOpen: Element | null = null;
  private restoreFocusTo: HTMLElement | null = null;

  private readonly hydrated = bindOpenState(this.open, this.defaultOpen, {
    show: () => this.show(),
    hide: () => this.hide(),
  });

  /** Flips the open state. */
  toggle(): void {
    this.openedFromTrigger = !this.open();
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
    this.template = template;
    this.viewContainer = viewContainer;
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
   * Registers the native content element for browser modality and focus.
   *
   * @param element - The `[ndDialogContent]` element, or `null` on destroy.
   */
  registerContent(element: HTMLElement | null): void {
    this.content = element as HTMLDialogElement | null;
    if (element && untracked(this.open) && untracked(this.hydrated)) {
      afterNextRender(() => this.show(), { injector: this.injector });
    }
  }

  /**
   * Synchronizes native Escape cancellation with the open model.
   *
   * @param event - The browser cancel event.
   */
  cancel(event: Event): void {
    event.preventDefault();
    if (this.closeOnEscape()) {
      this.open.set(false);
    }
  }

  /** Synchronizes browser closes, including forms using `method="dialog"`. */
  closed(): void {
    if (!this.content?.open) {
      this.open.set(false);
    }
  }

  /**
   * Records whether a pointer interaction started inside the panel.
   *
   * @param event - The pointerdown event from the dialog.
   */
  pointerDown(event: PointerEvent): void {
    const rect = this.content?.getBoundingClientRect();
    this.pointerStartedInside =
      !!rect &&
      (event.target !== this.content ||
        (event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom));
  }

  /**
   * Dismisses a click on the native backdrop, outside the panel bounds.
   *
   * @param event - The click event from the dialog.
   */
  backdropClick(event: MouseEvent): void {
    const startedInside = this.pointerStartedInside;
    this.pointerStartedInside = false;
    const content = this.content;
    if (
      startedInside ||
      !content ||
      event.target !== content ||
      !this.closeOnOverlayClick()
    ) {
      return;
    }
    const rect = content.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      this.open.set(false);
    }
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (untracked(this.hydrated)) {
        this.content?.close();
      }
      this.view?.destroy();
    });
  }

  /** Opens in the browser's modal top layer, after the view has rendered. */
  private show(): void {
    if (!this.view && this.template && this.viewContainer) {
      this.view = this.viewContainer.createEmbeddedView(this.template);
      this.view.detectChanges();
    }
    const content = this.content;
    if (!content || content.open || !untracked(this.open)) {
      return;
    }
    this.focusBeforeOpen = this.document.activeElement;
    this.restoreFocusTo = this.openedFromTrigger
      ? this.trigger
      : focusReturnTarget(this.document, this.trigger);
    this.openedFromTrigger = false;
    this.scrollLock.acquire();
    content.showModal();
    if (!content.contains(this.document.activeElement)) {
      content.focus();
    }
  }

  /** Closes the native dialog and restores focus if the browser did not. */
  private hide(): void {
    this.content?.close();
    this.scrollLock.release();
    const target = this.restoreFocusTo;
    const previous = this.focusBeforeOpen;
    this.restoreFocusTo = null;
    this.focusBeforeOpen = null;
    afterNextRender(
      () => {
        if (
          target?.isConnected &&
          (this.document.activeElement === this.document.body ||
            this.document.activeElement === previous ||
            !!this.content?.contains(this.document.activeElement))
        ) {
          target.focus({ preventScroll: true });
        }
      },
      { injector: this.injector },
    );
  }
}
