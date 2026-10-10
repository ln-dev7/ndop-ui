import { createGlobalPositionStrategy } from '@angular/cdk/overlay';
import { Platform } from '@angular/cdk/platform';
import {
  afterNextRender,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  HostAttributeToken,
  inject,
  Injectable,
  InjectionToken,
  input,
  signal,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { injectOverlay, isRtl } from '@ndop/primitives/internal';

/** What a toast is about, for its icon and colors. */
export type NdToastType =
  | 'default'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'loading';

/** A button in a toast that does something, such as "Undo". */
export interface NdToastActionOptions {
  /** The button's text. */
  readonly label: string;
  /** Runs when it's pressed, before the toast is dismissed. */
  onClick(): void;
}

/** What {@link NdToaster.show} takes. */
export interface NdToastOptions {
  /** The message. */
  readonly title: string;
  /** More detail, under the title. */
  readonly description?: string;
  /** What it's about. Default `default`. */
  readonly type?: NdToastType;
  /** A button that does something. */
  readonly action?: NdToastActionOptions;
  /**
   * How long it stays, in milliseconds. Default `4000`; `Infinity` keeps it
   * until it's dismissed.
   */
  readonly duration?: number;
  /** Replaces the toast with this id, such as a loading one, if shown. */
  readonly id?: string;
}

/** A toast being shown. */
export interface NdToastRecord {
  /** Its id, for {@link NdToaster.dismiss}. */
  readonly id: string;
  /** The message. */
  readonly title: string;
  /** More detail, if any. */
  readonly description?: string;
  /** What it's about. */
  readonly type: NdToastType;
  /** Its button, if any. */
  readonly action?: NdToastActionOptions;
  /** How long it stays, in milliseconds. */
  readonly duration: number;
}

/** A running toast timer. */
interface Timer {
  remaining: number;
  startedAt: number;
  handle?: ReturnType<typeof setTimeout>;
}

/**
 * Holds the toasts: `show()` adds one and `dismiss()` removes them, each
 * after its `duration` unless dismissed sooner. Timers pause while the
 * pointer is over the toast region or focus is inside it. Toasts exist in
 * the browser only; on the server `show()` does nothing.
 *
 * @see spec.md in this entry point for the full contract.
 *
 * @example
 * ```ts
 * inject(NdToaster).show({ title: 'Event created', type: 'success' });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class NdToaster {
  private readonly browser = inject(Platform).isBrowser;
  private readonly records = signal<readonly NdToastRecord[]>([]);
  private readonly timers = new Map<string, Timer>();
  private paused = false;
  private counter = 0;

  /** The toasts being shown, newest first. */
  readonly toasts = this.records.asReadonly();

  /**
   * Shows a toast, or replaces the one with the same `id`.
   *
   * @param options - What it says and how long it stays.
   * @returns Its id.
   */
  show(options: NdToastOptions): string {
    const id = options.id ?? `nd-toast-${this.counter++}`;
    if (!this.browser) {
      return id;
    }
    const record: NdToastRecord = {
      id,
      title: options.title,
      description: options.description,
      type: options.type ?? 'default',
      action: options.action,
      duration: options.duration ?? 4000,
    };
    this.clearTimer(id);
    this.records.update((toasts) => [
      record,
      ...toasts.filter((toast) => toast.id !== id),
    ]);
    if (Number.isFinite(record.duration)) {
      this.timers.set(id, { remaining: record.duration, startedAt: 0 });
      if (!this.paused) {
        this.start(id);
      }
    }
    return id;
  }

  /**
   * Removes a toast, or every toast without an id.
   *
   * @param id - The toast's id.
   */
  dismiss(id?: string): void {
    if (id === undefined) {
      [...this.timers.keys()].forEach((key) => this.clearTimer(key));
      this.records.set([]);
      return;
    }
    this.clearTimer(id);
    this.records.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  /** Stops every timer, keeping what's left of each. */
  pause(): void {
    if (this.paused) {
      return;
    }
    this.paused = true;
    const now = Date.now();
    for (const timer of this.timers.values()) {
      clearTimeout(timer.handle);
      timer.remaining -= now - timer.startedAt;
    }
  }

  /** Restarts every timer with what's left of it. */
  resume(): void {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    [...this.timers.keys()].forEach((id) => this.start(id));
  }

  private start(id: string): void {
    const timer = this.timers.get(id);
    if (!timer) {
      return;
    }
    timer.startedAt = Date.now();
    timer.handle = setTimeout(
      () => this.dismiss(id),
      Math.max(0, timer.remaining),
    );
  }

  private clearTimer(id: string): void {
    clearTimeout(this.timers.get(id)?.handle);
    this.timers.delete(id);
  }
}

/**
 * Renders the template of the app's toast region into a CDK global overlay,
 * above everything else, once the app has hydrated, so the live region
 * exists before the first toast. Put one in the app's shell.
 *
 * @example
 * ```html
 * <ng-template ndToaster>
 *   <section ndToastRegion>…</section>
 * </ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[ndToaster]' })
export class NdToasterOutlet {
  private readonly overlay = injectOverlay({
    config: (injector) => ({
      positionStrategy: createGlobalPositionStrategy(injector),
    }),
  });

  constructor() {
    this.overlay.setTemplate(inject(TemplateRef), inject(ViewContainerRef));
    afterNextRender(() => this.overlay.attach());
  }
}

/** The toast region, injected by its toasts. */
export const ND_TOAST_REGION = new InjectionToken<NdToastRegion>(
  'ND_TOAST_REGION',
);

/**
 * The landmark the toasts live in: `role="region"`, a polite live region,
 * so new toasts are announced without moving focus. F8 focuses it from
 * anywhere. While the pointer is over it or focus is inside it, timers
 * pause and it has `data-expanded`, for the styled layer to spread the
 * stack out.
 *
 * @example
 * ```html
 * <section ndToastRegion>
 *   <ol>
 *     @for (toast of toaster.toasts(); track toast.id) {
 *       <li [ndToast]="toast">…</li>
 *     }
 *   </ol>
 * </section>
 * ```
 */
@Directive({
  selector: '[ndToastRegion]',
  exportAs: 'ndToastRegion',
  providers: [{ provide: ND_TOAST_REGION, useExisting: NdToastRegion }],
  host: {
    role: 'region',
    tabindex: '-1',
    'aria-live': 'polite',
    'aria-relevant': 'additions text',
    '[attr.aria-label]': 'label',
    '[attr.data-expanded]': 'expanded() ? "" : null',
    '(pointerenter)': 'hover(true)',
    '(pointerleave)': 'hover(false)',
    '(focusin)': 'focusWithin(true)',
    '(focusout)': 'leave($event)',
    '(document:keydown)': 'shortcut($event)',
  },
})
export class NdToastRegion {
  /** The toasts. */
  readonly toaster = inject(NdToaster);

  /** The element, where focus goes when a focused toast goes. */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly label =
    inject(new HostAttributeToken('aria-label'), { optional: true }) ??
    'Notifications (F8)';

  private readonly hovered = signal(false);
  private readonly focused = signal(false);

  /** Whether the pointer is over it or focus is inside it. */
  readonly expanded = computed(() => this.hovered() || this.focused());

  constructor() {
    inject(DestroyRef).onDestroy(() => this.toaster.resume());
  }

  /**
   * Notes the pointer entering or leaving.
   *
   * @param over - Whether it's over the region.
   */
  protected hover(over: boolean): void {
    this.hovered.set(over);
    this.sync();
  }

  /**
   * Notes focus entering the region.
   *
   * @param within - Whether focus is inside.
   */
  protected focusWithin(within: boolean): void {
    this.focused.set(within);
    this.sync();
  }

  /**
   * Notes focus leaving the region, not moving inside it.
   *
   * @param event - The focusout event.
   */
  protected leave(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node && this.element.contains(next))) {
      this.focusWithin(false);
    }
  }

  /**
   * Focuses the region on F8.
   *
   * @param event - A keydown anywhere in the document.
   */
  protected shortcut(event: KeyboardEvent): void {
    if (
      event.key === 'F8' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      this.element.focus();
    }
  }

  private sync(): void {
    if (this.expanded()) {
      this.toaster.pause();
    } else {
      this.toaster.resume();
    }
  }
}

/** How far a toast is swiped before it's dismissed, in pixels. */
const SWIPE_DISMISS = 50;

/** How far the pointer moves before a press becomes a swipe, in pixels. */
const SWIPE_THRESHOLD = 4;

/**
 * One toast, whose value is its record from {@link NdToaster.toasts}. It's
 * read whole when announced (`aria-atomic`). Escape dismisses it while
 * focus is inside; swiping it 50 pixels toward the end side does too.
 * `data-index` (0 is newest), `data-front`, `--nd-toast-index` and
 * `--nd-toast-swipe` are for styling the stack and the swipe.
 *
 * @example
 * ```html
 * <li [ndToast]="toast">
 *   <p ndToastTitle>{{ toast.title }}</p>
 * </li>
 * ```
 */
@Directive({
  selector: '[ndToast]',
  exportAs: 'ndToast',
  host: {
    'aria-atomic': 'true',
    '[attr.data-type]': 'toast().type',
    '[attr.data-index]': 'index()',
    '[attr.data-front]': 'index() === 0 ? "" : null',
    '[attr.data-swiping]': 'swiping() ? "" : null',
    '[style.--nd-toast-index]': 'index()',
    '[style.--nd-toast-swipe]': 'swipe() + "px"',
    '(keydown.escape)': 'dismiss()',
    '(pointerdown)': 'press($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'release($event)',
    '(pointercancel)': 'reset($event)',
  },
})
export class NdToast {
  /** The toast's record. */
  readonly toast = input.required<NdToastRecord>({ alias: 'ndToast' });

  private readonly toaster = inject(NdToaster);
  private readonly region = inject(ND_TOAST_REGION, { optional: true });
  private readonly document = inject(DOCUMENT);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Its position in the stack; 0 is the newest. */
  readonly index = computed(() =>
    this.toaster.toasts().findIndex((toast) => toast.id === this.toast().id),
  );

  /** Whether it's being swiped. */
  readonly swiping = signal(false);

  /** How far it's swiped toward the end side, in pixels. */
  readonly swipe = signal(0);

  private origin: number | null = null;

  /** Removes it, moving focus to the region if it was inside. */
  dismiss(): void {
    if (this.element.contains(this.document.activeElement)) {
      this.region?.element.focus();
    }
    this.toaster.dismiss(this.toast().id);
  }

  /**
   * Notes where a press starts; it becomes a swipe once it moves, so
   * presses on the toast's buttons stay clicks.
   *
   * @param event - The pointerdown event.
   */
  protected press(event: PointerEvent): void {
    if (event.button === 0) {
      this.origin = this.position(event);
    }
  }

  /**
   * Follows the pointer toward the end side.
   *
   * @param event - The pointermove event.
   */
  protected move(event: PointerEvent): void {
    if (this.origin === null) {
      return;
    }
    const delta = this.position(event) - this.origin;
    if (!this.swiping()) {
      if (Math.abs(delta) < SWIPE_THRESHOLD) {
        return;
      }
      this.swiping.set(true);
      this.element.setPointerCapture?.(event.pointerId);
    }
    this.swipe.set(Math.max(0, delta));
  }

  /**
   * Dismisses a toast swiped far enough, and springs back any other.
   *
   * @param event - The pointerup event.
   */
  protected release(event: PointerEvent): void {
    const dismiss = this.swiping() && this.swipe() > SWIPE_DISMISS;
    this.reset(event);
    if (dismiss) {
      this.dismiss();
    }
  }

  /**
   * Ends a press or swipe without dismissing.
   *
   * @param event - The pointerup or pointercancel event.
   */
  protected reset(event: PointerEvent): void {
    this.origin = null;
    this.swiping.set(false);
    this.swipe.set(0);
    if (this.element.hasPointerCapture?.(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId);
    }
  }

  /**
   * The pointer's coordinate, growing toward the end side.
   *
   * @param event - A pointer event.
   * @returns The coordinate, in pixels.
   */
  private position(event: PointerEvent): number {
    return isRtl(this.element) ? -event.clientX : event.clientX;
  }
}

/**
 * A toast's message.
 *
 * @example
 * ```html
 * <p ndToastTitle>{{ toast.title }}</p>
 * ```
 */
@Directive({ selector: '[ndToastTitle]' })
export class NdToastTitle {}

/**
 * A toast's detail, under its title.
 *
 * @example
 * ```html
 * <p ndToastDescription>{{ toast.description }}</p>
 * ```
 */
@Directive({ selector: '[ndToastDescription]' })
export class NdToastDescription {}

/**
 * The button of a toast's action: it runs the action, then dismisses the
 * toast.
 *
 * @example
 * ```html
 * <button ndToastAction>{{ toast.action.label }}</button>
 * ```
 */
@Directive({
  selector: 'button[ndToastAction]',
  host: { type: 'button', '(click)': 'run()' },
})
export class NdToastAction {
  private readonly toast = inject(NdToast);

  /** Runs the toast's action and dismisses it. */
  protected run(): void {
    this.toast.toast().action?.onClick();
    this.toast.dismiss();
  }
}

/**
 * The button that dismisses its toast. Name it, such as
 * `aria-label="Close"`.
 *
 * @example
 * ```html
 * <button ndToastClose aria-label="Close">×</button>
 * ```
 */
@Directive({
  selector: 'button[ndToastClose]',
  host: { type: 'button', '(click)': 'toast.dismiss()' },
})
export class NdToastClose {
  protected readonly toast = inject(NdToast);
}
