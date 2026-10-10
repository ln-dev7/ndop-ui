import { Directive, ElementRef, inject, input, signal } from '@angular/core';
import {
  ND_DIALOG,
  NdDialog,
  NdDialogClose,
  NdDialogContent,
  NdDialogDescription,
  NdDialogOverlay,
  NdDialogPortal,
  NdDialogTitle,
  NdDialogTrigger,
} from '@ndop/primitives/dialog';
import { isRtl } from '@ndop/primitives/internal';

/** The edge a drawer slides in from. `start` and `end` are logical. */
export type NdDrawerDirection = 'top' | 'bottom' | 'start' | 'end';

/** Elements a drag never starts on, so they keep their own pointer use. */
const NO_DRAG = 'input, textarea, select, [contenteditable], [data-no-drag]';

/** How far past which a released drag closes, as a share of the size. */
const CLOSE_RATIO = 0.25;

/** How fast a flick toward the edge closes, in pixels per millisecond. */
const CLOSE_VELOCITY = 0.5;

/** How far the pointer moves before a press becomes a drag, in pixels. */
const DRAG_THRESHOLD = 4;

/**
 * Root of a drawer: a modal dialog (the Dialog primitive) that slides in
 * from an edge, set by its content's `direction`, and can be dragged back
 * out. `open`, `defaultOpen`, `closeOnEscape` and `closeOnOverlayClick`
 * are Dialog's. Put it on an `ng-container`.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 *
 * @example
 * ```html
 * <ng-container ndDrawer [(open)]="open">
 *   <button ndDrawerTrigger>Open</button>
 *   <ng-template ndDrawerPortal>
 *     <div ndDrawerOverlay></div>
 *     <div ndDrawerContent>
 *       <div ndDrawerHandle></div>
 *       <h2 ndDrawerTitle>Move goal</h2>
 *       <button ndDrawerClose>Done</button>
 *     </div>
 *   </ng-template>
 * </ng-container>
 * ```
 */
@Directive({
  selector: '[ndDrawer]',
  exportAs: 'ndDrawer',
  hostDirectives: [
    {
      directive: NdDialog,
      inputs: ['open', 'defaultOpen', 'closeOnEscape', 'closeOnOverlayClick'],
      outputs: ['openChange'],
    },
  ],
})
export class NdDrawer {}

/**
 * The button that opens an {@link NdDrawer}.
 *
 * @example
 * ```html
 * <button ndDrawerTrigger>Open</button>
 * ```
 */
@Directive({
  selector: '[ndDrawerTrigger]',
  hostDirectives: [NdDialogTrigger],
})
export class NdDrawerTrigger {}

/**
 * Marks the `ng-template` an {@link NdDrawer} renders while open.
 *
 * @example
 * ```html
 * <ng-template ndDrawerPortal>…</ng-template>
 * ```
 */
@Directive({
  selector: 'ng-template[ndDrawerPortal]',
  hostDirectives: [NdDialogPortal],
})
export class NdDrawerPortal {}

/**
 * The backdrop behind an {@link NdDrawer}; clicking it closes the drawer
 * unless `closeOnOverlayClick` is `false`.
 *
 * @example
 * ```html
 * <div ndDrawerOverlay></div>
 * ```
 */
@Directive({
  selector: '[ndDrawerOverlay]',
  hostDirectives: [NdDialogOverlay],
})
export class NdDrawerOverlay {}

/**
 * The drawer panel: Dialog's content (`role="dialog"`, modal, labelled and
 * described) that can be dragged toward its edge to close. While dragged
 * it has `data-dragging` and the distance in `--nd-drawer-drag`, for the
 * styled layer to move it; the primitive sets no other style.
 *
 * @example
 * ```html
 * <div ndDrawerContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndDrawerContent]',
  hostDirectives: [NdDialogContent],
  host: {
    '[attr.data-direction]': 'direction()',
    '[attr.data-dragging]': 'dragging() ? "" : null',
    '[style.--nd-drawer-drag]': 'offset() + "px"',
    '(pointerdown)': 'start($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'end($event)',
    '(pointercancel)': 'cancel($event)',
  },
})
export class NdDrawerContent {
  /** The edge it slides in from and is dragged back to. */
  readonly direction = input<NdDrawerDirection>('bottom');

  private readonly dialog = inject(ND_DIALOG);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Whether a drag is under way. */
  readonly dragging = signal(false);

  /** How far it's dragged toward its edge, in pixels, never negative. */
  readonly offset = signal(0);

  private origin: number | null = null;
  private startedAt = 0;

  /**
   * Notes where a press starts, outside form fields and editable text. It
   * becomes a drag once the pointer moves: capturing the pointer right away
   * would retarget the click of a button pressed inside the drawer.
   *
   * @param event - The pointerdown event.
   */
  protected start(event: PointerEvent): void {
    const target = event.target as Element | null;
    if (event.button !== 0 || target?.closest(NO_DRAG)) {
      return;
    }
    this.origin = this.position(event);
    this.startedAt = event.timeStamp;
  }

  /**
   * Follows the pointer toward the edge.
   *
   * @param event - The pointermove event.
   */
  protected move(event: PointerEvent): void {
    if (this.origin === null) {
      return;
    }
    const delta = this.position(event) - this.origin;
    if (!this.dragging()) {
      if (Math.abs(delta) < DRAG_THRESHOLD) {
        return;
      }
      this.dragging.set(true);
      this.element.setPointerCapture?.(event.pointerId);
    }
    this.offset.set(Math.max(0, delta));
  }

  /**
   * Closes the drawer past a quarter of its size or after a quick flick,
   * and otherwise returns it.
   *
   * @param event - The pointerup event.
   */
  protected end(event: PointerEvent): void {
    if (!this.dragging()) {
      this.origin = null;
      return;
    }
    const offset = this.offset();
    const rect = this.element.getBoundingClientRect();
    const vertical =
      this.direction() === 'top' || this.direction() === 'bottom';
    const size = vertical ? rect.height : rect.width;
    const elapsed = Math.max(1, event.timeStamp - this.startedAt);
    this.cancel(event);
    if (offset > size * CLOSE_RATIO || offset / elapsed > CLOSE_VELOCITY) {
      this.dialog.open.set(false);
    }
  }

  /**
   * Ends a drag without closing.
   *
   * @param event - The pointerup or pointercancel event.
   */
  protected cancel(event: PointerEvent): void {
    this.origin = null;
    this.dragging.set(false);
    this.offset.set(0);
    if (this.element.hasPointerCapture?.(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId);
    }
  }

  /**
   * The pointer's coordinate along the drawer's axis, growing toward its
   * edge.
   *
   * @param event - A pointer event.
   * @returns The coordinate, in pixels.
   */
  private position(event: PointerEvent): number {
    switch (this.direction()) {
      case 'bottom':
        return event.clientY;
      case 'top':
        return -event.clientY;
      case 'end':
        return isRtl(this.element) ? -event.clientX : event.clientX;
      case 'start':
        return isRtl(this.element) ? event.clientX : -event.clientX;
    }
  }
}

/**
 * A decorative grip that shows the drawer can be dragged, hidden from
 * assistive technology.
 *
 * @example
 * ```html
 * <div ndDrawerHandle></div>
 * ```
 */
@Directive({
  selector: '[ndDrawerHandle]',
  host: { 'aria-hidden': 'true' },
})
export class NdDrawerHandle {}

/**
 * The title of an {@link NdDrawer}, which labels it.
 *
 * @example
 * ```html
 * <h2 ndDrawerTitle>Move goal</h2>
 * ```
 */
@Directive({
  selector: '[ndDrawerTitle]',
  hostDirectives: [NdDialogTitle],
})
export class NdDrawerTitle {}

/**
 * The description of an {@link NdDrawer}.
 *
 * @example
 * ```html
 * <p ndDrawerDescription>Set your daily activity goal.</p>
 * ```
 */
@Directive({
  selector: '[ndDrawerDescription]',
  hostDirectives: [NdDialogDescription],
})
export class NdDrawerDescription {}

/**
 * A button that closes its {@link NdDrawer}.
 *
 * @example
 * ```html
 * <button ndDrawerClose>Done</button>
 * ```
 */
@Directive({
  selector: '[ndDrawerClose]',
  hostDirectives: [NdDialogClose],
})
export class NdDrawerClose {}
