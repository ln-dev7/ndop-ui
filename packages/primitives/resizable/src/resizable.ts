import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  InjectionToken,
  input,
  model,
  numberAttribute,
  signal,
  type OnInit,
} from '@angular/core';
import { injectId, isRtl } from '@ndop/primitives/internal';

/** Whether a group's panels sit side by side or stacked. */
export type NdResizableOrientation = 'horizontal' | 'vertical';

/** The enclosing {@link NdResizablePanelGroup}, injected by its parts. */
export const ND_RESIZABLE_PANEL_GROUP =
  new InjectionToken<NdResizablePanelGroup>('ND_RESIZABLE_PANEL_GROUP');

/**
 * Keeps a number between two bounds.
 *
 * @param value - The number.
 * @param min - The lower bound.
 * @param max - The upper bound.
 * @returns The number, clamped.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * A group of resizable panels: the WAI-ARIA Window Splitter pattern. Its
 * panels share its width (or height) and each {@link NdResizableHandle}
 * between two panels moves the boundary between them, with the keyboard or
 * a pointer.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/
 *
 * @example
 * ```html
 * <div ndResizablePanelGroup orientation="horizontal">
 *   <div ndResizablePanel [defaultSize]="30">Sidebar</div>
 *   <div ndResizableHandle aria-label="Resize sidebar"></div>
 *   <div ndResizablePanel>Content</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndResizablePanelGroup]',
  exportAs: 'ndResizablePanelGroup',
  providers: [
    { provide: ND_RESIZABLE_PANEL_GROUP, useExisting: NdResizablePanelGroup },
  ],
  host: { '[attr.data-orientation]': 'orientation()' },
})
export class NdResizablePanelGroup {
  /** Whether the panels sit side by side or stacked. */
  readonly orientation = input<NdResizableOrientation>('horizontal');

  /**
   * The panels' sizes in percent, in document order. Two-way bindable with
   * `[(sizes)]`; when unset, each panel's `defaultSize` applies.
   */
  readonly sizes = model<readonly number[]>([]);

  /** How far an arrow key moves a handle, in percent. */
  readonly keyboardStep = input(10, { transform: numberAttribute });

  /** The group's element, measured while dragging. */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly panels = signal<readonly NdResizablePanel[]>([]);

  /** Every panel's size in percent, from `sizes` or the defaults. */
  readonly layout = computed<readonly number[]>(() => {
    const panels = this.panels();
    const sizes = this.sizes();
    if (sizes.length === panels.length) {
      return sizes;
    }
    const fixed = panels.map((panel) => panel.defaultSize());
    const taken = fixed.reduce<number>((sum, size) => sum + (size ?? 0), 0);
    const free = fixed.filter((size) => size === undefined).length;
    const share = free > 0 ? Math.max(0, 100 - taken) / free : 0;
    return fixed.map((size) => size ?? share);
  });

  /**
   * Adds a panel, after those already added.
   *
   * @param panel - The panel.
   * @returns A function that removes it.
   */
  registerPanel(panel: NdResizablePanel): () => void {
    this.panels.update((panels) => [...panels, panel]);
    return () =>
      this.panels.update((panels) => panels.filter((other) => other !== panel));
  }

  /**
   * The number of panels added so far, which is the index of the panel
   * after a handle added now.
   *
   * @returns The count.
   */
  panelCount(): number {
    return this.panels().length;
  }

  /**
   * A panel by index.
   *
   * @param index - Its index in document order.
   * @returns The panel, if there is one.
   */
  panel(index: number): NdResizablePanel | undefined {
    return this.panels()[index];
  }

  /**
   * A panel's size in percent.
   *
   * @param panel - The panel.
   * @returns Its size.
   */
  sizeOf(panel: NdResizablePanel): number {
    return this.layout()[this.panels().indexOf(panel)] ?? 0;
  }

  /**
   * Moves the boundary between two neighboring panels, keeping both within
   * their `minSize` and `maxSize`.
   *
   * @param before - Index of the panel before the boundary.
   * @param from - The sizes to move from, such as those when a drag began.
   * @param delta - How far to grow the panel before the boundary, in
   *   percent; negative shrinks it.
   */
  resize(before: number, from: readonly number[], delta: number): void {
    const first = this.panels()[before];
    const second = this.panels()[before + 1];
    const a = from[before];
    const b = from[before + 1];
    if (!first || !second || a === undefined || b === undefined) {
      return;
    }
    // The pair keeps its total, so each panel's bounds also limit the
    // other: growing one is shrinking its neighbor.
    const total = a + b;
    const low = Math.max(first.minSize(), total - second.maxSize());
    const high = Math.min(first.maxSize(), total - second.minSize());
    const next = clamp(a + delta, low, high);
    const sizes = [...from];
    sizes[before] = next;
    sizes[before + 1] = total - next;
    this.sizes.set(sizes);
  }
}

/**
 * One panel of a {@link NdResizablePanelGroup}. Its `flex` style follows
 * its size, and its content is clipped to it.
 *
 * @example
 * ```html
 * <div ndResizablePanel [defaultSize]="30" [minSize]="20">…</div>
 * ```
 */
@Directive({
  selector: '[ndResizablePanel]',
  exportAs: 'ndResizablePanel',
  host: {
    '[id]': 'id',
    '[style.flex]': 'flex()',
    '[style.overflow]': '"hidden"',
    '[attr.data-size]': 'size()',
  },
})
export class NdResizablePanel implements OnInit {
  /** Initial size in percent; without one, it shares the space left. */
  readonly defaultSize = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null || value === ''
        ? undefined
        : numberAttribute(value),
  });

  /** Smallest size in percent. */
  readonly minSize = input(0, { transform: numberAttribute });

  /** Largest size in percent. */
  readonly maxSize = input(100, { transform: numberAttribute });

  /** Its element id, which a handle's `aria-controls` points at. */
  readonly id = injectId('nd-resizable-panel');

  private readonly group = inject(ND_RESIZABLE_PANEL_GROUP);
  private readonly destroyRef = inject(DestroyRef);

  /** Its size in percent, rounded for display. */
  readonly size = computed(
    () => Math.round(this.group.sizeOf(this) * 100) / 100,
  );

  protected readonly flex = computed(() => `${this.group.sizeOf(this)} 1 0px`);

  ngOnInit(): void {
    this.destroyRef.onDestroy(this.group.registerPanel(this));
  }
}

/**
 * The handle between two panels (`role="separator"`): arrow keys, `Home`
 * and `End`, or a pointer drag move the boundary between the panel before
 * it and the panel after it. Name it with `aria-label` or
 * `aria-labelledby`.
 *
 * @example
 * ```html
 * <div ndResizableHandle aria-label="Resize sidebar"></div>
 * ```
 */
@Directive({
  selector: '[ndResizableHandle]',
  exportAs: 'ndResizableHandle',
  host: {
    role: 'separator',
    '[attr.tabindex]': 'disabled() ? null : 0',
    '[attr.aria-orientation]':
      'group.orientation() === "horizontal" ? "vertical" : "horizontal"',
    '[attr.aria-controls]': 'before()?.id',
    '[attr.aria-valuenow]': 'valueNow()',
    '[attr.aria-valuemin]': 'before()?.minSize()',
    '[attr.aria-valuemax]': 'before()?.maxSize()',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.data-dragging]': 'dragging() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[style.touch-action]': '"none"',
    '(keydown)': 'keydown($event)',
    '(pointerdown)': 'start($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'end($event)',
    '(pointercancel)': 'end($event)',
  },
})
export class NdResizableHandle implements OnInit {
  /** Stops it moving and takes it out of the tab order. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly group = inject(ND_RESIZABLE_PANEL_GROUP);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Whether a pointer is dragging it. */
  readonly dragging = signal(false);

  private readonly index = signal(0);
  private origin = 0;
  private fromSizes: readonly number[] = [];

  /** The panel before it, whose size it reports. */
  protected readonly before = computed(() =>
    this.group.panel(this.index() - 1),
  );

  protected readonly valueNow = computed(() => {
    const before = this.before();
    return before ? Math.round(before.size()) : null;
  });

  ngOnInit(): void {
    // Handles and panels register in document order, so the panels
    // registered before this handle are the ones before it.
    this.index.set(this.group.panelCount());
  }

  /**
   * Moves the boundary for the arrow keys of the group's orientation,
   * `Home` and `End`.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }
    const before = this.index() - 1;
    const sizes = this.group.layout();
    const step = this.group.keyboardStep();
    const horizontal = this.group.orientation() === 'horizontal';
    const flip = horizontal && isRtl(this.element) ? -1 : 1;
    let delta: number;
    switch (event.key) {
      case horizontal ? 'ArrowRight' : 'ArrowDown':
        delta = step * flip;
        break;
      case horizontal ? 'ArrowLeft' : 'ArrowUp':
        delta = -step * flip;
        break;
      case 'Home':
        delta = -100;
        break;
      case 'End':
        delta = 100;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.group.resize(before, sizes, delta);
  }

  /**
   * Starts a drag with the primary button.
   *
   * @param event - The pointerdown event.
   */
  protected start(event: PointerEvent): void {
    if (this.disabled() || event.button !== 0) {
      return;
    }
    // Keeps the browser from selecting text or moving focus while dragging.
    event.preventDefault();
    this.origin = this.position(event);
    this.fromSizes = this.group.layout();
    this.dragging.set(true);
    this.element.setPointerCapture?.(event.pointerId);
  }

  /**
   * Follows the pointer, in percent of the group's size.
   *
   * @param event - The pointermove event.
   */
  protected move(event: PointerEvent): void {
    if (!this.dragging()) {
      return;
    }
    const rect = this.group.element.getBoundingClientRect();
    const size =
      this.group.orientation() === 'horizontal' ? rect.width : rect.height;
    if (size <= 0) {
      return;
    }
    const delta = ((this.position(event) - this.origin) / size) * 100;
    this.group.resize(this.index() - 1, this.fromSizes, delta);
  }

  /**
   * Ends a drag.
   *
   * @param event - The pointerup or pointercancel event.
   */
  protected end(event: PointerEvent): void {
    if (!this.dragging()) {
      return;
    }
    this.dragging.set(false);
    if (this.element.hasPointerCapture?.(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId);
    }
  }

  /**
   * The pointer's coordinate along the group's axis, growing toward the
   * panel after the handle.
   *
   * @param event - A pointer event.
   * @returns The coordinate, in pixels.
   */
  private position(event: PointerEvent): number {
    if (this.group.orientation() === 'vertical') {
      return event.clientY;
    }
    return isRtl(this.element) ? -event.clientX : event.clientX;
  }
}
