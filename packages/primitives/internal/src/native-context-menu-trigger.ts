import { DestroyRef, Directive, DOCUMENT, inject } from '@angular/core';
import { NdNativeMenuTrigger } from './native-menu-trigger';

/**
 * Context-only pointer release and touch handling for native menus. Keeping it
 * separate lets primary and submenu triggers omit long-press/event machinery.
 */
@Directive({
  selector: '[ndNativeContextMenuTrigger]',
  hostDirectives: [NdNativeMenuTrigger],
  host: {
    '(contextmenu)': 'contextMenu($event)',
    '(pointerdown)': 'press($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'cancelPress()',
    '(pointercancel)': 'cancelPress()',
  },
})
export class NdNativeContextMenuTrigger {
  private readonly trigger = inject(NdNativeMenuTrigger);
  private readonly document = inject(DOCUMENT);
  private pointerHeld = false;
  private pendingReleaseCleanup: (() => void) | undefined;
  private pressTimer: ReturnType<typeof setTimeout> | undefined;
  private pressOrigin: { x: number; y: number } | undefined;

  constructor() {
    this.trigger.contextMode = true;
    inject(DestroyRef).onDestroy(() => this.cancelPress());
  }

  /**
   * Opens a native context menu at viewport coordinates.
   *
   * @param event - The contextmenu event.
   */
  protected contextMenu(event: MouseEvent): void {
    if (this.trigger.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const held =
      (event.button !== 0 || !!this.pressOrigin) &&
      (event.buttons !== 0 || this.pointerHeld);
    const point = { x: event.clientX, y: event.clientY };
    this.cancelPress();
    const show = () => {
      this.pendingReleaseCleanup?.();
      this.trigger.openAt(point, event.button === 0 ? 'keyboard' : 'mouse');
    };
    if (!held) {
      show();
      return;
    }
    // Native light dismiss runs before pointerup dispatch. Opening after that
    // step prevents the initiating right-button release from dismissing us.
    const cancel = () => this.cancelPress();
    const escape = (key: KeyboardEvent) => {
      if (key.key === 'Escape') cancel();
    };
    this.document.addEventListener('pointerup', show, {
      once: true,
      capture: true,
    });
    this.document.addEventListener('pointercancel', cancel, {
      once: true,
      capture: true,
    });
    this.document.addEventListener('keydown', escape, true);
    this.document.defaultView?.addEventListener('blur', cancel);
    this.pendingReleaseCleanup = () => {
      this.document.removeEventListener('pointerup', show, true);
      this.document.removeEventListener('pointercancel', cancel, true);
      this.document.removeEventListener('keydown', escape, true);
      this.document.defaultView?.removeEventListener('blur', cancel);
      this.pendingReleaseCleanup = undefined;
    };
  }

  /**
   * Starts the context-menu long-press timer for touch input.
   *
   * @param event - The pointerdown event.
   */
  protected press(event: PointerEvent): void {
    if (this.trigger.disabled) return;
    this.pointerHeld = event.buttons !== 0;
    if (event.pointerType !== 'touch') return;
    this.pressOrigin = { x: event.clientX, y: event.clientY };
    this.pressTimer = setTimeout(() => {
      this.contextMenu(
        new MouseEvent('contextmenu', {
          clientX: event.clientX,
          clientY: event.clientY,
          button: 2,
          buttons: 1,
        }),
      );
    }, 500);
  }

  /**
   * Cancels a long press when the user starts scrolling or dragging.
   *
   * @param event - The pointermove event.
   */
  protected move(event: PointerEvent): void {
    if (
      this.pressOrigin &&
      Math.hypot(
        event.clientX - this.pressOrigin.x,
        event.clientY - this.pressOrigin.y,
      ) > 8
    )
      this.cancelPress();
  }

  /** Cancels pending long-press work. */
  protected cancelPress(): void {
    clearTimeout(this.pressTimer);
    this.pressOrigin = undefined;
    this.pointerHeld = false;
    this.pendingReleaseCleanup?.();
  }
}
